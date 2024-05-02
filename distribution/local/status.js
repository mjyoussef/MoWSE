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

status.get = function (configuration, callback) {
  callback = callback || function () {};

  if (configuration in global.nodeConfig) {
    callback(null, global.nodeConfig[configuration]);
  } else if (configuration in moreStatus) {
    callback(null, moreStatus[configuration]);
  } else if (configuration === "heapTotal") {
    callback(null, process.memoryUsage().heapTotal);
  } else if (configuration === "heapUsed") {
    callback(null, process.memoryUsage().heapUsed);
  } else {
    callback(new Error("Status key not found"));
  }
};

status.stop = (callback) => {
  global.server.close();
  setTimeout(() => {
    process.exit(0);
  }, 100);

  callback(null, global.nodeConfig);
};

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

  const file = path.join(__dirname, "../../", "distribution.js");
  const args = ["--config", serialize(newConfig)];

  fork(file, args);
};

module.exports = status;
