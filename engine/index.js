// #!/usr/bin/env node
// const fs = require('fs');

// global.nodeConfig = { ip: "127.0.0.1", port: 7070 };
// const distribution = require("../distribution");
// const id = distribution.util.id;

// const groupsTemplate = require("../distribution/all/groups");

// const indexGroup = {};

// let localServer = null;

// /*
//     The local node will be the orchestrator.
// */

// const n1 = { ip: "127.0.0.1", port: 7113 };
// const n2 = { ip: "127.0.0.1", port: 7114 };
// const n3 = { ip: "127.0.0.1", port: 7115 };

// ////////////////
// // BEFORE ALL //
// ////////////////

// /* Stop the nodes if they are running */

// indexGroup[id.getSID(n1)] = n1;
// indexGroup[id.getSID(n2)] = n2;
// indexGroup[id.getSID(n3)] = n3;

// const startNodes = (cb) => {
//   distribution.local.status.spawn(n1, (e, v) => {
//     distribution.local.status.spawn(n2, (e, v) => {
//       distribution.local.status.spawn(n3, (e, v) => {
//         cb();
//       });
//     });
//   });
// };

// function map(url, text) {
//   return new Promise((resolve, reject) => {
//     let model = global.distribution.embeddings;
//     let words = text.toLowerCase().split(' ');
//     const stopwords = fs.readFileSync('../util/stop.txt', 'utf8').split('\n');
//     words = words.filter((word) => !stopwords.includes(word));
//     let sum = null;
//     for (word of words) {
//       if (word in model) {
//         if (sum === null) {
//           sum = model[word];
//         } else {
//           for (let i = 0; i < sum.length; i++) {
//             sum[i] += model[word][i];
//           }
//         }
//       }
//     }
//     if (sum !== null) {
//       const length = words.length;
//       for (let i = 0; i < sum.length; i++) {
//         sum[i] /= length;
//       }
//     }
//     resolve({key: url, value: sum});
//   });
// }

// function reduce(url, vectors) {
//   return new Promise((resolve, reject) => {
//     if (vectors.length === 0) {
//       return null;
//     }
//     let sum = null;
//     for (vector of vectors) {
//       if (sum === null) {
//         sum = vector;
//       } else {
//         for (let i = 0; i < sum.length; i++) {
//           sum[i] += vector[i];
//         }
//       }
//     }
//     if (sum !== null) {
//       const length = vectors.length;
//       for (let i = 0; i < sum.length; i++) {
//         sum[i] /= length;
//       }
//     }
//     resolve({key: url, value: sum});
//   });
// }


// const index = (config) => {
//   const doMapReduce = (cb) => {
//     mrArgs = {mrid: 'index_mr', mapFn: mr.map, reduceFn: mr.reduce};
//     distribution[gid].mr.exec(mrArgs, (e, v) => {
//       if (e) {
//         cb(e, null);
//       }
//       v.forEach((o) => {
//         let url = Object.keys(o)[0];
//         let embedding = o[key];
//         distribution[gid].vecStore(embedding, url, (e, v) => {
//           if (e) {
//             cb(e, null);
//           } else {
//             cb(null, v);
//           }
//         });
//       });
//     });
//   };

//   let cnt = 0;

//   data.forEach((o) => {
//     // Change if we need to get body a
//     let key = Object.keys(o)[0];
//     let value = o[key];
//     distribution[gid].store.put(value, key, (e, v) => {
//       if (e) {
//         callback(e, null);
//       } else {
//         cnt++;
//         if (cnt === data.length) {
//           doMapReduce(callback);
//         }
//       }
//     }, ['index-mr', 'map']);
//   });
// };




// const cleanup = (e, v) => {
//   let remote = { service: "status", method: "stop" };
//   remote.node = n1;
//   distribution.local.comm.send([], remote, (e, v) => {
//     remote.node = n2;
//     distribution.local.comm.send([], remote, (e, v) => {
//       remote.node = n3;
//       distribution.local.comm.send([], remote, (e, v) => {
//         localServer.close();
//       });
//     });
//   });
// };

// distribution.node.start((server) => {
//   localServer = server;

//   const crawlConfig = { gid: 'index' };
//   startNodes(() => {
//     groupsTemplate(crawlConfig).put('index', indexGroup, (e, v) => {
//       let cntr = 0;
//       dataset.forEach((o) => {
//         let key = Object.keys(o)[0];
//         let value = o[key];
//         distribution.crawl.store.put(
//           value,
//           key,
//           (e, v) => {
//             cntr++;
//             if (cntr === dataset.length) {
//               doMapReduce(cleanup);
//             }
//           },
//           ["crawl-mr", "map"]
//         );
//       });
//     });
//   });
// });
