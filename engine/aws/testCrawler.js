const args = require("yargs").argv;
const crawler = require("../crawler.js");
const fs = require("fs");
const path = require("path");

/*
EXAMPLE USAGE:

`./testCrawler.js --maxIters 4 `

runs the crawler using at most 4 MapReduce iterations and 3 nodes.
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
  const ip = "127.0.0.1";
  let basePort = 7110;
  global.nodeConfig = { ip: ip, port: basePort };
  const distribution = require("../../distribution");

  // crawler group
  const crawlGroup = {};
  const groupsTemplate = require("../../distribution/all/groups");

  const nodesFilePath = path.join(__dirname, "nodes.txt");
  const ipAddrs = fs.readFileSync(nodesFilePath, "utf8").split("\n");
  ipAddrs.forEach((line) => {
    let ipAddr = line.trim();
    let node = { ip: ipAddr, port: 7070 };
    crawlGroup[distribution.util.id.getSID(node)] = node;
  });



  distribution.node.start((server) => {
    console.log(crawlGroup);

    groupsTemplate({ gid: "crawl" }).put("crawl", crawlGroup, (e, v) => {
      if (args.test) {
        console.log("crawl group", e, v);
        return;
      }

      if (Object.keys(e).length > 0) {
        console.error("Failed to start at least one node.");
        return;
      }

      // begin crawling
      crawler.crawl(
        alpha, // alpha
        beta, // beta
        "crawl", // gid
        ["Computer Science"], // titles
        args.maxIters, // maxIters
        true, // log results to terminal
        (e, results) => {
          if (e) {
            console.error("Unexpected error during MapReduce: ", e);
            return;
          }

          try {
            
            const resultsStr = JSON.stringify(results, null, 2);
            fs.writeFileSync("./results.json", resultsStr);
            console.log("Finished crawling!");
          } catch (error) {
            console.error("Failed to write results to ./outputs.json");
          }
        }
      );
    });
  });
}
