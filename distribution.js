#!/usr/bin/env node

const args = require('yargs').argv;
const util = require('./distribution/util/util.js');

// Default configuration
global.nodeConfig = global.nodeConfig || {
  ip: '127.0.0.1',
  port: 8080,
  onStart: () => {
    console.log('Node started!');
  },
};

if (args.ip) {
  global.nodeConfig.ip = args.ip;
}

if (args.port) {
  global.nodeConfig.port = parseInt(args.port);
}

if (args.config) {
  const nodeConfig = util.deserialize(args.config);
  global.nodeConfig.ip = nodeConfig.ip ? nodeConfig.ip : global.nodeConfig.ip;
  global.nodeConfig.port = nodeConfig.port ?
    nodeConfig.port : global.nodeConfig.port;
  global.nodeConfig.onStart = nodeConfig.onStart ?
    nodeConfig.onStart : global.nodeConfig.onStart;
}

// TODO
const distribution = {};

distribution.all = {};
distribution.all.status = require('./distribution/all/status')({gid: 'all'});
distribution.all.comm = require('./distribution/all/comm')({gid: 'all'});
distribution.all.gossip = require('./distribution/all/gossip')({gid: 'all'});
distribution.all.groups = require('./distribution/all/groups')({gid: 'all'});
distribution.all.routes = require('./distribution/all/routes')({gid: 'all'});
distribution.all.mem = require('./distribution/all/mem')({gid: 'all'});
distribution.all.store = require('./distribution/all/store')({gid: 'all'});

global.distribution = distribution;

/* The following code is run when distribution.js is run directly */
if (require.main === module) {
  distribution.node.start(global.nodeConfig.onStart);
}

module.exports = global.distribution;
