const serialization = require("./serialization");
const id = require("./id");
const wire = require("./wire");
const embedUtils = require("./embed");

module.exports = {
  serialize: serialization.serialize,
  deserialize: serialization.deserialize,
  id: id,
  wire: wire,
  embed: embedUtils.embed,
  loadGloVeEmbeddings: embedUtils.loadGloVeEmbeddings,
};
