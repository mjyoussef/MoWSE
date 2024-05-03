const assert = require("assert");
var crypto = require("crypto");

// The ID is the SHA256 hash of the JSON representation of the object
function getID(obj) {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(obj));
  return hash.digest("hex");
}

// The NID is the SHA256 hash of the JSON representation of the node
function getNID(node) {
  node = { ip: node.ip, port: node.port };
  return getID(node);
}

// The SID is the first 5 characters of the NID
function getSID(node) {
  return getNID(node).substring(0, 5);
}

function idToNum(id) {
  let n = parseInt(id, 16);
  assert(!isNaN(n), "idToNum: id is not in KID form!");
  return n;
}

function naiveHash(kid, nids) {
  nids.sort();
  return nids[idToNum(kid) % nids.length];
}

function consistentHash(kid, nids) {
  const kidNum = idToNum(kid);
  const nidNums = nids.map((item) => {
    return idToNum(item);
  });

  nidNums.push(kidNum);

  const idsAndIdxs = nidNums.map((value, index) => ({ value, index }));
  idsAndIdxs.sort((a, b) => a.value - b.value);

  const matchingIdx = idsAndIdxs.findIndex((element) => {
    return element.value === kidNum;
  });

  const nodeIdx = (matchingIdx + 1) % nidNums.length;
  const matchingNode = idsAndIdxs[nodeIdx];

  return nids[matchingNode.index];
}

function rendezvousHash(kid, nids) {
  // console.log(nids);
  const combined = nids.map((nid) => kid + nid);
  const hashed = combined.map((value) => idToNum(getID(value)));
  const idsAndIdxs = hashed.map((value, index) => ({ value, index }));

  idsAndIdxs.sort((a, b) => b.value - a.value);

  const maxNumIndex = idsAndIdxs[0].index;

  return nids[maxNumIndex];
}

module.exports = {
  getNID: getNID,
  getSID: getSID,
  getID: getID,
  idToNum: idToNum,
  naiveHash: naiveHash,
  consistentHash: consistentHash,
  rendezvousHash: rendezvousHash,
}; /* eslint-enable */
