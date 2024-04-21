// import * as lancedb from "vectordb";
// import { Schema, Field } from "apache-arrow";

async function init() {
  const lancedb = require("vectordb");
  global.distribution.vecStore = await lancedb.connect('vecStore');
  const schema = new Schema([
    new Field('url', new Utf8()),
  ]);
  args = { name: 'vecStore', schema }
  global.distribution.vecStore = await db.createTable(args);
}

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
  init: init,
  put: put,
  query: query
};
