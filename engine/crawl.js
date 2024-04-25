/* Generates an embedding for a document given its list of (lowercased)
words. You can weight the Mean of Words (MoW) embedding using tfidf scores. */
const embed = (words, callback, tfidf=false) => {
  let model = global.distribution.embeddings;
  let stopwords = global.distribution.stopwords;
  words = words.filter((word) => !stopwords.includes(word));
  if (tfidf) {
    global.distribution.documents += 1;
    let sum = null;
    let total = 0;
    vectors = {};
    for (let word of words) {
      if (word in model) {
        if (word in vectors) {
          vectors[word] = {vec: model[word], count: vectors[word].count + 1};
        } else {
          vectors[word] = {vec: model[word], count: 1};
        }
        total += 1;
      }
    }
    for (const [word, info] of Object.entries(vectors)) {
      global.distribution.tfidf[word] += 1;
      tf = info.count / total;
      idf = Math.log(global.distribution.documents / global.distribution.tfidf[word]);
      weight = tf * idf;
      if (sum === null) {
        sum = info.vec.map((x) => x * weight);
      } else {
        for (let i = 0; i < sum.length; i++) {
          sum[i] += info.vec[i] * weight;
          sum[i] = sum[i];
        }
      }
    }
    if (sum !== null) {
      sum = Array.from({length: 50}, () => 0.0);
    }
    if (callback) {
      callback(null, sum);
    }
    return sum;
  } else {
    let sum = null;
    for (let word of words) {
      if (word in model) {
        if (sum === null) {
          sum = model[word];
        } else {
          for (let i = 0; i < sum.length; i++) {
            sum[i] += model[word][i];
          }
        }
      }
    }
    if (sum !== null) {
      const length = words.length;
      for (let i = 0; i < sum.length; i++) {
        sum[i] /= length;
        sum[i] = sum[i];
      }
    } else {
      sum = Array.from({length: 50}, () => 0.0);
    }
    if (callback) {
      callback(null, sum);
    }
    return sum;
  }
};

/* Input key = title of page, input value = some metadata.
`crawlMap` embeds the document, saves the embedding locally, and 
returns a subset of the outgoing URLs for the next MR iteration. */
const crawlMap = (title, metadata) => {
  const accessToken = metadata.accessToken;

  // if the url has been visited, return nothing

  // otherwise, mark it as visited

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

  // make the request
  return axios.get(sourceURL, {
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
    const embedding = embed(lowerCaseWords, (e, v) => {}, false);

    // store the embedding locally
    global.distribution.local.vecStore.put(embedding, {key: title}, (e, v) => {
    });

    // get the links (titles)
    const links = page.links ? page.links.map(link => link.title) : [];

    // return a fraction of the links
    return {title: links};
  });
};

/* Input key is the title of a page that was crawled, and the input list of
values is a list of lists of outgoing URLs (titles). `crawlReduce` simply flattens
this list. */
const crawlReduce = (title, values) => {
  return new Promise((resolve, reject) => {
    resolve({title: values.flat()});
  });
}

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
          return new Error('Failed to get nodes in group');
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
                value: token,
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
        }

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
      console.error("Error:", error.message);
      return;
    }
  }
};