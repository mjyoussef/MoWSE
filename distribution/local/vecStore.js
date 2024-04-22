const cosineSim = global.distribution.util.cosineSim;
const db = require('vectordb');
const ip = global.nodeConfig.ip;
const port = global.nodeConfig.port;

async function init(callback) {
  try {
    const local_db = await db.connect(`${ip}:${port}/vectordb`);
    global.distribution.vecStore = await local_db.createTable("vecStore", [{
      vector: Array.from({length: 50}, () => 0.0),
      url: "",
    }], { writeMode: db.WriteMode.Overwrite });
    callback(null, 'vectorDB initialized successfully');
  } catch (error) {
    callback(error, null);
  }
}

async function put(key, value, callback) {
  const local_db = await db.connect(`${ip}:${port}/vectordb`);
  names = await local_db.tableNames();
  if (!names.includes('vecStore')) {
    global.distribution.vecStore = await local_db.createTable("vecStore", [{
      vector: key,
      url: value.key,
    }], { writeMode: db.WriteMode.Overwrite });
    callback(null, 'added');
  } else {
    // comment out when fully distributed
    global.distribution.vecStore = await local_db.openTable("vecStore");
    await global.distribution.vecStore.add([{
      vector: key,
      url: value.key,
    }]);
    callback(null, 'added');
    return;
  }
}

async function query(key, callback, k=5) {
  // comment out when fully distributed
  const local_db = await db.connect(`${ip}:${port}/vectordb`);
  global.distribution.vecStore = await local_db.openTable("vecStore");
  const results = await global.distribution.vecStore.search(key.key).limit(key.k).execute();
  let topResults = results.map(result => ({
    url: result.url,
    cosineSim: cosineSim(key.key, result.vector)
  })).sort((a, b) => a.cosineSim - b.cosineSim);
  topResults = topResults.reverse();
  const top = topResults.slice(0, key.k);
  if (callback) {
    callback(null, top);
  }
  return;
}

module.exports = {
  init: init,
  put: put,
  query: query,
};
