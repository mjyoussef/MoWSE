/* Input key = title of page, input value = some metadata.
`crawlMap` embeds the document, saves the embedding locally, and
returns a subset of the outgoing URLs for the next MR iteration. */
const crawlMap = (title, metadata) => {
  const accessToken = metadata.accessToken;
  const gid = metadata.gid;

  // if the url has been visited, return nothing
  return new Promise((resolve, reject) => {
    global.distribution.local.mem.get('visited', [], (e, visited) => {
      // skip
      if (visited.has(title)) {
        resolve(undefined);
      }

      // otherwise, mark it as visited
      visited.add(title);
      global.distribution.local.mem.put(visited, 'visited', [], (e, v) => {
        const apiUrl = `https://en.wikipedia.org/w/api.php`;
        const params = {
          action: 'query',
          format: 'json',
          prop: 'extracts|links',
          titles: title,
          explaintext: true,
          pllimit: 'max',
          redirects: 1, // Resolve redirects
        };

        const queryString = new URLSearchParams(params).toString();
        const sourceURL = `${apiUrl}?${queryString}`;

        axios.get(sourceURL, {
          headers: {
            Authorization: `${accessToken}`,
          },
        }).then((response) => {
          const page = Object.values(response.data.query.pages)[0];

          // raw text
          const text = page.extract;

          // get the lowercased words
          const words = text.match(/\b[\w']+\b/g);
          const lowerCaseWords = words.map((word) => word.toLowerCase());

          // embed the document
          const embed = global.distribution.local.index.embed;
          const embedding = embed(lowerCaseWords, (e, v) => {}, false);

          // store the embedding locally
          global.distribution.local.vecStore.put(embedding, {key: title, gid: gid}, (e, v) => {
            if (e) {
              reject(e);
              return;
            }
            // get the links (titles)
            const links = page.links ? page.links.map((link) => link.title) : [];
            resolve({title: links});
          });
        }).catch((error) => {
          reject(error);
        });
      });
    });
  });
};

/* Input key is the title of a page that was crawled, and the input list of
values is a list of lists of outgoing URLs (titles). `crawlReduce` simply flattens
this list. */
const crawlReduce = (title, values) => {
  return new Promise((resolve, reject) => {
    resolve({title: values.flat()});
  });
};

/* Crawler */
const crawl = async (alpha, beta, gid, titlesPath, authTokensPath) => {
  // get the authentication tokens
  const rawJSON = fs.readFileSync(authTokensPath, {encoding: 'utf-8'});
  const tokens = JSON.parse(rawJSON);

  // at the start of MapReduce, each token is assumed to have never
  // been used; the coordinator maintains usage frequency and issues
  // access tokens to mappers appropriately

  const tokenLimits = {};
  for (let token in Object.keys(tokens)) {
    tokenLimits[token] = 5000;
  }

  // get the starting pages
  const rawTitles = fs.readFileSync(titlesPath, {encoding: 'utf-8'});
  const titlesLst = rawTitles.trim().split('\n');
  let titles = new Set(...titlesLst);

  if (titles.length === 0) {
    console.error('Error: expected at least one starting page when crawling');
    return;
  }

  let count = 0;
  while (count < 100000) {
    // MapReduce
    const mrIterationPromise = new Promise((resolve, reject) => {
      global.distribution.local.groups.get(gid, (e, nodes) => {
        if (e) {
          reject(e);
          return;
        }

        // assign titles to nodes
        const nidsToTitles = {};
        for (let title of titles) {
          const kid = global.distribution.util.id.getID(title);
          const nid = global.distribution.util.id[hash](kid, Object.keys(nodes));

          const nidTitles = nidsToTitles[nid] || [];
          nidTitles.push(title);
          nidsToTitles[nid] = nidTitles;
        }

        const inputs = [];

        /* populate inputs (for the current MapReduce iteration) */
        for (const [nid, nidTitles] in Object.entries(nidsToTitles)) {
          for (let nidTitle of nidTitles) {
            if ((nidTitles.length >= beta && (Math.random() <= alpha)) || (nidTitles.length >= beta)) {
              // select a random access token
              const tokens = Object.keys(tokenLimits);

              // no more keys left, so crawling is over
              if (tokens.length === 0) {
                break;
              }

              // otherwise, assign the key-value pair a random access token
              const token = tokens[0];
              const tokenLimit = tokenLimits[token];
              inputs.push({
                key: nidTitle,
                value: {
                  accessToken: token,
                  gid: gid,
                },
              });

              // update the tokenLimits dictionary
              if (tokenLimit === 1) {
                delete tokenLimits[token];
              } else {
                tokenLimits[token] = tokenLimit - 1;
              }
            }
          }
        }

        // if all of the access tokens have been completely used up
        if (inputs.length === 0) {
          resolve([]);
          return;
        }

        const args = {
          mrid: 'crawled',
          mapFn: crawlMap,
          reduceFn: crawlReduce,
          inputs: inputs,
        };

        global.distribution[gid].mr.exec(args, (e, results) => {
          if (e) {
            reject(e);
            return;
          }

          // each key in v is a page that was succesfully crawled
          count += results.length;

          // aggregate the extracted pages and resolve
          results.forEach((result) => {
            titles.add(...result[Object.keys(result)[0]]);
          });

          resolve(titles);
        });
      });
    });

    try {
      const titles = await mrIterationPromise;
      // either because access tokens have been completely used
      // or all the pages have been crawled.
      if (titles.length === 0) {
        return;
      }
    } catch (error) {
      console.error('Error:', error.message);
      return;
    }
  }
};
