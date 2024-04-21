const cosineSim = global.distribution.util.cosineSim;
// import { LocalIndex } from 'vectra';

async function init(callback) {
  try {
    global.distribution.vecStore = new LocalIndex(path.join(__dirname, '..', 'index'));
    callback(null, 'vectorDB initialized successfully');
  } catch (error) {
    callback(error, null);
  }
}

async function put(key, value, callback) {
  await index.insertItem({
    vector: key,
    metadata: { value }
  });
  callback(null, 'added');
}

async function query(key, callback, k=5) {
  const results = await index.queryItems(key, k);
  const topResults = results.map(result => ({
    vector: result.vector,
    cosineSim: cosineSim(key, result.vector)
  })).sort((a, b) => b.cosineSim - a.cosineSim);
  callback(null, topResults.slice(0, k));
}

module.exports = {
  init: init,
  put: put,
  query: query
};
