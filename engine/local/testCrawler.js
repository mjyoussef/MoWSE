const args = require("yargs").argv;
const crawler = require("../crawler.js");
const EventEmitter = require("events");
/*
EXAMPLE USAGE:

`./testCrawler.js --maxIters 4 --numNodes 3` will run the crawler
using 4 MapReduce iterations and 3 nodes.

Optional Flags:
--alpha (hyperparam for pruning)
--beta (hyperparam for pruning)
--persist (whether or not to use existing database files; this flag
  does NOT accept a boolean parameter)
*/

/* The following code is run when testCrawler.js is run directly */
if (require.main === module) {
  // Error checking for command line arguments

  // maxIters
  if (!args.maxIters) {
    console.error("Must provide maxIters argument.");
    return;
  }

  if (args.maxIters < 1) {
    console.error("maxIters must be at least 1.");
    return;
  }

  // numNodes
  if (!args.numNodes) {
    console.error("Must provide numNodes argument.");
    return;
  }

  if (args.numNodes < 1) {
    console.error("numNodes must be at least 1.");
    return;
  }

  // optional params
  let alpha = 0.001;
  let beta = 500;
  let persist = false;

  if (args.alpha) {
    alpha = args.alpha;
  }

  if (args.beta) {
    beta = args.beta;
  }

  if (args.persist) {
    persist = true;
  }

  /* CRAWLING
    1. Wait for all of the nodes to start.
    2. Begin crawling.
  */

  // setup the coordinator
  let ip = "127.0.0.1";
  let basePort = 8000;
  let baseChromaPort = 9000;

  global.emitter = new EventEmitter();

  global.nodeConfig = {
    ip: "127.0.0.1",
    port: 8000,
    chromaPort: 9000,
    persist: persist,
    onStart: () => {
      global.emitter.emit("ready", true);
    },
  };

  const distribution = require("../../distribution");

  // wait for GloVe embeddings to load and Chroma server to launch
  global.emitter.on("ready", (status) => {
    console.log("Node started!");

    // crawler group
    const crawlGroup = {};
    const groupsTemplate = require("../../distribution/all/groups");

    const startNodes = async (cb) => {
      for (let i = 1; i < args.numNodes + 1; i++) {
        // create the node
        let node = {
          ip: ip,
          port: basePort + i,
          persist: persist,
          chromaPort: baseChromaPort + i,
        };
        let sid = distribution.util.id.getSID(node);

        // add it to crawlGroup
        crawlGroup[sid] = node;

        // spawn promise
        let spawnPromise = new Promise((resolve, reject) => {
          distribution.local.status.spawn(node, (e, v) => {
            resolve(true);
          });
        });

        // wait for the promise to resolve
        try {
          await spawnPromise;
        } catch (error) {
          cb(new Error("Failed to start at least one node."), undefined);
          return;
        }
      }

      cb(undefined, true);
    };

    startNodes((e, v) => {
      console.log(crawlGroup);

      if (e) {
        console.error("ERROR: ", e);
        return;
      }

      groupsTemplate({ gid: "crawl" }).put("crawl", crawlGroup, (e, v) => {
        if (Object.keys(e).length > 0) {
          console.error("Failed to start at least one node.");
          return;
        }

        // create the collection
        global.distribution.crawl.vecStore.createGidCollection((e, v) => {
          if (e) {
            console.log(e);
            return;
          }

          console.log("Ready to crawl!");

          // begin crawling!
          crawler.crawl(
            alpha, // alpha
            beta, // beta
            "crawl", // gid
            ["Computer Science"], // starting pages
            args.maxIters, // max MapReduce iterations
            true, // logging
            async (e, results) => {
              if (e) {
                console.log(e);
                return;
              }

              console.log(results);
            }
          );
        });
      });
    });
  });
}
