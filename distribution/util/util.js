const serialization = require('./serialization');
const id = require('./id');
const fs = require('fs');
const path = require('path');
const wire = require('./wire');

function loadGloVeEmbeddings(folderPath, callback) {
  console.log('Loading GloVe embeddings...');
  try {
    const embeddings = {};
    const tfidf = {};
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
          tfidf[word] = 0;
        }
      });
    });
    global.distribution.embeddings = embeddings;
    global.distribution.tfidf = tfidf;
    global.distribution.documents = 0;
    stopwords = './distribution/util/stop.txt'
    global.distribution.stopwords = fs.readFileSync(stopwords, 'utf8');
    callback(null, 'Successfully loaded GloVe embeddings');
  } catch (err) {
    callback(err, null);
  }
}

function cosineSim(vector1, vector2) {
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    magnitude1 += Math.pow(vector1[i], 2);
    magnitude2 += Math.pow(vector2[i], 2);
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  return dotProduct / (magnitude1 * magnitude2);
};

module.exports = {
  serialize: serialization.serialize,
  deserialize: serialization.deserialize,
  id: id,
  wire: wire,
  loadGloVeEmbeddings: loadGloVeEmbeddings,
  calculateCosineSimilarity: cosineSim,
};
