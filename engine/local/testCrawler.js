const args = require('yargs').argv;
const crawler = require('../crawler.js');
const fs = require('fs');

/*
EXAMPLE USAGE:

`./testCrawler.js --maxIters 4 --numNodes 3` will run the crawler
using 4 MapReduce iterations and 3 nodes.

Optional Flags:
--alpha (hyperparam for pruning)
--beta (hyperparam for pruning)
--ec2 (whether to run on EC2 instances)
*/

/* The following code is run when testCrawler.js is run directly */
if (require.main === module) {
  // Error checking for command line arguments

  // maxIters
  if (!args.maxIters) {
    console.error('Must provide maxIters argument.');
    return;
  }

  if (args.maxIters < 1) {
    console.error('maxIters must be at least 1.');
    return;
  }

  // numNodes
  if (!args.numNodes) {
    console.error('Must provide numNodes argument.');
    return;
  }

  if (args.numNodes < 2) {
    console.error('numNodes must be at least 2.');
    return;
  }

  let alpha = 0.001;
  let beta = 500;

  if (args.alpha) {
    alpha = args.alpha;
  }
  if (args.beta) {
    beta = args.beta;
  }

  /* CRAWLING
    1. Wait for all of the nodes to start.
    2. Begin crawling.
  */

  // setup the coordinator
  const ip = '127.0.0.1';
  let basePort = 7110;
  global.nodeConfig = {ip: ip, port: basePort};
  const distribution = require('../../distribution');

  // crawler group
  const crawlGroup = {};
  const groupsTemplate = require('../../distribution/all/groups');

  const startNodes = async (cb) => {
    for (let i=1; i<args.numNodes+1; i++) {
      // create the node
      let node = {ip: ip, port: basePort+i};
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

  distribution.node.start((server) => {
    startNodes((e, v) => {

      // add the nodes to the crawl group
      groupsTemplate({ gid: "crawl" }).put("crawl", crawlGroup, (e, v) => {
        if (Object.keys(e).length > 0) {
          console.error('Failed to start at least one node.');
          return;
        }
        
        // begin crawling
        crawler.crawl(
          alpha, // alpha
          beta, // beta
          'crawl', // gid
          ['Computer Science'], // titles
          args.maxIters, // maxIters
          true, // log results to terminal
          (e, results) => {
            if (e) {
              console.error("Unexpected error during MapReduce: ", e);
              return;
            }

            try {
              const resultsStr = JSON.stringify(results, null, 2);
              fs.writeFileSync('./results.json', resultsStr);
              console.log("Finished crawling!");
            } catch (error) {
              console.error("Failed to write results to ./outputs.json");
            }
        });
      });
    });
  });
}