const util = global.distribution.util;
const local = global.distribution.local;

function sendToNode(gid, hash, nodes, method, key, optionalArgs, cb) {
  const kid = util.id.getID(key);
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

  local.comm.send(args, remote, cb);
}

const vecStore = (config) => {
  const gid = config.gid || 'all';
  const hash = config.hash || util.id.naiveHash;

  return {
    put: (key, value, cb) => {
      if (key === null) {
        key = util.id.getID(value);
      }
      local.groups.get(gid, (e, nodes) => {
        if (e) {
          if (cb) {
            cb(new Error('Error from all.vecStore.put: failed to get nodes in gid'), undefined);
          }
          return;
        }
        sendToNode(gid, hash, nodes, 'put', key, [value], cb);
      });
    },
    query: (key, cb, k=5) => {
      // replace with a MR framework
      console.log('querying');
      local.groups.get(gid, (e, nodes) => {
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

          const keyObj = { key: key, k: k };

          promises.push(new Promise((resolve, reject) => {
            local.comm.send([keyObj], remote, (e, v) => {
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
          }).reverse().slice(0, k).map(result => result.url);
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
