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
            const embedding = embed(lowerCaseWords, (e, v) => {}, false);
            // console.log("Completed requested: ", title);

            const links = page.links
              ? page.links.map((link) => link.title)
              : [];
            resolve({ title: links });

            // store the embedding locally
            // global.distribution.local.vecStore.put(
            //   embedding,
            //   { key: title, gid: gid },
            //   (e, v) => {
            //     if (e) {
            //       reject(e);

            //       return;
            //     }
            //     // get the links (titles)
            //     const links = page.links
            //       ? page.links.map((link) => link.title)
            //       : [];
            //     console.log("Here is a title", title);
            //     resolve({ title: links });
            //   }
            // );
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
    resolve({ title: values.flat() });
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

  let count = 0;
  // while (count < 1000) {
  while (count < 1) {
    // MapReduce
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

        const inputs = [];

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

        // if all of the access tokens have been completely used up
        if (inputs.length === 0) {
          resolve([]);
          return;
        }

        const args = {
          mrid: "crawl-mr",
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
      // console.log(titles);
      count += titles.size;
      console.log("Here is titles.size: ", count);

      // either because access tokens have been completely used
      // or all the pages have been crawled.
      if (titles.size === 0) {
        cb(undefined, true);
        return;
      }
    } catch (error) {
      // console.error("Error:", error.message);
      cb(new Error(error.message), undefined);
      return;
    }
  }
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

crawlGroup[id.getSID(n1)] = n1;
crawlGroup[id.getSID(n2)] = n2;
crawlGroup[id.getSID(n3)] = n3;

distribution.node.start((server) => {
  localServer = server;
  const crawlConfig = { gid: "crawl" };
  groupsTemplate(crawlConfig).put("crawl", crawlGroup, (e, v) => {
    crawl(
      "naiveHash",
      0.2,
      100,
      "crawl",
      "./engine/titles.txt",
      "./engine/config.json",
      (e, v) => {
        distribution.crawl.mem.get("visited", (e, v) => {
          // console.log("FINISHED CRAWLING", e, v);
          localServer.close();
          return;
        });
      }
    );
  });
});
