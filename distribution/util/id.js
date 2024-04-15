var crypto = require('crypto');
var serialization = require('../util/serialization');

// The ID is the SHA256 hash of the JSON representation of the object
function getID(obj) {
  const hash = crypto.createHash('sha256');
  hash.update(serialization.serialize(obj));
  return hash.digest('hex');
}

// The NID is the SHA256 hash of the JSON representation of the node
function getNID(node) {
  const hash = crypto.createHash('sha256');
  hash.update(serialization.serialize(node));
  const x = hash.digest('hex');
  return x;
}

// The SID is the first 5 characters of the NID
function getSID(node) {
  return getNID(node).substring(0, 5);
}

// used for hash function
function idToNum(id) {
  let n = parseInt(id, 16);
  assert(!isNaN(n), 'idToNum: id is not in KID form!');
  return n;
}

// naive hash function
function naiveHash(kid, nids) {
  nids.sort();
  return nids[idToNum(kid) % nids.length];
}

// consistent hash function
function consistentHash(kid, nids) {
  let lst = [[idToNum(kid), kid]];
  for (let i=0; i<nids.length; i++) {
    lst.push([idToNum(nids[i]), nids[i]]);
  }

  lst.sort((e1, e2) => {
    return e1[0] - e2[0];
  });

  for (let i=0; i<lst.length; i++) {
    if (lst[i][1] === kid) {
      let next = i+1;
      if (next === lst.length) {
        next = 0;
      }
      return lst[next][1];
    }
  }
}

// rendezvous hash function
function rendezvousHash(kid, nids) {
  let lst = [];
  for (let i=0; i<nids.length; i++) {
    const concatenation = kid + nids[i];
    const hash = getID(concatenation);
    lst.push([idToNum(hash), nids[i]]);
  }

  lst.sort((e1, e2) => {
    return e1[0] - e2[0];
  });

  console.log(lst);
  return lst[lst.length-1][1];
}


module.exports = {
  getNID: getNID,
  getSID: getSID,
  getID: getID,
  idToNum: idToNum,
  naiveHash: naiveHash,
  consistentHash: consistentHash,
  rendezvousHash: rendezvousHash,
};