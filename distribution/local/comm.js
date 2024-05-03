const http = require("http");
const serialization = require("../util/serialization");

const comm = {};

/**
 * Invokes a service / method on a node.
 *
 * @param {Array} message - list of arguments
 * @param {Object} remote - contains address, service, and method names
 * @param {Function} cb - optional callback that accepts error, value
 */
comm.send = (message, remote, cb) => {
  cb = cb || function (e, v) {};

  var remoteService = undefined;
  var remoteMethod = undefined;
  var remoteNode = undefined;
  try {
    remoteService = remote.service;
    remoteMethod = remote.method;
    remoteNode = remote.node;
  } catch (error) {
    if (cb) {
      cb(error, undefined);
    }
    return;
  }

  if (
    remoteService === undefined ||
    remoteMethod === undefined ||
    remoteNode === undefined
  ) {
    const e = new Error("remote node is invalid");
    if (cb) {
      cb(e, undefined);
    }
    return;
  }

  const data = global.distribution.util.serialize(message);

  const options = {
    method: "PUT",
    host: remoteNode.ip,
    port: remoteNode.port,
    path: `/${remoteService}/${remoteMethod}`,
  };

  const req = http.request(options, (res) => {
    let responseData = "";

    if (res.statusCode >= 400) {
      const e = new Error(`error sending message: ${res.statusCode}`);
      cb(e, undefined);
      return;
    }

    res.on("data", (chunk) => {
      responseData += chunk.toString();
    });

    res.on("end", () => {
      // Handle the response data
      // console.log(responseData);
      const deserializedData =
        global.distribution.util.deserialize(responseData);
      if (deserializedData instanceof Error) {
        cb(deserializedData, undefined);
        return;
      }

      cb(...deserializedData);
    });
  });

  req.on("error", (error) => {
    // Handle errors
    if (cb) {
      cb(new Error(error.message), undefined);
    }
  });

  req.write(data);
  req.end();
};

module.exports = comm;
