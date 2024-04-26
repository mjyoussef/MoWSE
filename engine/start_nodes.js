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
crawlGroup[id.getSID(n2)] = n2;
crawlGroup[id.getSID(n3)] = n3;
crawlGroup[id.getSID(n4)] = n4;
// crawlGroup[id.getSID(n5)] = n5;
// crawlGroup[id.getSID(n6)] = n6;
// crawlGroup[id.getSID(n7)] = n7;
// crawlGroup[id.getSID(n8)] = n8;
// crawlGroup[id.getSID(n9)] = n9;
// crawlGroup[id.getSID(n10)] = n10;

const startNodes = (cb) => {
  distribution.local.status.spawn(n1, (e, v) => {
    distribution.local.status.spawn(n2, (e, v) => {
      distribution.local.status.spawn(n3, (e, v) => {
        distribution.local.status.spawn(n4, (e, v) => {
          // distribution.local.status.spawn(n5, (e, v) => {
            // distribution.local.status.spawn(n6, (e, v) => {
            //   distribution.local.status.spawn(n7, (e, v) => {
            //     distribution.local.status.spawn(n8, (e, v) => {
            //       distribution.local.status.spawn(n9, (e, v) => {
            //         distribution.local.status.spawn(n10, (e, v) => {
            //           cb();
            //         });
            //       });
            //     });
            //   });
            // });
          // });
          cb();
        });
      });
    });
  });
};

distribution.node.start((server) => {
  localServer = server;
  const crawlConfig = { gid: "crawl" };
  startNodes(() => {
    groupsTemplate(crawlConfig).put("crawl", crawlGroup, (e, v) => {
      localServer.close();
      console.log("CLOSED", e, v);
      return;
    });
  });
});