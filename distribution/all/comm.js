const comm = (config) => {
  let context = {};
  context.gid = config.gid || "all";

  return {
    /**
     * Invokes a service / method on each node in the group.
     *
     * @param {Array} message - a list of arguments
     * @param {Object} rem - service and method to invoke
     * @param {Function} callback - an optional callback that accepts an error and value
     */
    send: function (message, rem, callback) {
      const local = global.distribution.local;

      local.groups.get(context.gid, (e, v) => {
        const allNodes = v;
        const nodesToErrors = {};
        const nodesToValues = {};
        const counter = { count: 0 };
        const remote = { ...rem };

        for (const [sid, node] of Object.entries(allNodes)) {
          remote.node = node;
          local.comm.send(message, remote, (e2, v2) => {
            if (e2) {
              nodesToErrors[sid] = e2;
            } else {
              nodesToValues[sid] = v2;
            }

            counter.count++;

            if (counter.count === Object.keys(allNodes).length) {
              callback(nodesToErrors, nodesToValues);
            }
          });
        }
      });
    },
  };
};

module.exports = comm;
