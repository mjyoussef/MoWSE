const fs = require("fs");
const path = require("path");

const store = {};

/**
 * Returns the list of file names in a directory and optionally their content.
 *
 * @param {string[]} dirPath - the directory path
 * @param {Function} cb - an optional callback
 * @param {boolean} [includeValues=false] - whether to include the content (values) of the files
 */
function readFilesFromDirectory(dirPath, cb, includeValues = false) {
  cb = cb || function () {};

  // if the directory does not exist, return an error
  if (!fs.existsSync(dirPath)) {
    cb(new Error(`Local.store: directory does not exist`), undefined);
    return;
  }

  fs.readdir(dirPath, { withFileTypes: true }, (error, entries) => {
    // get files ONLY
    const files = entries
      .filter((entry) => entry.isFile())
      .map((file) => file.name);

    if (error) {
      // console.log('b1', error);
      cb(new Error(`Local.store: failed to read directory`), undefined);
      return;
    }

    const promises = [];
    for (let i = 0; i < files.length; i++) {
      promises.push(
        new Promise((resolve, reject) => {
          const name = path.basename(files[i], path.extname(files[i]));

          // if only collecting keys...
          if (!includeValues) {
            resolve(name);
            return;
          }

          // otherwise, get the values as well
          const filePath = path.join(dirPath, files[i]);
          fs.readFile(filePath, "utf-8", (error, data) => {
            if (error) {
              // console.log('b6', error);
              reject(error);
              return;
            }

            // collect lines in a list
            let v = data
              .split(/\r?\n/)
              .filter((line) => line.trim() !== "")
              .map((line) => global.distribution.util.deserialize(line));

            if (v.length === 1) {
              v = v[0];
            }

            const pair = {};
            pair[name] = v;
            resolve(pair);
          });
        })
      );
    }

    Promise.all(promises)
      .then((results) => {
        cb(undefined, results);
      })
      .catch((error) => {
        cb(
          new Error("Unexpected error from readFilesFromDirectory"),
          undefined
        );
      });
  });
}

/**
 * Checks if a directory exists.
 *
 * @param {string[]} root - the directory path
 * @param {string} gid - the group id
 */
store.checkdir = (root, gid) => {
  const temp = ["store", global.distribution.util.id.getSID(global.nodeConfig)];
  if (gid) {
    temp.push(gid);
  }
  const dirPath = path.join(global.distribution.dir, ...temp, ...root);
  return fs.existsSync(dirPath);
};

/**
 * Gets a value from storage.
 *
 * @param {string} key - the key
 * @param {string[]} root - the directory path
 * @param {Function} cb - an optional callback
 * @param {boolean} [includeValues=false] - whether to include the values if key = null
 */
store.get = (key, root, cb, includeValues = false) => {
  cb = cb || function () {};

  const temp = ["store", global.distribution.util.id.getSID(global.nodeConfig)];
  if (key !== null && key.hasOwnProperty("gid")) {
    temp.push(key.gid);
  }
  const dirPath = path.join(global.distribution.dir, ...temp, ...root);

  // if the key is null, return all of the keys
  if (key === null || (key.hasOwnProperty("key") && key.key === null)) {
    readFilesFromDirectory(dirPath, cb, includeValues);
    return;
  }

  // default behavior: get the data for a specific key
  let filePath = "";
  if (key.hasOwnProperty("key")) {
    filePath = path.join(dirPath, `${key.key}.txt`);
  } else {
    filePath = path.join(dirPath, `${key}.txt`);
  }

  // if the file doesn't exist, return an error
  if (!fs.existsSync(filePath)) {
    cb(new Error("Local.store.get: key does not exist"), undefined);
    return;
  }

  fs.readFile(filePath, "utf-8", (error, data) => {
    if (error) {
      cb(new Error("Local.store.get: failed to read file"), undefined);
      return;
    }

    // read the list of values and remove any empty lines
    let v = data
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "")
      .map((line) => global.distribution.util.deserialize(line));

    // if the length is zero, get rid of list
    if (v.length === 1) {
      v = v[0];
    }

    cb(undefined, v);
  });
};

/**
 * Puts a key-value pair in storage.
 *
 * @param {*} value - the value
 * @param {string} key - the key
 * @param {string[]} root - the directory path
 * @param {Function} cb - an optional callback
 */
store.put = (value, key, root, cb) => {
  cb = cb || function () {};

  const temp = ["store", global.distribution.util.id.getSID(global.nodeConfig)];
  if (key !== null && key.hasOwnProperty("gid")) {
    temp.push(key.gid);
  }
  // get the directory path
  let dirPath = path.join(global.distribution.dir, ...temp, ...root);

  // update the name of the key if it is for a group
  if (key !== null && typeof key === "object") {
    key = key.key;
  }

  // make the directory if it does not exist
  fs.mkdirSync(dirPath, { recursive: true });

  // append the file's name
  const filePath = path.join(dirPath, `${key}.txt`);

  // add the value to the end of the file (does not overwrite the existing key!)
  try {
    fs.appendFileSync(
      filePath,
      `${global.distribution.util.serialize(value)}\n`
    );
    cb(undefined, value);
  } catch (error) {
    console.log(error);
    cb(new Error(`Local.store.put: failed to write to file`), undefined);
  }
};

/**
 * Deletes a key from storage.
 *
 * @param {string} key - the key
 * @param {string[]} root - the directory path
 * @param {Function} cb - an optional callback
 */
store.del = (key, root, cb) => {
  cb = cb || function () {};

  const temp = ["store", global.distribution.util.id.getSID(global.nodeConfig)];
  if (key !== null && key.hasOwnProperty("gid")) {
    temp.push(key.gid);
  }
  // get the directory path
  const dirPath = path.join(global.distribution.dir, ...temp, ...root);

  // add key.gid if the key is for a group
  if (typeof key === "object") {
    key = key.key;
  }

  const filePath = path.join(dirPath, `${key}.txt`);

  // check if the file exists; if not, returned undefined
  // result
  if (!fs.existsSync(filePath)) {
    cb(undefined, undefined);
    return;
  }

  // read the value (for the callback)
  fs.readFile(filePath, "utf-8", (error, data) => {
    if (error) {
      cb(new Error("Local.store.del: failed to read file"), undefined);
      return;
    }

    // read the list of values and remove any empty lines
    let v = data
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "")
      .map((line) => global.distribution.util.deserialize(line));

    // if the length is zero, get rid of list
    if (v.length === 1) {
      v = v[0];
    }

    // unlink the file
    fs.unlink(filePath, (error) => {
      if (error) {
        // console.log('b5', error);
        cb(new Error(`Local.store.del: failed to unlink`), undefined);
        return;
      }
      cb(undefined, v);
    });
  });
};

module.exports = store;
