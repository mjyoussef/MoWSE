const lancedb = require("vectordb");
const uri = 'vecStore';
const db = await lancedb.connect(uri);

const schema = new Schema([
  new Field('url', new Utf8()),
]);

global.distribution.vecStore = await db.createTable({ name: 'vecStore', schema });

async function put(key, value, callback) {
  const newData = { vector: key, url: value};
  await global.distribution.vecStore.add([newData]);
  callback(null, 'added');
}

async function query(key, callback, k=5) {
  const results = await global.distribution.vecStore.search(key).limit(k).execute();
  callback(null, results);
}

module.exports = {
  put: put,
  query: query
};
