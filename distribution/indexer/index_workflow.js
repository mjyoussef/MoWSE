#!/usr/bin/env node
const distribution = require('../distribution');
const mr = require('./w2v_mr.js');

const index_workflow = (config) => {
  const gid = config.gid || 'all';
  return {
    index: (data, callback) => {

      const doMapReduce = (cb) => {
        mr_args = {mrid: 'index_mr', mapFn: mr.map, reduceFn: mr.reduce};
        distribution[gid].mr.exec(mr_args, (e, v) => {
          if (e) {
            cb(e, null);
          }
          v.forEach((o) => {
            let url = Object.keys(o)[0];
            let embedding = o[key];
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
    }
  };
}

module.exports = index_workflow;
