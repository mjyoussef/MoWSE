/**
 * Helper method that invokes a storage service / method with a key.
 *
 * @param {string} gid - name of the group
 * @param {Function} hash - hash function (ie. consistent hashing, naive hash, etc)
 * @param {Object[]} nodes - nodes in the group
 * @param {string} method - the service method
 * @param {string} key - the key
 * @param {Array} optionalArgs - list of optional arguments
 * @param {Function} cb - optional callback that accepts error, value
 */
function sendToNode(gid, hash, nodes, method, key, optionalArgs, cb) {
  const kid = global.distribution.util.id.getID(key);
  const nid = hash(kid, Object.keys(nodes));

  // arguments
  const args = optionalArgs || [];
  args.push({ key: key, gid: gid });

  // remote
  const remote = {
    node: nodes[nid],
    service: "vecStore",
    method: method,
  };

  global.distribution.local.comm.send(args, remote, cb);
}

const vecStore = (config) => {
  const gid = config.gid || "all";
  const hash = config.hash || "naiveHash";

  return {
    /**
     * Puts a key-value pair (overwrites existing key if it exists).
     *
     * @param {string} key - the key
     * @param {*} value - the value for that key
     * @param {Function} cb - optional callback that accepts error, value
     */
    put: (key, value, cb) => {
      cb = cb || function (e, v) {};
      if (key === null) {
        key = global.distribution.util.id.getID(value);
      }
      global.distribution.local.groups.get(gid, (e, nodes) => {
        if (e) {
          if (cb) {
            cb(
              new Error(
                "Error from all.vecStore.put: failed to get nodes in gid"
              ),
              undefined
            );
          }
          return;
        }
        let hashFn = global.distribution.util.id[hash];
        sendToNode(gid, hashFn, nodes, "put", key, [value], cb);
      });
    },

    /**
     * Gets key-value pairs for top-k closest keys.
     *
     * @param {string} key - the key
     * @param {Function} cb - optional callback that accepts error, value
     * @param {number} k - choice of k for the top-k query
     */
    query: (key, cb, k = 5) => {
      console.log("querying");
      const embedded_query = global.distribution.local.index.embed(key);
      global.distribution.local.groups.get(gid, (e, nodes) => {
        if (e) {
          if (cb) {
            cb(
              new Error(
                "Error from all.vecStore.query: failed to get nodes in gid"
              ),
              undefined
            );
          }
          return;
        }

        const promises = [];
        for (const nid in nodes) {
          const remote = {
            node: nodes[nid],
            service: "vecStore",
            method: "query",
          };

          promises.push(
            new Promise((resolve, reject) => {
              global.distribution.local.comm.send(
                [{ key: embedded_query, k: k }],
                remote,
                (e, v) => {
                  if (e) {
                    resolve([]);
                  } else {
                    resolve(v);
                  }
                }
              );
            })
          );
        }
        Promise.all(promises)
          .then((results) => {
            results = results.flat();
            results.sort((a, b) => {
              return a.cosineSim - b.cosineSim;
            });
            results = results.reverse();
            results = results.slice(0, k);
            results = results.map((result) => result.url);
            if (cb) {
              cb(undefined, results);
            }
          })
          .catch((error) => {
            if (cb) {
              cb(
                new Error(
                  "Error from all.vecStore.query: failed to resolve promises: ",
                  error
                ),
                undefined
              );
            }
          });
      });
    },
  };
};

module.exports = vecStore;
