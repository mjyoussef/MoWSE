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

function calculateCosineSimilarity(vector1, vector2) {
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    magnitude1 += Math.pow(vector1[i], 2);
    magnitude2 += Math.pow(vector2[i], 2);
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  return dotProduct / (magnitude1 * magnitude2);
};

function findClosestVectors(key, results, k) {
  results.sort((a, b) => {
    const similarityA = calculateCosineSimilarity(key, a.vector);
    const similarityB = calculateCosineSimilarity(key, b.vector);
    return similarityB - similarityA;
  });

  return results.slice(0, k);
};

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
            cb(new Error(`Error from all.vecStore.put: failed to get nodes in gid`), undefined);
          }
          return;
        }

        sendToNode(gid, hash, nodes, 'put', key, [value], cb);
      });
    },
    query:(key, cb, k=5) => {
      local.groups.get(gid, (e, nodes) => {
        if (e) {
          if (cb) {
            cb(new Error(`Error from all.vecStore.query: failed to get nodes in gid`), undefined);
          }
          return;
        }

        const results = [];

        for (const nid in nodes) {
          const remote = {
            node: nodes[nid],
            service: 'vecStore',
            method: 'query',
          };
          const keyObj = {
            key: key,
            k: k
          };
          local.comm.send([keyObj], remote, (e, v) => {
            if (e) {
              if (cb) {
                cb(new Error(`Error from all.vecStore.query: failed to query`), undefined);
              }
              return;
            }

            results.push(v);
          });
        }
        const closestVectors = findClosestVectors(key, results, k);
        if (cb) {
          cb(null, closestVectors);
        }
      });
    },
  };
};

module.exports = vecStore;
