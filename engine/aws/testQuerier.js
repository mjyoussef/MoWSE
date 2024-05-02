const args = require("yargs").argv;
const fs = require("fs");
const path = require("path");

if (require.main === module) {
  if (!args.numQueries) {
    console.error("Must provide numQueries argument.");
    return;
  }

  if (args.numQueries < 1) {
    console.error("numQueries must be at least 1.");
    return;
  }

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
    groupsTemplate({ gid: "crawl" }).put("crawl", crawlGroup, (e, v) => {
      let counter = 0;
      const queryString = "computer science";
      const query = queryString.toLowerCase().split(" ");
      const start = performance.now();
      for (let i = 0; i < args.numQueries; i++) {
        distribution.crawl.vecStore.query(query, (e, v) => {
          counter++;
          if (counter == args.numQueries) {
            end = performance.now();
            console.log(`finished querying in ${end - start}`);
            return;
          }
        });
      }
    });
  });
}
