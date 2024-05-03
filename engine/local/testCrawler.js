const args = require("yargs").argv;
const crawler = require("../crawler.js");
const fs = require("fs");
const AWS = require("aws-sdk");
const {
  EC2Client,
  RunInstancesCommand,
  DescribeInstancesCommand,
} = require("@aws-sdk/client-ec2");

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

  if (args.numNodes < 2) {
    console.error("numNodes must be at least 2.");
    return;
  }

  // deploying
  if (args.ec2) {
    if (!args.securityGroupID) {
      console.error("must provide a security group when deploying.");
      return;
    }

    if (!args.accessKeyID) {
      console.error("must provide access key ID when deploying.");
      return;
    }

    if (!args.accessKeySecret) {
      console.error("must provide access key secret when deploying.");
      return;
    }

    if (!args.region) {
      console.error("must specify region when deploying.");
      return;
    }
  }

  // optional params
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
  if (!args.ec2) {
    const ip = "127.0.0.1";
    let basePort = 7110;
    global.nodeConfig = { ip: ip, port: basePort };
    require("../../distribution");
  }

  // crawler group
  const crawlGroup = {};
  const groupsTemplate = require("../../distribution/all/groups");

  const startNodes = async (cb) => {
    for (let i = 1; i < args.numNodes + 1; i++) {
      // create the node
      let node = { ip: ip, port: basePort + i };
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

  const startDeployedNodes = async (cb) => {
    // create the client
    const ec2 = new EC2Client({ region: args.region });

    const params = {
      Filters: [
        {
          Name: "instance.group-id",
          Values: [args.securityGroup],
        },
      ],
    };

    try {
      const data = await ec2.send(new DescribeInstancesCommand(params));

      data.Reservations.forEach((reservation) => {
        reservation.Instances.forEach((instance) => {
          let node = {
            ip: instance.PublicIpAddress,
            port: global.nodeConfig.port,
          };
          let sid = distribution.util.id.getSID(node);

          // add to the crawl group
          crawlGroup[sid] = node;
        });
      });

      cb(undefined, true);
    } catch (error) {
      cb(new Error(error.message), undefined);
      return;
    }
  };

  global.distribution.node.start((server) => {
    let startFn = startNodes;
    if (args.ec2) {
      startFn = startDeployedNodes;
    }

    startNodes((e, v) => {
      // add the nodes to the crawl group
      groupsTemplate({ gid: "crawl" }).put("crawl", crawlGroup, (e, v) => {
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
  });
}
