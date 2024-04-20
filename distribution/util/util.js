const serialization = require('./serialization');
const id = require('./id');
const wire = require('./wire');

function loadGloVeEmbeddings(folderPath, callback) {
  console.log('Loading GloVe embeddings...');
  try {
    const embeddings = {};
    const files = fs.readdirSync(folderPath);
    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      const data = fs.readFileSync(filePath, 'utf8');
      const lines = data.split('\n');
      lines.forEach((line) => {
        const parts = line.split(' ');
        const word = parts[0];
        const embedding = parts.slice(1).map(parseFloat);
        if (!embeddings[word]) {
          embeddings[word] = embedding;
        } else {
          for (let i = 0; i < embedding.length; i++) {
            embeddings[word][i] = (embeddings[word][i] + embedding[i]) / 2;
          }
        }
      });
    });
    global.distribution.embeddings = embeddings;
    callback(null, 'Successfully loaded GloVe embeddings');
  } catch (err) {
    callback(err, null);
  }
}

module.exports = {
  serialize: serialization.serialize,
  deserialize: serialization.deserialize,
  id: id,
  wire: wire,
  loadGloVeEmbeddings: loadGloVeEmbeddings,
};
