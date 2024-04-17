const mr = function(config) {
  const gid = config.gid || 'all';
  const hash = config.hash || 'naiveHash';

  return {
    exec: (args, cb) => {
      /*
      args = {
        mrid: string,
        mapFn: function,
        reduceFn: function,
      }
      */

      cb = cb || function() {};

      global.distribution.local.groups.get(gid, (e, nodes) => {
        if (e) {
          cb(new Error('Error: failed to get nodes in group'), undefined);
          return;
        }

        // map phase
        const mapPromises = [];
        for (const nid in nodes) {
          const remote = {
            node: nodes[nid],
            service: 'mr',
            method: 'map',
          }
          const mapArgs = {
            gid: gid,
            mrid: args.mrid,
            mapFn: args.mapFn,
            hash: hash,
          }
          mapPromises.push(new Promise((resolve, reject) => {
            global.distribution.local.comm.send([mapArgs], remote, (e, v) => {
              if (e) {
                reject(e);
              } else {
                resolve(v);
              }
            });
          }));
        }

        // wait for map phase to complete
        Promise.all(mapPromises).then((notifications) => {
          
          // reduce phase
          const reducePromises = [];
          for (const nid in nodes) {
            const remote = {
              node: nodes[nid],
              service: 'mr',
              method: 'reduce',
            }
            const reduceArgs = {
              gid: gid,
              mrid: args.mrid,
              mapFn: args.reduceFn,
            }
            reducePromises.push(new Promise((resolve, reject) => {
              global.distribution.local.comm.send([reduceArgs], remote, (e, v) => {
                if (e) {
                  reject(e);
                } else {
                  resolve(v);
                }
              });
            }));
          }

          Promise.all(reducePromises).then((results) => {
            cb(undefined, results.flat());
          }).catch((reduceError) => {
            cb(new Error('Error: failed reduce phase'), undefined);
          });
        }).catch((mapError) => {
          cb(new Error('Error: failed map phase'), undefined);
        })
      });
    },
  };
};

module.exports = mr;
