/* Puts a key-va to the appropriate node in the group.

PARAMETERS:
gid: the group ID
hash: a hash function for identifying the appropriate node
nodes: list of nodes in the group
method: method for the service
key: the key
optionalArgs: an optional list of arguments
cb: a (required) callback
*/
function sendToNode(gid, hash, nodes, method, key, optionalArgs, cb) {
  const kid = global.distribution.util.id.getID(key);
  const nid = hash(kid, Object.keys(nodes));

  // arguments
  const args = optionalArgs || [];
  args.push({key: key, gid: gid});

  // remote
  const remote = {
    node: nodes[nid],
    service: 'vecStore',
    method: method,
  };

  global.distribution.local.comm.send(args, remote, cb);
}

const vecStore = (config) => {
  const gid = config.gid || 'all';
  const hash = config.hash || 'naiveHash';

  return {

    /* Puts a key + value to the appropriate node in the group.

    PARAMETERS:
    gid: the key to add
    value: the value for the key
    cb: an optional callback
    */
    put: (key, value, cb) => {
      cb = cb || function(e, v) {};
      if (key === null) {
        key = global.distribution.util.id.getID(value);
      }
      global.distribution.local.groups.get(gid, (e, nodes) => {
        if (e) {
          if (cb) {
            cb(new Error('Error from all.vecStore.put: failed to get nodes in gid'), undefined);
          }
          return;
        }
        let hashFn = global.distribution.util.id[hash];
        sendToNode(gid, hashFn, nodes, 'put', key, [value], cb);
      });
    },

    /* Gets the top-k results for a query.

    PARAMETERS:
    key: the key
    cb: an optional callback
    k: k for top-k search (defaults to 5)
    */
    query: (key, cb, k=5) => {
      // console.log('querying');
      const embedded_query = global.distribution.local.index.embed(key);
      global.distribution.local.groups.get(gid, (e, nodes) => {
        if (e) {
          if (cb) {
            cb(new Error('Error from all.vecStore.query: failed to get nodes in gid'), undefined);
          }
          return;
        }

        const promises = [];
        for (const nid in nodes) {
          const remote = {
            node: nodes[nid],
            service: 'vecStore',
            method: 'query',
          };

          promises.push(new Promise((resolve, reject) => {
            global.distribution.local.comm.send([{key: embedded_query, k: k}], remote, (e, v) => {
              if (e) {
                resolve([]);
              } else {
                resolve(v);
              }
            });
          }));
        }
        Promise.all(promises).then((results) => {
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
        }).catch((error) => {
          if (cb) {
            cb(new Error('Error from all.vecStore.query: failed to resolve promises: ', error), undefined);
          }
        });
      });
    },
  };
};

module.exports = vecStore;
