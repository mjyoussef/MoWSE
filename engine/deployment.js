const ip = "127.0.0.1"; // gotta change to be the public ip address
let basePort = 7110;
global.nodeConfig = { ip: ip, port: basePort };
const distribution = require("../../distribution");



distribution.node.start((server) => {

});
