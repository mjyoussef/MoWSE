const id = global.distribution.util.id;
const path = global.distribution.path;
const serialize = global.distribution.util.serialize;
const wire = global.distribution.util.wire;
const { fork } = require("child_process");

const status = {};

global.moreStatus = {
  sid: id.getSID({ ip: global.nodeConfig.ip, port: global.nodeConfig.port }),
  nid: id.getNID({ ip: global.nodeConfig.ip, port: global.nodeConfig.port }),
  counts: 0,
};

/**
 * Checks an attribute of the node (ie. memory usage, sid, nid, etc).
 *
 * @param {string} attribute - the attribute to check
 * @param {Function} callback - an optional callback
 */
status.get = function (attribute, callback) {
  callback = callback || function () {};

  if (attribute in global.nodeConfig) {
    callback(null, global.nodeConfig[attribute]);
  } else if (attribute in moreStatus) {
    callback(null, moreStatus[attribute]);
  } else if (attribute === "heapTotal") {
    callback(null, process.memoryUsage().heapTotal);
  } else if (attribute === "heapUsed") {
    callback(null, process.memoryUsage().heapUsed);
  } else {
    callback(new Error("Status key not found"));
  }
};

/**
 * Stops the node's server.
 *
 * @param {Function} callback - an optional callback
 */
status.stop = (callback) => {
  global.server.close();
  setTimeout(() => {
    process.exit(0);
  }, 100);

  callback(null, global.nodeConfig);
};

/**
 * Spawns a node.
 *
 * @param {Object} configuration - the configuration of the node
 * @param {Function} callback - an optional callback
 */
status.spawn = (configuration, callback) => {
  const callbackRPC = wire.createRPC(callback);

  const newConfig = { ...configuration };
  if (!("onStart" in configuration)) {
    newConfig.onStart = callbackRPC;
  } else {
    let funcStr = `
    let onStart = ${configuration.onStart.toString()};
    let callbackRPC = ${callbackRPC.toString()};
    onStart();
    callbackRPC(null, global.nodeConfig, () => {});
    `;
    newConfig.onStart = new Function(funcStr);
  }

  console.log(newConfig);

  const file = path.join(__dirname, "../../", "distribution.js");
  const args = ["--config", serialize(newConfig)];

  fork(file, args);
};

module.exports = status;
