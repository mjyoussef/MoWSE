word2vec = {};

word2vec.encode = function(word, callback) {
  console.log('called word2vec.encode');
  const embeddings = global.distribution.embeddings;
  if (embeddings[word]) {
    callback(null, embeddings[word]);
  } else {
    callback(errors.New('Word not found'), null);
  }
}

module.exports = word2vec;
