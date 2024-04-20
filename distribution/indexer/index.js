#!/usr/bin/env node
const groupsTemplate = require("../distribution/all/groups");
const distribution = require('../distribution');
const mr = require('./w2v_mr.js');
const id = distribution.util.id;

global.nodeConfig = { ip: "127.0.0.1", port: 7000 };

const indexGroup = {};

let localServer = null;

const maxURLs = 1000;

const n1 = { ip: "127.0.0.1", port: 7001 };
const n2 = { ip: "127.0.0.1", port: 7002 };
const n3 = { ip: "127.0.0.1", port: 7003 };

indexGroup[id.getSID(n1)] = n1;
indexGroup[id.getSID(n2)] = n2;
indexGroup[id.getSID(n3)] = n3;

const startNodes = (cb) => {
  distribution.local.status.spawn(n1, (e, v) => {
    distribution.local.status.spawn(n2, (e, v) => {
      distribution.local.status.spawn(n3, (e, v) => {
        cb();
      });
    });
  });
};

const index = (config) => {
  const doMapReduce = (cb) => {
    mrArgs = {mrid: 'index_mr', mapFn: mr.map, reduceFn: mr.reduce};
    distribution[gid].mr.exec(mrArgs, (e, v) => {
      if (e) {
        cb(e, null);
      }
      v.forEach((o) => {
        let url = Object.keys(o)[0];
        let embedding = o[key];
        // change for vector database
        distribution[gid].store.vecput(embedding, url, (e, v) => {
          if (e) {
            cb(e, null);
          } else {
            cb(null, v);
          }
        });
      });
    });
  };

  let cnt = 0;

  data.forEach((o) => {
    // Change if we need to get body a
    let key = Object.keys(o)[0];
    let value = o[key];
    distribution[gid].store.put(value, key, (e, v) => {
      if (e) {
        callback(e, null);
      } else {
        cnt++;
        if (cnt === data.length) {
          doMapReduce(callback);
        }
      }
    }, ['index_mr', 'map']);
  });
};

// let dataset = [
//   { url1: "https://en.wikipedia.org/wiki/Computer_science" },
//   { url2: "https://en.wikipedia.org/wiki/Computer_science" },
//   { url3: "https://en.wikipedia.org/wiki/Computer_science" },
// ];

const cleanup = (e, v) => {
  let remote = { service: "status", method: "stop" };
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        localServer.close();
      });
    });
  });
};

distribution.node.start((server) => {
  localServer = server;

  const crawlConfig = { gid: "index" };
  startNodes(() => {
    groupsTemplate(crawlConfig).put("index", indexGroup, (e, v) => {
      let cntr = 0;
      dataset.forEach((o) => {
        let key = Object.keys(o)[0];
        let value = o[key];
        distribution.index.store.put(
          value,
          key,
          (e, v) => {
            cntr++;
            if (cntr === dataset.length) {
              doMapReduce(cleanup);
            }
          },
          ["crawl-mr", "map"]
        );
      });
    });
  });
});

module.exports = index;
