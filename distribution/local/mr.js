const store = require('./store');
const groups = require('./groups');
const comm = require('./comm');
const util = global.distribution.util;

const mr = {};

mr.map = (args, cb) => {
  /*
    args = {
        gid: string,
        mrid: string,
        mapFn: function,
        hash: function,
    }
    */
  cb = cb || function() {};

  // collect the input key-value pairs for map
  store.get({key: null, gid: args.gid}, [args.mrid, 'map'], async (e, keyValPairs) => {
    if (e) {
      cb(new Error('Error getting map input key-value pairs'), undefined);
    }

    // run map computation on each key-value pair
    const mapPromises = [];
    for (let i=0; i<keyValPairs.length; i++) {
      const pair = keyValPairs[i];
      const mapInputKey = Object.keys(pair)[0];
      const mapInputValue = pair[mapInputKey];
      mapPromises.push(args.mapFn(mapInputKey, mapInputValue));
    }

    const mapResults = (await Promise.all(mapPromises)).flat();

    // after collecting map results, send to appropriate reducers
    groups.get(args.gid, (e, nodes) => {
      if (e) {
        cb(new Error('Error: failed groups.get'), undefined);
        return;
      }

      // find which reducers get which key-value pairs
      const reducersMap = {};
      for (let i=0; i<mapResults.length; i++) {
        let pair = mapResults[i];
        let reduceInputKey = Object.keys(pair)[0];
        let reduceInputKid = global.distribution.util.id.getID(reduceInputKey);
        let nid = global.distribution.util.id[args.hash](reduceInputKid, Object.keys(nodes));

        // update the node's list of key-value pairs
        let nidPairs = reducersMap[nid] || [];
        nidPairs.push(pair);
        reducersMap[nid] = nidPairs;
      }

      // send requests (to mr.append) to each reducer
      const appendPromises = [];
      let counter = 0;
      for (const nid in reducersMap) {
        counter += 1;
        appendPromises.push(new Promise((resolve, reject) => {
          const remote = {
            node: nodes[nid],
            service: 'mr',
            method: 'append',
          };
          const sendID = global.distribution.util.id.getID({
            config: global.nodeConfig,
            timestamp: counter,
            items: reducersMap[nid],
          });
          const appendArgs = {
            gid: args.gid,
            mrid: args.mrid,
            sendID: sendID,
            items: reducersMap[nid],
          };
          comm.send([appendArgs], remote, (e, v) => {
            if (e) {
              reject(e);
            } else {
              resolve(v);
            }
          });
        }));
      }

      // if all requests were successful, notify the coordinator
      Promise.all(appendPromises).then((results) => {
        cb(undefined, true);
      }).catch((error) => { // otherwise, return an error if at least one fails
        cb(new Error('Error forwarding map results to reducers'), undefined);
      });
    });
  }, true);
};

mr.reduce = (args, cb) => {
  /*
    args = {
        gid: string,
        mrid: string,
        reduceFn: function,
    }
  */
  cb = cb || function() {};

  // reduce inputs are stored under {args.mrid}/reduce/{key}/...

  // check if the directory exists; if not, this node is not
  // a reducer, so return an empty result
  if (!store.checkdir([args.mrid, 'reduce'], args.gid)) {
    cb(undefined, undefined);
  }

  // get all of the input keys for reduce
  store.get({key: null, gid: args.gid}, [args.mrid, 'reduce'], (e, keys) => {
    // each key in keys is a directory that stores values in individual files
    if (e) {
      cb(new Error('Error getting input keys for reducer'), undefined);
      return;
    }

    // for each reduce input key, we need to read all of the values
    const reducePromises = [];
    for (let i=0; i<keys.length; i++) {
      const reduceInputKey = keys[i];
      const root2 = [args.mrid, 'reduce', reduceInputKey];
      const key2 = {
        key: null,
        gid: args.gid,
      };
      reducePromises.push(new Promise((resolve, reject) => {
        store.get(key2, root2, (e, keyValPairs) => {
          // keyValPairs contains a list of key-value pairs
          // where the key is some unique ID for the value
          if (e) {
            reject(e);
            return;
          }

          // get the values (we don't care about the keys)
          const reduceInputValues = [];
          for (let i=0; i<keyValPairs.length; i++) {
            const someKey = Object.keys(keyValPairs[i])[0];
            reduceInputValues.push(keyValPairs[i][someKey]);
          }

          // call reduce function (async, so we need to wait for it to resolve)
          const reduceOutputPromise = args.reduceFn(reduceInputKey, reduceInputValues);

          // wait for the reduce function to resolve
          reduceOutputPromise.then((result) => {
            resolve(result);
          }).catch((error) => {
            reject(error);
          });
        }, true, false);
      }));
    }

    // collect the reduce outputs and return
    Promise.all(reducePromises).then((results) => {
      console.log("results", results);
      cb(undefined, results);
    }).catch((error) => {
      cb(new Error('Error: at least one reduce computation failed'), undefined);
    });
  }, false, true);
};

mr.append = (args, cb) => {
  /*
    args = {
        gid: string,
        mrid: string,
        sendID: string,
        items: list of key-value pairs,
    }
    */

  cb = cb || function() {};

  const promises = [];
  let counter = 0;
  for (let i=0; i<args.items.length; i++) {
    counter += 1;
    const item = args.items[i];

    // get key and value
    const key = Object.keys(item)[0];
    const value = item[key];

    // Write to {args.mrid}/reduce/{key}/{args.sendID}.
    // Each file stores a single value, and we use args.sendID
    // as the filename to avoid clashes among common values.
    const root = [args.mrid, 'reduce', key];
    promises.push(new Promise((resolve, reject) => {
      const fileName = util.id.getID({key: args.sendID, gid: args.gid, ts: counter});
      store.put(value, {key: fileName, gid: args.gid}, root, (e, v) => {
        if (e) {
          reject(e);
        } else {
          resolve(v);
        }
      });
    }));
  }

  // if append fails to store any item, an error
  // is returned w/ results being undefined (may want to change
  // this behavior)
  Promise.all(promises).then((results) => {
    cb(undefined, true);
  }).catch((error) => {
    console.log(error);
    cb(new Error('Error storing at least one key-val pair in local.mr.append'), undefined);
  });
};

module.exports = mr;
