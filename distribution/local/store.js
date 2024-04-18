const fs = require("fs");
const path = require("path");
const util = global.distribution.util;
const dir = global.distribution.dir;

const store = {};

function readFilesFromDirectory(
  dirPath,
  cb,
  includeValues = false,
  directories = false
) {
  // if the directory does not exist, return an error
  if (!fs.existsSync(dirPath)) {
    if (cb) {
      cb(
        new Error(`Error from local.store: directory does not exist`),
        undefined
      );
    }
    return;
  }

  fs.readdir(dirPath, { withFileTypes: true }, (error, entries) => {
    // get files or directories (depending on whether `directories` is true)
    const files = entries
      .filter((entry) => {
        if (directories) {
          return entry.isDirectory();
        } else {
          return entry.isFile();
        }
      })
      .map((file) => file.name);

    let e = undefined;
    let v = undefined;

    if (error) {
      e = new Error(`Error from local.store: failed to read directory`);
    } else {
      const promises = [];
      for (let i = 0; i < files.length; i++) {
        promises.push(
          new Promise((resolve, reject) => {
            let name = directories
              ? files[i]
              : path.basename(files[i], path.extname(files[i]));

            // if only collecting keys
            if (!includeValues) {
              resolve(name);
            } else {
              // otherwise, add a key-value pair
              let filePath = path.join(dirPath, files[i]);
              fs.readFile(filePath, "utf-8", (error, data) => {
                if (error) {
                  reject(error);
                } else {
                  let pair = {};
                  pair[name] = util.deserialize(data);
                  resolve(pair);
                }
              });
            }
          })
        );
      }

      Promise.all(promises)
        .then((results) => {
          cb(undefined, results);
        })
        .catch((error) => {
          // console.log(global.distribution.util.id.getSID(global.nodeConfig), error);
          cb(
            new Error("Unexpected error from readFilesFromDirectory"),
            undefined
          );
        });
    }
  });
}

store.checkdir = (root, gid) => {
  const temp = ["store", util.id.getSID(global.nodeConfig)];
  if (gid) {
    temp.push(gid);
  }
  root = [...temp, ...root];
  const dirPath = path.join(dir, ...root);
  return fs.existsSync(dirPath);
};

store.get = (key, root, cb, includeValues = false, directories = false) => {
  const temp = ["store", util.id.getSID(global.nodeConfig)];
  if (key !== null && key.hasOwnProperty("gid")) {
    temp.push(key.gid);
  }
  root = [...temp, ...root];
  const dirPath = path.join(dir, ...root);

  console.log("STORE GET", dirPath, dir, root);

  // if the key is null, return all of the keys
  if (key === null || (key.hasOwnProperty("key") && key.key === null)) {
    readFilesFromDirectory(dirPath, cb, includeValues, directories);
    return;
  }

  // default behavior: get the data for a specific key
  let filePath = "";
  if (key.hasOwnProperty("key")) {
    filePath = path.join(dirPath, `${key.key}.txt`);
  } else {
    filePath = path.join(dirPath, `${key}.txt`);
  }

  fs.readFile(filePath, "utf-8", (err, data) => {
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
  const temp = ["store", util.id.getSID(global.nodeConfig)];
  if (key !== null && key.hasOwnProperty("gid")) {
    temp.push(key.gid);
  }

  console.log("store put root", root);
  root = [...temp, ...root];
  // get the directory path
  let dirPath = path.join(dir, ...root);

  console.log("STORE PUT", dirPath, dir, root);

  // add key.gid if the key is for a group
  if (key !== null && typeof key === "object") {
    key = key.key;
  }

  // make the directory if it does not exist
  fs.mkdirSync(dirPath, { recursive: true });

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
  const temp = ["store", util.id.getSID(global.nodeConfig)];
  if (key !== null && key.hasOwnProperty("gid")) {
    temp.push(key.gid);
  }
  root = [...temp, ...root];
  // get the directory path
  let dirPath = path.join(dir, ...root);

  // add key.gid if the key is for a group
  if (typeof key === "object") {
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
  fs.readFile(filePath, "utf-8", (error, data) => {
    let e = undefined;
    let v = undefined;
    if (error) {
      e = new Error(`Error from local.store.del: failed to read file`);
      if (cb) {
        cb(e, undefined);
      }
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
