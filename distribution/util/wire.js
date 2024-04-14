const id = require("./id");

// const local = global.distribution.local;

function createRPC(func) {
  const funcName = id.getID(func);
  // throw new Error(funcName);
  const newService = {
    call: (...args) => {
      func(...args);
    },
  };

  distribution.local.routes.put(newService, funcName, (e, v) => {});

  function stub(...args) {
    const params = [...args];
    const cb = params.pop();

    let remote = {
      node: global.config,
      service: funcName,
      method: "call",
    };

    distribution.local.comm.send(params, remote, cb);
  }

  return stub;
}

function toAsync(func) {
  return function (...args) {
    const callback = args.pop() || function () {};
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
