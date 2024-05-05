const EventEmitter = require("events");

global.emitter = new EventEmitter();

global.nodeConfig = {
  ip: "127.0.0.1",
  port: 8000,
  chromaPort: 9000,
  onStart: () => {
    global.emitter.emit("ready", true);
  },
};

const distribution = require("./distribution");

// global.emitter.on("ready", (status) => {
//   console.log("Node started!");
//   global.distribution.local.vecStore.put(
//     [0.1, 0.2, 0.0, 1.0, -3.0],
//     "Computer Science",
//     undefined,
//     (e, v) => {
//       console.log(e, v);
//       global.distribution.local.vecStore.query(
//         [0.1, 0.2, 0.0, 0.0, 2.0],
//         undefined,
//         3,
//         (e, v) => {
//           console.log(e, v);
//         }
//       );
//     }
//   );
// });

const crypto = require("crypto");

function generateRandomString(length) {
  return crypto
    .randomBytes(length)
    .toString("base64") // convert bytes to base64
    .slice(0, length) // get the first N characters
    .replace(/\+/g, "0") // replace "+" to get URL-safe characters
    .replace(/\//g, "0"); // replace "/" to get URL-safe characters
}

global.emitter.on("ready", async (status) => {
  console.log("Node started!");
  // global.distribution.local.vecStore.createGidCollection(
  //   "gid",
  //   async (e, v) => {
  //     console.log(e, v);
  //     try {
  //       let out = await chromaClient.createCollection({
  //         name: "gid",
  //         metadata: { "hnsw:space": "cosine" },
  //       });
  //       console.log(out);
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   }
  // );

  global.distribution.local.vecStore.getOrCreateGidCollection(
    "gid",
    async (e, v) => {
      console.log(v);
      if (e) {
        console.log(e);
        return;
      }

      const title = generateRandomString(8);
      const embedding = [];
      for (let i = 0; i < 10; i++) {
        embedding.push(Math.random());
      }

      global.distribution.local.vecStore.put(
        embedding,
        title,
        "gid",
        (e, v) => {
          console.log(e, v);
        }
      );
    }
  );
});
