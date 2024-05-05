const vecStore = (config) => {
  const gid = config.gid || "all";
  const hash = config.hash || "naiveHash";

  return {
    /**
     * Resets databases.
     *
     * @param {Function} callback - an optional callback that accepts error, value
     */
    reset: (callback) => {
      const args = [];
      const remote = {
        service: "vecStore",
        method: "reset",
      };
      global.distribution[gid].comm.send(args, remote, (e, v) => {
        if (Object.keys(e).length !== 0) {
          callback(new Error(e.message), undefined);
          return;
        }
        callback(undefined, true);
      });
    },

    /**
     * Creates a gid collection in each node's vector store.
     *
     * @param {string} gid - the group ID
     * @param {Function} callback - optional callback that accepts error, value
     */
    createGidCollection: (callback) => {
      const args = [gid];
      const remote = {
        service: "vecStore",
        method: "createGidCollection",
      };
      global.distribution[gid].comm.send(args, remote, (e, v) => {
        if (Object.keys(e).length !== 0) {
          callback(
            new Error("Failed to create collection in at least one node."),
            undefined
          );
          return;
        }
        callback(undefined, true);
      });
    },

    /**
     * Flushes buffered documents into their databases.
     *
     * @param {Function} callback - an optional callback function that accepts error, value.
     */
    flushBuffer: (callback) => {
      const args = [gid];
      const remote = {
        service: "vecStore",
        method: "flushBuffer",
      };
      global.distribution[gid].comm.send(args, remote, (e, v) => {
        if (Object.keys(e).length !== 0) {
          console.log(e);
          callback(
            new Error("Failed to flush buffer in at least one node."),
            undefined
          );
          return;
        }
        callback(undefined, v);
      });
    },

    /**
     * Puts a document in each node's local vector store.
     *
     * @param {number[]} embedding - the document's embedding.
     * @param {string} document - the name of the document.
     * @param {Function} callback - an optional callback function that accepts error, value.
     */
    put: (embedding, document, callback) => {
      global.distribution.local.groups.get(gid, (e, nodes) => {
        if (e) {
          callback(new Error(e.message), undefined);
          return;
        }

        const kid = global.distribution.util.id.getID(document);
        const sid = global.distribution.util.id[hash](kid, Object.keys(nodes));
        const args = [embedding, document, gid];
        const remote = {
          node: nodes[sid],
          service: "vecStore",
          method: "put",
        };
        global.distribution.local.comm.send(args, remote, (e, v) => {
          if (Object.keys(e).length !== 0) {
            callback(new Error(e.message), undefined);
            return;
          }
          callback(undefined, true);
        });
      });
    },

    /**
     * Returns top-k closest documents to the query embedding.
     *
     * @param {number[]} embedding - the query embedding.
     * @param {number} k - the choice of k.
     * @param {Function} callback - an optional callback that accepts error, value.
     */
    query: (embedding, k, callback) => {
      const args = [embedding, gid, k];
      const remote = {
        service: "vecStore",
        method: "query",
      };
      global.distribution[gid].comm.send(
        args,
        remote,
        (e, intermediateResults) => {
          if (Object.keys(e).length !== 0) {
            callback(new Error(e.message), undefined);
            return;
          }

          const documents = [];
          Object.entries(intermediateResults).forEach(([sid, result]) => {
            for (let i = 0; i < result.ids.length; i++) {
              const documentID = result.ids[i];
              const distance = result.distances[i];
              documents.push([documentID, distance]);
            }
          });

          // sort documents by distance
          documents.sort((d1, d2) => d1[1] - d2[1]);

          // JSON output
          const output = {
            ids: [],
            distances: [],
          };

          for (let i = 0; i < Math.min(k, documents.length); i++) {
            const elt = documents[i];
            output.ids.push(elt[0]); // id
            output.distances.push(elt[1]); // distance to query embedding
          }

          callback(undefined, output);
        }
      );
    },
  };
};

module.exports = vecStore;
