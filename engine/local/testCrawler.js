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

`./testCrawler.js --maxIters 4 --numNodes 3`

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

  // numNodes
  if (!args.numNodes) {
    console.error("Must provide numNodes argument.");
    return;
  }

  if (args.numNodes < 2) {
    console.error("numNodes must be at least 2.");
    return;
  }

  // if deploying on an EC2 cluster
  // if (args.ec2) {
  //   if (!args.securityGroup) {
  //     console.error("must provide a security group if deploying from AWS");
  //     return;
  //   }
  //   if (!args.instanceType) {
  //     console.error();
  //   }
  // }

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

  // AWS.config.update({ region: "us-east-2" });
  // const ec2 = new AWS.EC2();

  const ec2 = new EC2Client({ region: "us-east-2" });

  async function waitForInstancesToBeRunning(instanceIds) {
    try {
      while (true) {
        // Describe instances
        const data = await ec2.send(
          new DescribeInstancesCommand({ InstanceIds: instanceIds })
        );

        // Check if all instances are in the "running" state
        const allRunning = data.Reservations.every((reservation) => {
          return reservation.Instances.every(
            (instance) => instance.State.Name === "running"
          );
        });

        if (allRunning) {
          console.log("All instances are running");
          break;
        } else {
          console.log("Waiting for instances to be running...");
          // Wait for a few seconds before checking again
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  }

  const startNodesDeployment = async (cb) => {
    const instanceParams = {
      ImageId: "ami-0ddda618e961f2270",
      InstanceType: "t2.micro",
      KeyName: "node-1-keypair",
      SecurityGroupIds: ["sg-0d00be20140229e28"],
      MinCount: 1,
      MaxCount: args.numNodes,
      UserData: Buffer.from(
        `
      #!/bin/bash
      sudo yum install -y git
      git clone -b deployment https://github.com/mjyoussef/mowse.git
      sudo yum install nodejs -y
      cd mowse
      npm install

      node distribution.js --ip "0.0.0.0" --port 7070
      `
      ).toString("base64"),
    };

    try {
      const data = await ec2.send(new RunInstancesCommand(instanceParams));

      const instanceIds = data.Instances.map((instance) => instance.InstanceId);
      console.log("INSTANCE IDS", instanceIds);

      // Wait for instances to be running
      await waitForInstancesToBeRunning(instanceIds);

      const describeParams = {
        InstanceIds: instanceIds,
      };

      ec2.describeInstances(describeParams, (err, describeData) => {
        if (err) {
          cb(new Error(err.message), undefined);
          return;
        }

        // Extract IP addresses and ports
        const instances = describeData.Reservations.flatMap(
          (reservation) => reservation.Instances
        );

        const instanceDetails = instances.map((instance) => ({
          ip: instance.PublicIpAddress,
          port: "7070",
        }));

        console.log("INSTANCE DETAILS", instanceDetails);

        instanceDetails.forEach((node) => {
          let sid = distribution.util.id.getSID(node);
          crawlGroup[sid] = node;
        });

        cb(undefined, true);
      });
    } catch (error) {
      console.error("error launching instances:", error);
      cb(error, false);
    }

    // ec2.runInstances(instanceParams, (error, data) => {
    //   if (error) {
    //     cb(new Error(error.message), undefined);
    //     return;
    //   }

    //   const instanceIds = data.Instances.map((instance) => instance.InstanceId);

    //   // get the IP and ports
    //   // and add them to the IP and ports
    //   const describeParams = {
    //     InstanceIds: instanceIds,
    //   };

    //   ec2.describeInstances(describeParams, (err, describeData) => {
    //     if (err) {
    //       cb(new Error(err.message), undefined);
    //       return;
    //     }

    //     // Extract IP addresses and ports
    //     const instances = describeData.Reservations.flatMap(
    //       (reservation) => reservation.Instances
    //     );

    //     const instanceDetails = instances.map((instance) => ({
    //       ip: instance.PublicIpAddress,
    //       port: "7070",
    //     }));

    //     instanceDetails.forEach((node) => {
    //       let sid = distribution.util.id.getSID(node);
    //       crawlGroup[sid] = node;
    //     });

    //     cb(undefined, true);
    //   });
    // });
  };

  distribution.node.start((server) => {
    let callback = startNodes;
    if (args.ec2) {
      callback = startNodesDeployment;
    }

    callback((e, v) => {
      // add the nodes to the crawl group
      console.log(e, v);
      console.log(crawlGroup);

      if (e) {
        console.error("ERROR:", e);
        return;
      }
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
  });
}
