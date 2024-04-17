#!/usr/bin/env node
const fs = require('fs');

function map(url, text) {
  return new Promise((resolve, reject) => {
    let model = global.distribution.embeddings;
    let words = text.toLowerCase().split(' ');
    const stopwords = fs.readFileSync('../util/stop.txt', 'utf8').split('\n');
    words = words.filter(word => !stopwords.includes(word));
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

module.exports = {
  map: map,
  reduce: reduce,
};