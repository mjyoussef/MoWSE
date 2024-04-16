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
        keys: Array<any>,
    }
    */
  cb = cb || function() {};

  // map keys are stored as files under store/{sid}/{mrid}/{map};
  // it can be accessed via. local.store.get(..., root=[mrid, 'map'])

  // read in the keys and their corresponding values
  const root = [args.mrid, 'mapInputs'];
  const promises = [];

  for (let i=0; i<args.keys.length; i++) {
    const key = args.keys[i];
    promises.push(new Promise((resolve, reject) => {
      store.get(key, root, (e, v) => {
        if (e) {
          reject(e);
        } else {
          // pass as input to the map function
          let mapResult = args.mapFn(key, v);

          // wrap in an array (if not already one)
          mapResult = Array.isArray(mapResult) ? mapResult : [mapResult];

          resolve(mapResult);
        }
      });
    }));
  }

  // collect key-value pairs as input for map
  Promise.all(promises).then((mapResults) => {
    const keyValPairs = mapResults.flat();

    // forward key-val pairs to their appropriate reducers
    groups.get(args.gid, (e, nodes) => {
      if (e) {
        cb(new Error('Error from mapper'), undefined);
        return;
      }

      // find which reducers get which key-value pairs
      const reducersMap = {};
      for (let i=0; i<keyValPairs.length; i++) {
        let pair = keyValPairs[i];
        let mapKey = Object.keys(pair)[0];
        let mapKid = util.id.getID(mapKey);
        let nid = util.id[args.hash](mapKid, Object.keys(nodes));

        let nidPairs = reducersMap[nid] || [];
        nidPairs.push(pair);
        reducersMap[nid] = nidPairs;
      }

      // forward to each reducer
      const reducerPromises = [];
      let counter = 0;
      for (const nid in reducersMap) {
        reducerPromises.push(new Promise((resolve, reject) => {
          const remote = {
            node: nodes[nid],
            service: 'mr',
            method: 'append',
          };
          const args = {
            mrid: args.mrid,
            sendID: util.id.getID({config: global.nodeConfig, ts: counter++}),
            items: reducersMap[nid],
          };

          // each key gets stored under {...}/{mrid}/{reduceInputs}/{key}/{...}
          comm.send([args], remote, (e, v) => {
            if (e) {
              reject(e);
            } else {
              resolve(v);
            }
          });
        }));
      }

      // if successful, notify the coordinator
      Promise.all(reducerPromises).then((results) => {
        cb(undefined, true);
      }).catch((error) => { // otherwise, return an error if at least one fails
        cb(new Error('Error forwarding map results to reducers'), undefined);
      });
    });
  }).catch((error) => {
    cb(new Error('Error from mapper'), undefined);
  });
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

  // reduce inputs are stored under {...}/{args.mrid}/reduceInputs/{key}/{...}
  const root1 = [args.mrid, 'reduceInputs'];
  const key1 = {
    key: null,
    gid: args.gid,
  }

  // get all of the input keys for reduce
  store.get(key1, root1, (e, keys) => {
    if (e) {
        cb(new Error('Error getting input keys for reducer'), undefined);
        return;
    }

    // for each reduce input key, we need to read all of the values
    const reducePromises = [];
    for (let i=0; i<keys.length; i++) {
        const reduceInputKey = keys[i];
        const root2 = [args.mrid, 'reduceInputs', reduceInputKey];
        const key2 = {
            key: null,
            gid: args.gid,
        }
        reducePromises.push(new Promise((resolve, reject) => {
            store.get(key2, root2, (e, keyValPairs) => {
                // get the values (we don't care about keys)
                const reduceInputValues = [];
                for (let i=0; i<keyValPairs.length; i++) {
                    const someKey = Object.keys(keyValPairs[i])[0];
                    reduceInputValues.push(keyValPairs[i][someKey]);
                }

                // call reduce function (may be async)
                const reduceOutputPromise = args.reduceFn(reduceInputKey, reduceInputValues);

                // wait for the reduce function to resolve
                reduceOutputPromise.then((out) => {
                    resolve(out);
                }).catch((error) => {
                    reject(error);
                });
            }, true, false);
        }));
    }

    // collect the reduce outputs and return
    Promise.all(reducePromises).then((results) => {
        cb(undefined, results);
    }).catch((error) => {
        cb(new Error('Error: at least one reduce computation failed'), undefined);
    });
  }, false, true);
};

mr.append = (args, cb) => {
  /*
    args = {
        mrid: string,
        sendID: string,
        items: list of key-val pairs,
    }
    */

  cb = cb || function() {};

  const promises = [];
  for (let i=0; i<args.items.length; i++) {
    const item = args.items[i];

    // get key and value
    const key = Object.keys(item)[0];
    const value = item[key];

    // write to {...}/{args.mrid}/reduceInputs/{key}/{args.sendID}
    const root = [args.mrid, 'reduceInputs', util.serialize(key)]
    promises.push(new Promise((resolve, reject) => {
      store.put(value, args.sendID, root, (e, v) => {
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
    cb(new Error('Error storing at least one key-val pair in local.mr.append'), undefined);
  });
};

module.exports = mr;
