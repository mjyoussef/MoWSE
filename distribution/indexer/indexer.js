#!/usr/bin/env node
const distribution = require('../distribution');
const mr = require('./w2v_mr.js');

const index_mr = (config) => {
  const gid = config.gid || 'all';
  return {
    index: (data, callback) => {

      const doMapReduce = (cb) => {
        mr_args = {mrid: 'index-mr', mapFn: mr.map, reduceFn: mr.reduce};
        distribution[gid].mr.exec(mr_args, (e, v) => {
          if (e) {
            cb(e, null);
          }
          v.forEach((o) => {
            let url = Object.keys(o)[0];
            let embedding = o[key];
            distribution[gid].store.put(embedding, url, (e, v) => {
              if (e) {
                cb(e, null);
              }
            }, ['index_mr', 'results']);
          });
        });
      };

      let cnt = 0;

      data.forEach((o) => {
        let key = Object.keys(o)[0];
        let value = o[key];
        distribution[gid].store.put(value, key, (e, v) => {
          cnt++;
          if (cntr === dataset.length) {
            doMapReduce(callback);
          }
        }, ['index_mr', 'map']);
      });
    }
  };
}

module.exports = index_mr;
