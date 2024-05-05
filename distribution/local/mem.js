const mapping = {
  subdirs: {},
};

const mem = {};

/**
 * Gets the folder specified by a directory path.
 *
 * @param {string[]} root - the directory path
 * @param {boolean} createDirs - whether or not to create directories along the traversal
 * @return {Array} - returns an (optional) error and the folder
 */
function traverseMapping(root, createDirs) {
  let error = undefined;
  let obj = mapping;

  for (let i = 0; i < root.length; i++) {
    obj = obj['subdirs'];

    if (obj[root[i]] === undefined) {
      if (createDirs) {
        // create the subdirectory and navigate to it
        obj[root[i]] = {
          subdirs: {},
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

/**
 * Gets a value from memory.
 *
 * @param {string} key - the key
 * @param {string[]} root - directory path
 * @param {Function} cb - an optional callback that accepts error, value
 */
mem.get = (key, root, cb) => {
  cb = cb || function (e, v) {};

  // add the group to root
  if (key !== null && typeof key === 'object') {
    root.push(key.gid);
    key = key.key;
  }

  // traverse the root
  [error, obj] = traverseMapping(root, true);
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

    let e = undefined;
    if (keys.length === 0) {
      let e = new Error('Error: no key found');
    }

    if (cb) {
      cb(e, keys);
    }
    return;
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

/**
 * Puts a key-value pair in memory.
 *
 * @param {*} value - the value
 * @param {string} key - the key
 * @param {string[]} root - directory path
 * @param {Function} cb - an optional callback that accepts error, value
 */
mem.put = (value, key, root, cb) => {
  cb = cb || function (e, v) {};
  // add the group to root
  if (key !== null && typeof key === 'object') {
    root.push(key.gid);
    key = key.key;
  }

  // traverse the root
  [error, obj] = traverseMapping(root, true);

  // add the key-value pair
  obj[key] = value;

  if (cb) {
    cb(undefined, value);
  }
};

/**
 * Deletes a key from memory.
 *
 * @param {string} key - the key
 * @param {string[]} root - directory path
 * @param {Function} cb - an optional callback that accepts error, value
 */
mem.del = (key, root, cb) => {
  cb = cb || function (e, v) {};
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
