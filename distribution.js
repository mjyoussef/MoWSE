#!/usr/bin/env node
const util = require('./distribution/util/util.js');
const args = require('yargs').argv;

// Default configuration
global.nodeConfig = global.nodeConfig || {
  ip: '127.0.0.1',
  port: 8080,
  onStart: () => {
    console.log('Node started!');
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
  global.nodeConfig.port = nodeConfig.port ?
        nodeConfig.port : global.nodeConfig.port;
  global.nodeConfig.onStart = nodeConfig.onStart ?
        nodeConfig.onStart : global.nodeConfig.onStart;
}

global.distribution = {};
global.distribution.url = require('url');
global.distribution.URL = require('url').URL;
global.distribution.path = require('path');
global.distribution.fs = require('fs');
global.distribution.dir = __dirname;
global.distribution.http = require('http');
global.distribution.util = require('./distribution/util/util.js');
global.distribution.local = require('./distribution/local/local.js');
global.distribution.node = require('./distribution/local/node.js');
global.distribution.parser = require('node-html-parser');
global.distribution.cheerio = require('cheerio');
global.distribution.htmlToText = require('html-to-text').htmlToText;

global.distribution['all'] = {};
global.distribution['all'].status =
    require('./distribution/all/status')({gid: 'all'});
global.distribution['all'].comm =
    require('./distribution/all/comm')({gid: 'all'});
global.distribution['all'].gossip =
    require('./distribution/all/gossip')({gid: 'all'});
global.distribution['all'].groups =
    require('./distribution/all/groups')({gid: 'all'});
global.distribution['all'].routes =
    require('./distribution/all/routes')({gid: 'all'});
global.distribution['all'].mem =
    require('./distribution/all/mem')({gid: 'all'});
global.distribution['all'].store =
    require('./distribution/all/store')({gid: 'all'});

// templates
global.distribution.commTemplate = require('./distribution/all/comm');
global.distribution.groupsTemplate = require('./distribution/all/groups');
global.distribution.statusTemplate = require('./distribution/all/status');
global.distribution.routesTemplate = require('./distribution/all/routes');
global.distribution.gossipTemplate = require('./distribution/all/gossip');
global.distribution.memTemplate = require('./distribution/all/mem');
global.distribution.storeTemplate = require('./distribution/all/store');
global.distribution.mrTemplate = require('./distribution/all/mr');

module.exports = global.distribution;

/* The following code is run when distribution.js is run directly */
if (require.main === module) {
  distribution.node.start(global.nodeConfig.onStart);
}
