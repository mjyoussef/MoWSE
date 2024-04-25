const store = require("./store");
const groups = require("./groups");
const comm = require("./comm");

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
  cb = cb || function () {};

  // collect the input key-value pairs for map
  store.get(
    { key: null, gid: args.gid },
    [args.mrid, "map"],
    async (e, keyValPairs) => {
      if (e) {
        cb(new Error("Error getting map input key-value pairs"), undefined);
      }

      // run map computation on each key-value pair
      const mapPromises = [];
      for (let i = 0; i < keyValPairs.length; i++) {
        const pair = keyValPairs[i];
        const mapInputKey = Object.keys(pair)[0];
        const mapInputValue = pair[mapInputKey];
        mapPromises.push(args.mapFn(mapInputKey, mapInputValue));
      }

      const mapResults = (await Promise.all(mapPromises)).flat();

      // after collecting map results, send to appropriate reducers
      groups.get(args.gid, (e, nodes) => {
        if (e) {
          cb(new Error("Error: failed groups.get"), undefined);
          return;
        }

        // find which reducers get which key-value pairs
        const reducersMap = {};
        for (let i = 0; i < mapResults.length; i++) {
          let pair = mapResults[i];
          if (pair === null || pair === undefined) {
            continue;
          }
          let reduceInputKey = Object.keys(pair)[0];
          let reduceInputKid =
            global.distribution.util.id.getID(reduceInputKey);
          let nid = global.distribution.util.id[args.hash](
            reduceInputKid,
            Object.keys(nodes)
          );

          // update the node's list of key-value pairs
          let nidPairs = reducersMap[nid] || [];
          nidPairs.push(pair);
          reducersMap[nid] = nidPairs;
        }

        // send requests (to mr.append) to each reducer
        const appendPromises = [];
        for (const nid in reducersMap) {
          appendPromises.push(
            new Promise((resolve, reject) => {
              const remote = {
                node: nodes[nid],
                service: "mr",
                method: "append",
              };
              const appendArgs = {
                gid: args.gid,
                mrid: args.mrid,
                items: reducersMap[nid],
              };
              comm.send([appendArgs], remote, (e, v) => {
                if (e) {
                  reject(e);
                } else {
                  resolve(v);
                }
              });
            })
          );
        }

        // if all requests were successful, notify the coordinator
        Promise.all(appendPromises)
          .then((results) => {
            cb(undefined, true);
          })
          .catch((error) => {
            // otherwise, return an error if at least one fails
            cb(
              new Error("Error forwarding map results to reducers"),
              undefined
            );
          });
      });
    },
    true
  );
};

mr.reduce = (args, cb) => {
  /*
    args = {
        gid: string,
        mrid: string,
        reduceFn: function,
    }
  */
  cb = cb || function () {};

  // check if the directory exists; if not, this node is not
  // a reducer, so return an empty result
  if (!store.checkdir([args.mrid, "reduce"], args.gid)) {
    cb(undefined, undefined);
    return;
  }

  // get all of the input keys for reduce (stored under {mrid}/reduce)
  store.get(
    { key: null, gid: args.gid },
    [args.mrid, "reduce"],
    (e, keyValPairs) => {
      if (e) {
        cb(new Error("Error getting input keys for reducer"), undefined);
        return;
      }

      const reducePromises = [];
      for (let i = 0; i < keyValPairs.length; i++) {
        const pair = keyValPairs[i];
        const reduceInputKey = Object.keys(pair)[0];
        let reduceInputValues = pair[reduceInputKey];
        reduceInputValues = Array.isArray(reduceInputValues)
          ? reduceInputValues
          : [reduceInputValues];
        const reducePromise = args.reduceFn(reduceInputKey, reduceInputValues);
        reducePromises.push(reducePromise);
      }

      Promise.all(reducePromises)
        .then((reduceResults) => {
          cb(undefined, reduceResults);
        })
        .catch((error) => {
          cb(new Error("At least one reducer failed"), undefined);
        });
    },
    true
  );
};

mr.append = (args, cb) => {
  /*
    args = {
        gid: string,
        mrid: string,
        items: list of key-value pairs,
    }
    */

  cb = cb || function () {};

  const promises = [];
  for (let i = 0; i < args.items.length; i++) {
    const item = args.items[i];

    // get key and value
    const key = Object.keys(item)[0];
    const value = item[key];

    // each key is a file under {args.mrid}/reduce/
    const root = [args.mrid, "reduce"];
    promises.push(
      new Promise((resolve, reject) => {
        store.put(value, { key: key, gid: args.gid }, root, (e, v) => {
          if (e) {
            reject(e);
          } else {
            resolve(true);
          }
        });
      })
    );
  }

  // if append fails to store any item, an error
  // is returned w/ results being undefined (may want to change
  // this behavior)
  Promise.all(promises)
    .then((results) => {
      cb(undefined, true);
    })
    .catch((error) => {
      cb(
        new Error("Local.mr.append failed to store a key-value pair"),
        undefined
      );
    });
};

module.exports = mr;
