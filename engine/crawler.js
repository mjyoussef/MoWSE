const fs = require("fs");
const { performance } = require("perf_hooks");
const _ = require("lodash");

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

            // Function to filter and lowercase words
            const filterAndLowercaseWords = (text) => {
              // Only English lowercase words and apostrophes
              return text.toLowerCase().match(/\b[a-z']+\b/g) || [];
            };

            // Process title words
            const titleWords = filterAndLowercaseWords(title);

            // Split the text into sections
            const sections = text.split("\n\n");
            const introWords = filterAndLowercaseWords(sections[0]);
            const otherSections = sections.slice(1).join(" ");
            const remainingWords = filterAndLowercaseWords(otherSections);

            // embed the document
            inputs = [
              [...titleWords, 0.34],
              [...introWords, 0.528],
              [...remainingWords, 0.132],
            ];

            const embedding = global.distribution.local.index.embed(
              inputs,
              (e, v) => {},
              true
            );

            const links = page.links
              ? page.links.map((link) => link.title)
              : [];

            const filteredLinks = links.filter(
              (title) => !/[^\w\s]/.test(title)
            );

            let obj = {};
            obj[title] = filteredLinks;
            resolve(obj);

            global.distribution.local.vecStore.put(
              embedding,
              { key: title, gid: gid },
              (e, v) => {
                // if (e) {
                //   resolve(obj);
                //   return;
                // }
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
const crawl = async (alpha, beta, gid, titles, maxIters, logging, cb) => {
  cb = cb || function (e, v) {};

  const start = performance.now();

  // get the authentication token
  const accessToken = global.distribution.accessToken;

  // tracks the unique titles across ALL MapReduce iterations
  let uniqueTitles = new Set();

  // current MapReduce iteration
  let it = 0;
  while (it < maxIters) {
    console.log(maxIters);
    it += 1;
    const mrIterationPromise = new Promise((resolve, reject) => {
      global.distribution.local.groups.get(gid, (e, nodes) => {
        if (e) {
          reject(e);
          return;
        }

        if (titles.size === 0) {
          resolve([]);
          return;
        }

        /* Prune titles
         * If epsilon=len(titles)*alpha is greater than beta, use an epsilon-fraction
         * of random titles. Otherwise, use beta randomly sampled titles.
         */

        // shuffle
        let unshuffledTitlesLst = [...titles];
        let titlesLst = _.shuffle(unshuffledTitlesLst);

        // prune
        let spliceIdx = Math.min(
          titlesLst.length,
          Math.max(beta, Math.floor(titlesLst.length * alpha))
        );
        titlesLst = titlesLst.slice(0, spliceIdx);

        // create the MapReduce inputs
        let inputs = titlesLst.map((title) => {
          let obj = {};
          obj[title] = {
            accessToken: accessToken,
            gid: gid,
          };
          return obj;
        });

        const args = {
          mrid: `mapReduceCrawl`,
          mapFn: crawlMap,
          reduceFn: crawlReduce,
          inputs: inputs,
        };

        // MapReduce
        global.distribution[gid].mr.exec(args, (e, results) => {
          if (e) {
            console.log(e);
            reject(e);
            return;
          }
          // get the list of pages for the next MapReduce iteration
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
      if (logging) {
        console.log(
          "Total number of unique extracted URLs: ",
          uniqueTitles.size
        );
      }
      titles = newTitles;

      // no more pages to crawl
      if (titles.size === 0) {
        cb(undefined, uniqueTitles.size);
        return;
      }
    } catch (error) {
      console.error("Error:", error.message);
      cb(new Error(error.message), undefined);
      return;
    }
  }

  const end = performance.now();

  cb(undefined, {
    numPages: uniqueTitles.size,
    time: (end - start) / 1000,
    throughput: uniqueTitles.size / ((end - start) / 1000),
  });
};

module.exports = {
  crawl: crawl,
  crawlMap: crawlMap,
  crawlReduce: crawlReduce,
};
