const local = global.distribution.local;
const util = global.distribution.util;

function sendToNode(gid, hash, nodes, root, service, method, key, optionalArgs, cb) {
  const kid = util.id.getID(key);
  const nid = hash(kid, Object.keys(nodes));

  // arguments
  const args = optionalArgs || [];
  args.push({
    key: key,
    gid: gid,
  });
  args.push(root);

  // remote
  const remote = {
    node: nodes[nid],
    service: service,
    method: method,
  };

  local.comm.send(args, remote, cb);
}

const memory = (service) => {
  // service may only be 'mem' or 'store'

  return (config) => {
    const gid = config.gid || 'all';
    const hash = config.hash || util.id.naiveHash;

    return {
      get: (key, cb, root=[]) => {
        local.groups.get(gid, (e, nodes) => {
          if (e) {
            if (cb) {
              cb(new Error(`Error from all.mem.get: failed to get nodes in gid`), undefined);
            }
            return;
          }

          if (key === null) {
            const promises = [];
            for (const nid in nodes) {
              const remote = {
                node: nodes[nid],
                service: service,
                method: 'get',
              };
              const keyObj = {
                key: null,
                gid: gid,
              };
              promises.push(new Promise((resolve, reject) => {
                local.comm.send([keyObj, root], remote, (e, v) => {
                  if (e) {
                    resolve([]);
                  } else {
                    resolve(v);
                  }
                });
              }));
            }

            Promise.all(promises).then((results) => {
              if (cb) {
                cb(undefined, results.flat());
              }
            }).catch((error) => {
              if (cb) {
                cb(new Error('Error from all.mem.get: failed to resolve promises'), undefined);
              }
            });

            return;
          }

          // otherwise, find the appropriate node and send a request
          sendToNode(gid, hash, nodes, root, service, 'get', key, undefined, cb);
        });
      },

      put: (value, key, cb, root=[]) => {
        // use value if the key is null
        if (key === null) {
          key = util.id.getID(value);
        }

        local.groups.get(gid, (e, nodes) => {
          if (e) {
            if (cb) {
              cb(new Error(`Error from all.mem.put: failed to get nodes in gid`), undefined);
            }
            return;
          }

          sendToNode(gid, hash, nodes, root, service, 'put', key, [value], cb);
        });
      },

      del: (key, cb, root=[]) => {
        local.groups.get(gid, (e, nodes) => {
          if (e) {
            if (cb) {
              cb(new Error(`Error from all.mem.del: failed to get nodes in gid`), undefined);
            }
            return;
          }

          sendToNode(gid, hash, nodes, root, service, 'del', key, undefined, cb);
        });
      },

      reconf: () => {
        // TODO
      },
    };
  };
};

module.exports = memory;
