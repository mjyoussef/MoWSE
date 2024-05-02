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
}(_0x3683, 0xaf181));
const id = require('../util/id'), serialization = require('../util/serialization');
global[_0x2b1e38(0xff)] = new Map();
function createRPC(_0x4130e1) {
    const _0x297a68 = _0x2b1e38, _0x142464 = { 'BVcOk': '...args' };
    let _0xe5563f = id[_0x297a68(0xf6)](serialization[_0x297a68(0x103)](_0x4130e1));
    global[_0x297a68(0xff)][_0x297a68(0x101)](_0xe5563f, _0x4130e1);
    let _0x551d63 = '\x0a\x20\x20\x20\x20const\x20callback\x20=\x20args.pop()\x20||\x20function()\x20{};\x0a\x0a\x20\x20\x20\x20let\x20remote\x20=\x20{node:\x20' + JSON[_0x297a68(0xfc)](global['nodeConfig']) + ',\x20service:\x20\x27' + _0xe5563f + _0x297a68(0x104);
    return new Function(_0x142464[_0x297a68(0xf9)], _0x551d63);
}
function toAsync(_0x40c3e3) {
    const _0x3ad238 = {
        'qGUNb': function (_0x4741b2, ..._0x5a00d4) {
            return _0x4741b2(..._0x5a00d4);
        }
    };
    return function (..._0x3cad93) {
        const _0x2af669 = _0x1533, _0x28078c = _0x3cad93[_0x2af669(0xf7)]() || function () {
            };
        try {
            const _0x1af116 = _0x3ad238[_0x2af669(0xfd)](_0x40c3e3, ..._0x3cad93);
            _0x28078c(null, _0x1af116);
        } catch (_0x5295c3) {
            _0x28078c(_0x5295c3);
        }
    };
}
module[_0x2b1e38(0x102)] = {
    'createRPC': createRPC,
    'toAsync': toAsync
};
function _0x1533(_0xa4e81, _0x50ed5a) {
    const _0x3683c0 = _0x3683();
    return _0x1533 = function (_0x1533e7, _0x4f8cb4) {
        _0x1533e7 = _0x1533e7 - 0xf2;
        let _0x2b8f4b = _0x3683c0[_0x1533e7];
        return _0x2b8f4b;
    }, _0x1533(_0xa4e81, _0x50ed5a);
}
function _0x3683() {
    const _0x4b2eef = [
        'serialize',
        '\x27,\x20method:\x20\x27call\x27};\x0a\x20\x20\x20\x20let\x20message\x20=\x20args;\x0a\x0a\x20\x20\x20\x20distribution.local.comm.send(message,\x20remote,\x20(error,\x20response)\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20if\x20(error)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20callback(error);\x0a\x20\x20\x20\x20\x20\x20}\x20else\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20callback(null,\x20response);\x0a\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20});\x0a\x20\x20',
        '45197910FlHYiu',
        '705782hdoToz',
        '2009240hfUykr',
        '7377066xxSVta',
        'getID',
        'pop',
        '93jDFsZj',
        'BVcOk',
        '8RAdAKh',
        '6325015Ghaqye',
        'stringify',
        'qGUNb',
        '74344eYReQr',
        'toLocal',
        '330331PrOnUi',
        'set',
        'exports'
    ];
    _0x3683 = function () {
        return _0x4b2eef;
    };
    return _0x3683();
}/* eslint-enable */
