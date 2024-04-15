const util = global.distribution.util;

// mapping mimicks a filesystem
// each "level" of mapping has a dedicated 'subdirs' field
// that stores subdirectories
const mapping = {
  'subdirs': {},
};

const mem = {};

function traverseMapping(root, createDirs) {
  let error = undefined;
  let obj = mapping;

  for (let i=0; i<root.length; i++) {
    obj = obj['subdirs'];

    if (obj[root[i]] === undefined) {
      if (createDirs) {
        // create the subdirectory and navigate to it
        obj[root[i]] = {
          'subdirs': {},
        };
        obj = obj[root[i]];
      } else {
        // otherwise, return an error
        error = new Error(`Error from local.mem: invalid root`);
        break;
      }
    } else {
      obj = obj[root[i]];
    }
  }

  return [error, obj];
}

mem.get = (key, root, cb) => {
  // add the group to root
  if (key !== null && typeof key === 'object') {
    root.push(key.gid);
    key = key.key;
  }

  // traverse the root
  [error, obj] = traverseMapping(root);
  if (error) {
    if (cb) {
      cb(error, undefined);
    }
    return;
  }

  // if the key is null, return all keys
  if (key === null) {
    const keys = Object.keys(obj).filter((key) => {
      return key !== 'subdirs';
    });

    if (cb) {
      cb(undefined, keys);
    }
  }

  // default behavior: fetch the value associated w/ the key
  let e = undefined;
  const v = obj[key];

  if (v === undefined) {
    e = new Error(`Error from local.mem.store: could not find key`);
  }

  if (cb) {
    cb(e, v);
  }
};

mem.put = (value, key, root, cb) => {
  // add the group to root
  if (key !== null && typeof key === 'object') {
    root.push(key.gid);
    key = key.key;
  }

  // traverse the root (impossible to return an error w/ createDirs = true)
  [error, obj] = traverseMapping(root, true);

  // add the key-value pair
  obj[key] = value;

  if (cb) {
    cb(undefined, value);
  }
};

mem.del = (key, root, cb) => {
  // add the group to root
  if (key !== null && typeof key === 'object') {
    root.push(key.gid);
    key = key.key;
  }

  // traverse the root
  [error, obj] = traverseMapping(root);
  if (error) {
    if (cb) {
      cb(error, undefined);
    }
    return;
  }

  let v = obj[key];
  delete obj[key];

  if (cb) {
    cb(undefined, v);
  }
};

module.exports = mem;
