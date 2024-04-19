const https = require("https");
const { JSDOM } = require("jsdom");
const { URL } = require("url");

global.nodeConfig = { ip: "127.0.0.1", port: 7070 };
const distribution = require("../distribution");
const id = distribution.util.id;

const groupsTemplate = require("../distribution/all/groups");

const crawlGroup = {};

let localServer = null;

/*
    The local node will be the orchestrator.
*/

const n1 = { ip: "127.0.0.1", port: 7110 };
const n2 = { ip: "127.0.0.1", port: 7111 };
const n3 = { ip: "127.0.0.1", port: 7112 };

////////////////
// BEFORE ALL //
////////////////

/* Stop the nodes if they are running */

crawlGroup[id.getSID(n1)] = n1;
crawlGroup[id.getSID(n2)] = n2;
crawlGroup[id.getSID(n3)] = n3;

const startNodes = (cb) => {
  distribution.local.status.spawn(n1, (e, v) => {
    distribution.local.status.spawn(n2, (e, v) => {
      distribution.local.status.spawn(n3, (e, v) => {
        cb();
      });
    });
  });
};

////////////
// CRAWL  //
////////////

// TODO: Mapreduce let you pass args to the mapreduce function as an optional arg
// this allows us to access the mrid
// We should also configure mapreduce to let something run over a set number of
// iterations maybe?
// gotta work on the message passing after we parse a URL.

const crawl_map = (key, value) => {
  return new Promise((resolve, reject) => {
    const baseURL = value;
    const urlParts = baseURL.split("/");
    const title = urlParts[urlParts.length - 1];

    console.log("CRAWL INPUT", key, value);

    const visitedPath = ["crawl", "crawl-mr", "visited"];

    const makePromise = (sourceURL, resolve, reject) =>
      distribution.https
        .get(sourceURL, (response) => {
          let html = "";
          response.on("data", (chunk) => {
            html += chunk;
          });

          response.on("end", () => {
            const dom = new distribution.JSDOM(html);
            const document = dom.window.document;
            const paragraphs = document.querySelectorAll("p");

            const urlSet = new Set();

            paragraphs.forEach((paragraph) => {
              const paragraphHtml = paragraph.innerHTML;
              const matches = paragraphHtml.match(
                /href=["'](\/wiki\/.*?)["']/gi
              );
              if (matches) {
                matches.forEach((match) => {
                  const href = match.replace('href="', "").replace('"', "");
                  const url = new distribution.URL(href, sourceURL).toString();
                  if (!url.includes("&") && !url.includes("#")) {
                    urlSet.add(url);
                  }
                });
              }
            });

            const o = {};
            o[title] = [...urlSet];
            resolve([o]);
          });
        })
        .on("error", (error) => {
          reject(error);
        });

    distribution.local.store.get(title, visitedPath, (e, v) => {
      if (v) {
        resolve([]);
      } else {
        distribution.local.store.put(value, title, visitedPath, (e, v) => {
          const keyPath = ["crawl", "crawl-mr", "map"];
          distribution.local.store.del(key, keyPath, (e, v) => {
            // console.log(e, v);
            makePromise(baseURL, resolve, reject);
          });
        });
      }
    });
  });
};

const crawl_reduce = (key, values) => {
  return new Promise((resolve, reject) => {
    const res = values[0];
    const resCount = res.length;

    let counter = 0;

    const toVisitPath = ["crawl-mr", "map"];

    res.forEach((value) => {
      const urlParts = value.split("/");
      const title = urlParts[urlParts.length - 1];
      distribution.crawl.store.put(
        value,
        title,
        (e, v) => {
          // should probably remove the URL after we parse it.
          // not returning text yet fyi. Should probably be done here.
          counter++;
          if (counter === resCount) {
            let out = {};
            out[key] = resCount;
            resolve(out);
          }
        },
        toVisitPath
      );
    });
  });
};

//////////////
// Workflow //
//////////////

const URLCOUNT = 1000;

const doMapReduce = (cb, total = 0, id = 0) => {
  if (total >= URLCOUNT) {
    cb(null, null);
    return;
  }

  distribution.crawl.mr.exec(
    { mrid: `crawl-mr`, mapFn: crawl_map, reduceFn: crawl_reduce },
    (e, v) => {
      let newUrlCount = 0;

      console.log("MR RESULT", e, v);

      v.forEach((res) => {
        let key = Object.keys(res)[0];

        let value = res[key];
        console.log("RES", key, res, value);

        newUrlCount += value;
      });

      doMapReduce(cb, total + newUrlCount, id + 1);
    }
  );
};

let dataset = [
  { url1: "https://en.wikipedia.org/wiki/Computer_science" },
  { url2: "https://en.wikipedia.org/wiki/Computer_science" },
  { url3: "https://en.wikipedia.org/wiki/Computer_science" },
];

///////////////
// AFTER ALL //
///////////////

const cleanup = (e, v) => {
  let remote = { service: "status", method: "stop" };
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        localServer.close();
      });
    });
  });
};

distribution.node.start((server) => {
  localServer = server;

  const crawlConfig = { gid: "crawl" };
  startNodes(() => {
    groupsTemplate(crawlConfig).put("crawl", crawlGroup, (e, v) => {
      let cntr = 0;
      dataset.forEach((o) => {
        let key = Object.keys(o)[0];
        let value = o[key];
        distribution.crawl.store.put(
          value,
          key,
          (e, v) => {
            cntr++;
            if (cntr === dataset.length) {
              doMapReduce(cleanup);
            }
          },
          ["crawl-mr", "map"]
        );
      });
    });
  });
});
