#!/usr/bin/env node
const util = require("./distribution/util/util.js");
const args = require("yargs").argv;

// Default configuration
global.nodeConfig = global.nodeConfig || {
  ip: "127.0.0.1",
  port: 8080,
  onStart: () => {
    console.log("Node started!");
  },
};

/*
    As a debugging tool, you can pass ip and port arguments directly.
    This is just to allow for you to easily startup nodes from the terminal.

    Usage:
    ./distribution.js --ip '127.0.0.1' --port 1234
  */
if (args.ip) {
  global.nodeConfig.ip = args.ip;
}

if (args.port) {
  global.nodeConfig.port = parseInt(args.port);
}

if (args.config) {
  let nodeConfig = util.deserialize(args.config);
  global.nodeConfig.ip = nodeConfig.ip ? nodeConfig.ip : global.nodeConfig.ip;
  global.nodeConfig.port = nodeConfig.port
    ? nodeConfig.port
    : global.nodeConfig.port;
  global.nodeConfig.onStart = nodeConfig.onStart
    ? nodeConfig.onStart
    : global.nodeConfig.onStart;
}

global.distribution = {};
global.distribution.url = require("url");
global.distribution.URL = require("url").URL;
global.distribution.path = require("path");
global.distribution.fs = require("fs");
global.distribution.JSDOM = require("jsdom").JSDOM;
global.distribution.dir = __dirname;
global.distribution.http = require("http");
global.distribution.https = require("https");
global.distribution.util = require("./distribution/util/util.js");
global.distribution.local = require("./distribution/local/local.js");
global.distribution.node = require("./distribution/local/node.js");

global.distribution["all"] = {};
global.distribution["all"].status = require("./distribution/all/status.js")({
  gid: "all",
});
global.distribution["all"].comm = require("./distribution/all/comm.js")({
  gid: "all",
});
global.distribution["all"].gossip = require("./distribution/all/gossip.js")({
  gid: "all",
});
global.distribution["all"].groups = require("./distribution/all/groups.js")({
  gid: "all",
});
global.distribution["all"].routes = require("./distribution/all/routes.js")({
  gid: "all",
});
global.distribution["all"].mem = require("./distribution/all/mem.js")({
  gid: "all",
});
global.distribution["all"].store = require("./distribution/all/store.js")({
  gid: "all",
});

global.distribution["all"].vecStore = require("./distribution/all/vecStore.js")({
  gid: "all",
});

// templates
global.distribution.commTemplate = require("./distribution/all/comm.js");
global.distribution.groupsTemplate = require("./distribution/all/groups.js");
global.distribution.statusTemplate = require("./distribution/all/status.js");
global.distribution.routesTemplate = require("./distribution/all/routes.js");
global.distribution.gossipTemplate = require("./distribution/all/gossip.js");
global.distribution.memTemplate = require("./distribution/all/mem.js");
global.distribution.storeTemplate = require("./distribution/all/store.js");
global.distribution.mrTemplate = require("./distribution/all/mr.js");
global.distribution.vecStoreTemplate = require("./distribution/all/vecStore.js");

module.exports = global.distribution;

// folderPath = './distribution/util/glove_50d_split';
folderPath = './distribution/util/glove_50d_split';
global.distribution.util.loadGloVeEmbeddings(folderPath, (e, v) => {
  if (e) {
    console.log(e);
  } else {
    console.log(v);
  }
});
// console.log('Starting local vectorDB');
// global.distribution.local.vecStore.init((e, v) => {
//   if (e) {
//     console.log(e);
//   } else {
//     console.log(v);
//   }
// });


/* The following code is run when distribution.js is run directly */
if (require.main === module) {
  distribution.node.start(global.nodeConfig.onStart);
}
