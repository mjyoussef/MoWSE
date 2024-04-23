global.nodeConfig = { ip: "127.0.0.1", port: 7070 };
const distribution = require("../distribution");

const n1 = { ip: "127.0.0.1", port: 7110 };
const n2 = { ip: "127.0.0.1", port: 7111 };
const n3 = { ip: "127.0.0.1", port: 7112 };

const cleanup = (e, v, cb) => {
  let remote = { service: "status", method: "stop" };
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        // remote.node = localNode;
        // distribution.local.comm.send([], remote, (e, v) => {
        console.log("CLOSED ALL NODES", e, v);
        cb(e, v);
        // });
      });
    });
  });
};

distribution.node.start((server) => {
  cleanup(null, null, (e, v) => {
    server.close();
  });
});
