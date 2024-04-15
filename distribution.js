#!/usr/bin/env node

const util = require('./distribution/util/util.js');
const args = require('yargs').argv;
const path = require('path');
const fs = require('fs');

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

const distribution = {
  util: require('./distribution/util/util.js'),
  local: require('./distribution/local/local.js'),
  node: require('./distribution/local/node.js'),
};

global.distribution = distribution;

function loadGloVeEmbeddingsFromFolder(folderPath) {
  const embeddings = {};

  const files = fs.readdirSync(folderPath);

  files.forEach((file) => {
    const filePath = path.join(folderPath, file);
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');
    lines.forEach((line) => {
      const parts = line.split(' ');
      const word = parts[0];
      const embedding = parts.slice(1).map(parseFloat);
      if (!embeddings[word]) {
        embeddings[word] = embedding;
      } else {
        for (let i = 0; i < embedding.length; i++) {
          embeddings[word][i] = (embeddings[word][i] + embedding[i]) / 2;
        }
      }
    });
  });
  return embeddings;
}

console.log('Loading GloVe embeddings...');
// glovePath = './distribution/util/glove_300d_split'
glovePath = './distribution/util/glove_test'
distribution.embeddings = loadGloVeEmbeddingsFromFolder(glovePath);


module.exports = distribution;

/* The following code is run when distribution.js is run directly */
if (require.main === module) {
  distribution.node.start(global.nodeConfig.onStart);
}
