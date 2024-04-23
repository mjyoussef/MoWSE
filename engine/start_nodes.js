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

const startNodes = (cb) => {
  distribution.local.status.spawn(n1, (e, v) => {
    distribution.local.status.spawn(n2, (e, v) => {
      distribution.local.status.spawn(n3, (e, v) => {
        cb();
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
