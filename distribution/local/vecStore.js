// chroma server's URL
const chromaUrl = `http://localhost:${global.nodeConfig.chromaPort}`;

// create the client
const { ChromaClient } = require("chromadb");
global.chromaClient = new ChromaClient({ path: chromaUrl });

// default collection
const defaultCollection = "default";

// track buffer sizes for collections
global.chromaBufferSizes = {
  default: 0,
};

// max buffer size
global.maxBufferSize = 3000;

/**
 * Resets the database.
 *
 * @param {Function} callback - optional callback that accepts an error, value.
 */
async function reset(callback) {
  try {
    const sid = global.distribution.util.id.getSID(global.nodeConfig);

    // database files
    const dirPath = global.distribution.path.join(
      global.distribution.dir,
      `database/chroma_data/${sid}`
    );
    global.distribution.fsExtra.removeSync(dirPath);

    // logs
    const logPath = global.distribution.path.join(
      global.distribution.dir,
      `database/${sid}.log`
    );
    global.distribution.fsExtra.removeSync(logPath);

    callback(undefined, true);
  } catch (error) {
    callback(new Error(error.message), undefined);
  }
}

/**
 * Creates a new gid collection.
 *
 * @param {string} gid - the group ID
 * @param {Function} callback - optional callback that accepts an error, value.
 */
async function createGidCollection(gid, callback) {
  try {
    const collection = await chromaClient.getOrCreateCollection({
      name: gid,
      metadata: { "hnsw:space": "cosine" },
    });

    callback(undefined, collection);
  } catch (error) {
    callback(new Error(error.message), undefined);
  }
}

/**
 * Flushes documents in the buffer to the database.
 *
 * @param {string} gid - an optional group ID
 * @param {Function} callback - optional callback that accepts an error, value.
 */
async function flushBuffer(gid, callback) {
  if (!(gid in global.chromaBufferSizes)) {
    callback(undefined, 0);
    return;
  }

  const sid = global.distribution.util.id.getSID(global.nodeConfig);
  const logPath = global.distribution.path.join(
    global.distribution.dir,
    `${sid}.log`
  );

  global.distribution.fs.appendFileSync(
    logPath,
    `\nBuffer size: ${global.chromaBufferSizes[gid]}`,
    "utf8"
  );

  // get documents from memory
  global.distribution.local.mem.get(null, [gid], (e, documents) => {
    if (e) {
      callback(new Error(e.message), undefined);
      return;
    }

    // get each document's embedding
    const getPromises = [];
    documents.forEach((document) => {
      getPromises.push(
        new Promise((resolve, reject) => {
          global.distribution.local.mem.get(document, [gid], (e, embedding) => {
            if (e) {
              reject(e);
            } else {
              resolve([document, embedding]);
            }
          });
        })
      );
    });

    // wait for all promises to resolve
    Promise.all(getPromises)
      .then(async (entries) => {
        if (entries.length === 0) {
          global.chromaBufferSizes[gid] = 0;
          callback(undefined, entries.length);
          return;
        }

        const documents = [];
        const embeddings = [];

        entries.forEach((entry) => {
          documents.push(entry[0]);
          embeddings.push(entry[1]);
        });

        try {
          const collection = await chromaClient.getCollection({
            name: gid,
            metadata: { "hnsw:space": "cosine" },
          });

          await collection.upsert({
            ids: documents,
            embeddings: embeddings,
          });

          global.chromaBufferSizes[gid] = 0;
          callback(undefined, entries.length);
        } catch (error) {
          callback(new Error(error.message), undefined);
        }
      })
      .catch((error) => {
        callback(new Error(error.message), undefined);
      });
  });
}

/**
 * Puts a document's embedding. The document is temporarily buffered before
 * being added to the database to make use of batched operations.
 *
 * @param {number[]} embedding - the document's vector embedding.
 * @param {string} document - the ID of the document (ie. Wikipedia title).
 * @param {string} gid - an optional group ID.
 * @param {Function} callback - optional callback that accepts an error, value.
 */
async function put(embedding, document, gid, callback) {
  if (!gid) {
    gid = defaultCollection;
  }

  global.distribution.local.mem.put(
    embedding,
    document,
    [gid],
    async (e, v) => {
      if (e) {
        callback(new Error(e.message), undefined);
        return;
      }

      // update buffer size
      if (!(gid in global.chromaBufferSizes)) {
        global.chromaBufferSizes[gid] = 0;
      }
      global.chromaBufferSizes[gid] += 1;

      // flush the buffer if maxBufferSize is reached
      if (global.chromaBufferSizes[gid] >= global.maxBufferSize) {
        flushBuffer(gid, (e, v) => {
          if (e) {
            callback(new Error(e.message), undefined);
            return;
          }

          callback(undefined, true);
        });
      } else {
        // otherwise, return
        callback(undefined, true);
      }
    }
  );
}

/**
 * Returns the top-k closest embeddings.
 *
 * @param {number[]} embedding - a vector.
 * @param {string} gid - the group ID.
 * @param {number} k - choice of k.
 * @param {Function} callback - optional callback that accepts error, value.
 */
async function query(embedding, gid, k, callback) {
  try {
    if (!gid) {
      gid = defaultCollection;
    }

    const collection = await chromaClient.getCollection({
      name: gid,
      metadata: { "hnsw:space": "cosine" },
    });

    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: k,
    });

    callback(undefined, results);
  } catch (error) {
    callback(new Error(error.message), undefined);
  }
}

const vecStore = {};

vecStore.reset = reset;
vecStore.createGidCollection = createGidCollection;
vecStore.flushBuffer = flushBuffer;
vecStore.put = put;
vecStore.query = query;

module.exports = vecStore;
