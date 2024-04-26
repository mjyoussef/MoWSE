const fs = require("fs");

/* Input key = title of page, input value = some metadata.
`crawlMap` embeds the document, saves the embedding locally, and
returns a subset of the outgoing URLs for the next MR iteration. */
const crawlMap = (title, metadata) => {
  const accessToken = metadata.accessToken;
  const gid = metadata.gid;

  // if the url has been visited, return nothing
  return new Promise((resolve, reject) => {
    global.distribution.local.mem.get("visited", [], (e, visited) => {
      // skip
      if (e) {
        visited = new Set();
      }

      if (visited.has(title)) {
        resolve(undefined);
        return;
      }

      if (/[^\w\s]/.test(title)) {
        resolve(undefined);
        return;
      }

      // otherwise, mark it as visited
      visited.add(title);
      global.distribution.local.mem.put(visited, "visited", [], (e, v) => {
        const apiUrl = `https://en.wikipedia.org/w/api.php`;
        const params = {
          action: "query",
          format: "json",
          prop: "extracts|links",
          titles: title,
          explaintext: true,
          pllimit: "max",
          redirects: 1, // Resolve redirects
        };

        const queryString = new URLSearchParams(params).toString();
        const sourceURL = `${apiUrl}?${queryString}`;

        global.distribution.axios
          .get(sourceURL, {
            headers: {
              Authorization: `${accessToken}`,
            },
          })
          .then((response) => {
            const page = Object.values(response.data.query.pages)[0];

            // raw text
            const text = page.extract;

            if (text === undefined || text === "" || text === null) {
              resolve(undefined);
              return;
            }

            // get the lowercased words
            const words = text.match(/\b[\w']+\b/g);
            const lowerCaseWords = words.map((word) => word.toLowerCase());

            // embed the document
            const embed = global.distribution.local.index.embed;
            const embedding = embed(lowerCaseWords, (e, v) => {}, true);

            // const links = page.links
            //   ? page.links.map((link) => link.title)
            //   : [];

            // const filteredLinks = links.filter(
            //   (title) => !/[^\w\s]/.test(title)
            // );

            // let obj = {};
            // obj[title] = filteredLinks;
            // resolve(obj);

            global.distribution.local.vecStore.put(
              embedding,
              { key: title, gid: gid },
              (e, v) => {
                if (e) {x
                  reject(e);

                  return;
                }
                // get the links (titles)
                const links = page.links
                  ? page.links.map((link) => link.title)
                  : [];

                const filteredLinks = links.filter(
                  (title) => !/[^\w\s]/.test(title)
                );

                let obj = {};
                obj[title] = filteredLinks;
                console.log("Completed requested: ", title);
                resolve(obj);
              }
            );
          })
          .catch((error) => {
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
    let obj = {};
    obj[title] = values.flat();
    resolve(obj);
  });
};

/* Crawler */
const crawl = async (
  hash,
  alpha,
  beta,
  gid,
  titlesPath,
  authTokensPath,
  cb
) => {
  console.time("crawl_execution_time");

  // get the authentication tokens
  const rawJSON = fs.readFileSync(authTokensPath, { encoding: "utf-8" });
  const tokens = JSON.parse(rawJSON);

  // at the start of MapReduce, each token is assumed to have never
  // been used; the coordinator maintains usage frequency and issues
  // access tokens to mappers appropriately

  const tokenLimits = {};
  for (let token of Object.values(tokens)) {
    tokenLimits[token] = 5000;
  }

  // get the starting pages
  const rawTitles = fs.readFileSync(titlesPath, { encoding: "utf-8" });
  const titlesLst = rawTitles.trim().split("\n");
  let titles = new Set(titlesLst);

  if (titles.size === 0) {
    console.error("Error: expected at least one starting page when crawling");
    cb(new Error("No pages provided at start of crawling"), undefined);
    return;
  }

  let uniqueTitles = new Set();
  let it = 0;
  // while (count < 1000) {
  while (it < 10) {
    // MapReduce
    // console.log(it);
    it += 1;
    const mrIterationPromise = new Promise((resolve, reject) => {
      global.distribution.local.groups.get(gid, (e, nodes) => {
        if (e) {
          reject(e);
          cb(new Error("error from crawler"), undefined);
          return;
        }

        // assign titles to nodes
        const nidsToTitles = {};
        for (let title of titles) {
          const kid = global.distribution.util.id.getID(title);
          const nid = global.distribution.util.id[hash](
            kid,
            Object.keys(nodes)
          );

          const nidTitles = nidsToTitles[nid] || [];
          nidTitles.push(title);
          nidsToTitles[nid] = nidTitles;
        }

        let inputs = [];

        /* populate inputs (for the current MapReduce iteration) */
        for (let [nid, nidTitles] of Object.entries(nidsToTitles)) {
          for (let nidTitle of nidTitles) {
            if (
              (nidTitles.length >= beta && Math.random() <= alpha) ||
              nidTitles.length <= beta
            ) {
              // select a random access token
              const tokens = Object.keys(tokenLimits);

              // no more keys left, so crawling is over
              if (tokens.length === 0) {
                break;
              }

              // otherwise, assign the key-value pair a random access token
              // const token = tokens[Math.floor(Math.random() * tokens.length)];
              const token = tokens[0];
              const tokenLimit = tokenLimits[token];
              let obj = {};
              obj[nidTitle] = {
                accessToken: token,
                gid: gid,
              };
              inputs.push(obj);

              // update the tokenLimits dictionary
              if (tokenLimit === 1) {
                delete tokenLimits[token];
              } else {
                tokenLimits[token] = tokenLimit - 1;
              }
            }
          }
        }

        inputs = inputs.sort(() => Math.random() - 0.5);
        inputs.slice(0, 5000);

        // if all of the access tokens have been completely used up
        if (inputs.length === 0) {
          resolve([]);
          return;
        }

        const args = {
          mrid: `crawl-mr`,
          mapFn: crawlMap,
          reduceFn: crawlReduce,
          inputs: inputs,
        };

        global.distribution[gid].mr.exec(args, (e, results) => {
          if (e) {
            reject(e);
            return;
          }

          // aggregate the extracted pages and resolve
          let newTitles = new Set();
          results.forEach((result) => {
            const elts = result[Object.keys(result)[0]];
            if (elts) {
              elts.forEach((e) => newTitles.add(e));
            }
          });

          resolve(newTitles);
        });
      });
    });

    try {
      let newTitles = await mrIterationPromise;
      newTitles.forEach((title) => uniqueTitles.add(title));
      // console.log(titles);
      // count += newTitles.size;
      // console.log("Here is titles", titles);

      // either because access tokens have been completely used
      // or all the pages have been crawled.
      console.log("Total number of unique extracted URLs: ", uniqueTitles.size);

      titles = newTitles;
      if (titles.size === 0) {
        cb(undefined, true);
        return;
      }
    } catch (error) {
      console.error("Error:", error.message);
      cb(new Error(error.message), undefined);
      return;
    }
  }

  console.timeEnd("crawl_execution_time");
  cb(undefined, true);
};

global.nodeConfig = { ip: "127.0.0.1", port: 7070 };
const distribution = require("../distribution");
const id = distribution.util.id;

const groupsTemplate = require("../distribution/all/groups");
const crawlGroup = {};
let localServer = null;

const n1 = { ip: "127.0.0.1", port: 7110 };
const n2 = { ip: "127.0.0.1", port: 7111 };
const n3 = { ip: "127.0.0.1", port: 7112 };
const n4 = { ip: "127.0.0.1", port: 7113 };
const n5 = { ip: "127.0.0.1", port: 7114 };
const n6 = { ip: "127.0.0.1", port: 7115 };
const n7 = { ip: "127.0.0.1", port: 7116 };
const n8 = { ip: "127.0.0.1", port: 7117 };
const n9 = { ip: "127.0.0.1", port: 7118 };
const n10 = { ip: "127.0.0.1", port: 7119 };

crawlGroup[id.getSID(n1)] = n1;
// crawlGroup[id.getSID(n2)] = n2;
// crawlGroup[id.getSID(n3)] = n3;
// crawlGroup[id.getSID(n4)] = n4;
// crawlGroup[id.getSID(n5)] = n5;
// crawlGroup[id.getSID(n6)] = n6;
// crawlGroup[id.getSID(n7)] = n7;
// crawlGroup[id.getSID(n8)] = n8;
// crawlGroup[id.getSID(n9)] = n9;
// crawlGroup[id.getSID(n10)] = n10;

distribution.node.start((server) => {
  localServer = server;
  const crawlConfig = { gid: "crawl" };
  groupsTemplate(crawlConfig).put("crawl", crawlGroup, (e, v) => {
    crawl(
      "naiveHash",
      0.008,
      150,
      "crawl",
      "./engine/titles.txt",
      "./engine/config.json",
      (e, v) => {
        console.log("FINISHED CRAWLING", e, v);
        localServer.close();
        return;
      }
    );
  });
});