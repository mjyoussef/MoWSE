const index = {};

/**
 * Computes an embedding for a list of groups of words. Each group
 * has an optional weight assigned to it.
 *
 * @param {Array[]} inputs - list of groups of words (each group has an optional weight)
 * @param {Function} callback - optional callback that accepts an error, value
 * @param {boolean} [tfidf=false] - whether to weight words using tf-idf scores
 * @return {Array} - a vector embedding
 */

function embed(inputs, callback, tfidf = false) {
  // GloVe embeddings
  let model = global.distribution.embeddings;

  // filter out stop words and words not in the embedding corpus
  let stopwords = new Set(global.distribution.stopwords);
  inputs = inputs.map((group) => {
    let newGroup = [];
    for (let i = 0; i < group.length - 1; i++) {
      const word = group[i];
      if (!(word in stopWords) && word in model) {
        newGroup.push(word);
      }
    }

    // add the group weight
    newGroup.push(group[group.length - 1]);

    return newGroup;
  });

  // update the number of documents in this node
  if (!global.tfidf) {
    global.tfidf = {
      numDocuments: 0,
      numDocumentsContainingWord: {},
    };
  }

  global.tfidf.numDocuments += 1;

  // count the frequency w/ which each word occurs in the document
  const wordFrequenciesWithGroupWeight = {};
  let documentSize = 0;
  inputs.forEach((group) => {
    // last element is the weighting for the group! (don't need this)
    for (let i = 0; i < group.length - 1; i++) {
      // update the frequency of this word in the document
      const word = group[i];
      const groupWeightAndFreq = wordFrequenciesWithGroupWeight[word] || {
        groupWeight: group[group.length - 1],
        freq: 0,
      };
      groupWeightAndFreq.freq += 1;
      wordFrequenciesWithGroupWeight[word] = groupWeightAndFreq;

      // update the number of documents
      documentSize += 1;

      // update the number of documents containing the word (used for IDF scores)
      if (tfidf) {
        if (!wordFrequenciesWithGroupWeight.hasOwnProperty(word)) {
          if (!global.tfidf.numDocumentsContainingWord[word]) {
            global.tfidf.numDocumentsContainingWord[word] = 0;
          }
          global.tfidf.numDocumentsContainingWord[word] += 1;
        }
      }
    }
  });

  // Now, we need to generate the unnormalized weights for each word
  const unnormalizedWeights = {};
  let maxWeight = 0;
  inputs.forEach((group) => {
    let groupWeight = group[group.length - 1]; // weight is the last elt in the array

    group.forEach((word) => {
      let tf = wordFrequenciesWithGroupWeight[word] / documentSize;
      let idf = 1;

      if (tfidf) {
        idf = Math.log(
          global.tfidf.numDocuments /
            (1 + global.tfidf.numDocumentsContainingWord[word])
        );
      }

      let groupWeight = wordFrequenciesWithGroupWeight[word].groupWeight;

      unnormalizedWeights[word] = tf * idf * groupWeight;
      maxWeight = Math.max(maxWeight, unnormalizedWeights[word]);
    });
  });

  // now, we need to normalize the weights for each word and compute
  // the embedding
  let sum = Array.from({ length: 50 }, () => 0.0);
  for (const word in Object.keys(unnormalizedWeights)) {
    const normalizedWeight = unnormalizedWeights[word] / maxWeight;

    const embedding = model[word];
    for (let i = 0; i < embedding.length; i++) {
      sum[i] += embedding[i] / documentSize;
    }
  }

  if (callback) {
    callback(undefind, sum);
  }

  return sum;
}

index.embed = embed;

module.exports = index;
