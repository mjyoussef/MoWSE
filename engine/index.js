#!/usr/bin/env node
const fs = require('fs');

function map(url, text) {
  return new Promise((resolve, reject) => {
    let model = global.distribution.embeddings;
    let words = text.toLowerCase().split(' ');
    const stopwords = fs.readFileSync('../util/stop.txt', 'utf8').split('\n');
    words = words.filter((word) => !stopwords.includes(word));
    let sum = null;
    for (word of words) {
      if (word in model) {
        if (sum === null) {
          sum = model[word];
        } else {
          for (let i = 0; i < sum.length; i++) {
            sum[i] += model[word][i];
          }
        }
      }
    }
    if (sum !== null) {
      const length = words.length;
      for (let i = 0; i < sum.length; i++) {
        sum[i] /= length;
      }
    }
    resolve({key: url, value: sum});
  });
}

function reduce(url, vectors) {
  return new Promise((resolve, reject) => {
    if (vectors.length === 0) {
      return null;
    }
    let sum = null;
    for (vector of vectors) {
      if (sum === null) {
        sum = vector;
      } else {
        for (let i = 0; i < sum.length; i++) {
          sum[i] += vector[i];
        }
      }
    }
    if (sum !== null) {
      const length = vectors.length;
      for (let i = 0; i < sum.length; i++) {
        sum[i] /= length;
      }
    }
    resolve({key: url, value: sum});
  });
}


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
