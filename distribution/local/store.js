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
        // remove the extension from the file
        return path.basename(file, path.extname(file));
      });
    }

    if (cb) {
      cb(e, v);
    }
  });
}

store.get = (key, root, cb) => {
  const dirPath = path.join(dir, ...root);

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

store.put = (value, key, root, cb) => {
  // get the directory path
  let dirPath = path.join(dir, ...root);

  // add key.gid if the key is for a group
  if (key !== null && typeof key === 'object') {
    dirPath = path.join(dirPath, key.gid);
    key = key.key;
  }

  // make the directory if it does not exist
  fs.mkdirSync(dirPath, {recursive: true});

  // use hash of value as key if the input key is undefined
  key = key === null ? util.id.getID(value) : key;

  // append the file's name
  const filePath = path.join(dirPath, `${key}.txt`);

  // write to the file (overwrite existing key if needed)
  fs.writeFile(filePath, util.serialize(value), (error) => {
    let e = undefined;
    let v = undefined;

    if (error) {
      e = new Error(`Error from local.store.put: failed to write to file`);
    } else {
      v = value;
    }

    if (cb) {
      cb(e, v);
    }
  });
};

store.del = (key, root, cb) => {
  // get the directory path
  let dirPath = path.join(dir, ...root);

  // add key.gid if the key is for a group
  if (typeof key === 'object') {
    dirPath = path.join(dirPath, key.gid);
    key = key.key;
  }

  const filePath = path.join(dirPath, `${key}.txt`);

  // check if the file exists
  if (!fs.existsSync(filePath)) {
    if (cb) {
      cb(undefined, undefined);
    }
    return;
  }

  // read the value (for the callback)
  fs.readFile(filePath, (error, data) => {
    let e = undefined;
    let v = undefined;
    if (error) {
      e = new Error(`Error from local.store.del: failed to read file`);
    } else {
      v = util.deserialize(data);

      // unlink (ie. remove) the file
      fs.unlink(filePath, (error) => {
        if (error) {
          e = new Error(`Error from local.store.del: failed to unlink`);
          v = undefined;
        }

        if (cb) {
          cb(e, v);
        }
      });
    }
  });
};

module.exports = store;
