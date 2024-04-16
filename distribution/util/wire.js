const id = require('./id');
const serialization = require('./serialization');

global.toLocal = new Map();

function createRPC(func) {
  // Write some code...
  // To add support for generating RPC stubs, add a function createRPC
  // into utils. Given a function f, the createRPC(f) function returns
  // a new function g that when called from any actor it will:

  // 1. serialize arguments and send them to the node where f resides,
  // 2. calls f on that node, passing the deserialized arguments to f upon call,
  // 3. serializes ret value + send it back to node issuing the call to g, and
  // 4. pass the results to g's caller.

  const config = global.nodeConfig;
  const funcId = id.getID(serialization.serialize(func));
  global.toLocal.set(funcId, func);

  // return rpc stub
  const stub = (...args) => {
    const message = args.slice(0, -1);
    const callback = args.slice(-1)[0];
    const remote = {node: config, service: funcId, method: 'call'};

    distribution.local.comm.send(message, remote, (e, v) => {
      if (e) {
        callback(e);
      } else {
        callback(null, v);
      }
    });
  };

  const serializedStub = serialization.serialize(stub)
      .replace('config', `{ip: '${config.ip}', port: ${config.port}}`)
      .replace('funcId', `'${funcId}'`);

  return serialization.deserialize(serializedStub);
}

function toAsync(func) {
  return function(...args) {
    const callback = args.pop() || function() {};
    try {
      const result = func(...args);
      callback(null, result);
    } catch (error) {
      callback(error);
    }
  };
}

module.exports = {
  createRPC: createRPC,
  toAsync: toAsync,
};
