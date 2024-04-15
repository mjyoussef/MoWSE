const fs = global.distribution.fs;
const path = global.distribution.path;
const util = global.distribution.util;
const dir = global.distribution.dir;

const store = {};

function readFilesFromDirectory(dirPath, cb) {
  // if the directory does not exist, return an error
  if (!fs.existsSync(dirPath)) {
    if (cb) {
      cb(new Error(`Error from local.store: directory does not exist`), undefined);
    }
    return;
  }

  fs.readdir(dirPath, {withFileTypes: true}, (error, entries) => {
    // get files ONLY (not subdirectories)
    const files = entries.filter((entry) => entry.isFile()).map((file) => file.name);
    let e = undefined;
    let v = undefined;

    if (error) {
      e = new Error(`Error from local.store: failed to read directory`);
    } else {
      v = files.map((file) => {
        return path.basename(file, path.extname(file));
      });
    }

    if (cb) {
      cb(e, v);
    }
  });
}

store.get = (key, root, cb) => {
  const dirPath = path.join(dir, root);

  // if the key is null, return all of the keys
  if (key === null) {
    readFilesFromDirectory(dirPath, cb);
    return;
  }

  // return all keys for a specific group
  if (typeof key === 'object' && key.hasOwnProperty('gid') && key.key === null) {
    // each group is stored under a directory
    const gidDir = path.join(dirPath, key.gid);
    readFilesFromDirectory(gidDir, cb);
    return;
  }

  // default behavior: get the data for a specific key
  let filePath = '';
  if (typeof key === 'object') {
    filePath = path.join(dirPath, key.gid, `${key.key}.txt`);
  } else {
    filePath = path.join(dirPath, `${key}.txt`);
  }

  fs.readFile(filePath, 'utf-8', (err, data) => {
    let e = undefined;
    let v = undefined;

    if (err) {
      e = new Error(`Error from local.store.get: failed to read file`);
    } else {
      v = util.deserialize(data);
    }

    if (cb) {
      cb(e, v);
    }
  });
};

store.put = (value, key, directory, cb) => {
  // use the value's hash if the key is null
  key = key === null ? util.id.getID(value) : key;

  // if the key is for a specific group, update the group's keys
  if (key.hasOwnProperty('gid')) {
    // get the keys for key.gid
    let keys = [];
    if (gidMapping.has(key.gid)) {
      keys = gidMapping.get(key.gid);
    }

    // replace the old key
    let filteredKeys = keys.filter((elt) => elt !== key.key);
    filteredKeys.push(key.key);
    gidMapping.set(key.gid, filteredKeys);
  }

  // if the key is an object, use its hash
  key = typeof key === 'object' ? util.id.getID(key) : key;

  // make the directory if it does not exist
  const dirPath = path.join(dir, directory);
  fs.mkdirSync(dirPath, {recursive: true});

  // serialize and write value
  const data = util.serialize(value);
  const filePath = path.join(dirPath, `${key}.txt`);
  fs.writeFile(filePath, data, (error) => {
    let e = undefined;
    let v = undefined;
    if (error) {
      e = new Error(`Error from local.store.put: problem writing to ${filePath}`);
    } else {
      v = value;
    }

    if (cb) {
      cb(e, v);
    }
  });
};

store.del = (key, directory, cb) => {
  // remove from group if applicable
  if (key.hasOwnProperty('gid')) {
    if (gidMapping.has(key.gid)) {
      const filteredValues =
        gidMapping.get(key.gid).filter((elt) => elt !== key.key);
      gidMapping.set(key.gid, filteredValues);
    }
  }

  // we need to retrieve the value before deleting it, so we can
  // pass it into the callback function; to this, pass a delete callback
  // to store.get
  store.get(key, (e, value) => {
    if (e) {
      if (cb) {
        cb(e, undefined);
      }
      return;
    }

    // if the key is an object, use its hash
    const hashedKey = typeof key === 'object' ? util.id.getID(key) : key;
    const filePath = path.join(dir, directory, `${hashedKey}.txt`);

    // delete the file (errors if it does not exist)
    fs.unlink(filePath, (error) => {
      let e = undefined;
      let v = undefined;
      if (error) {
        e = new Error(`Error unlinking ${filePath} in store.del`);
      } else {
        v = value;
      }

      if (cb) {
        cb(e, v);
      }
    });
  });
};

module.exports = store;
