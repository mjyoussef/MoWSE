#!/usr/bin/env node
const util = require("./distribution/util/util.js");
const args = require("yargs").argv;
const axios = require("axios");
const { spawn, execSync } = require("child_process");

// Default configuration
global.nodeConfig = global.nodeConfig || {
  ip: "127.0.0.1",
  port: 8000,
  chromaPort: 9000,
  persist: false,
  onStart: () => {
    console.log("Node started!");
  },
};

/*
  As a debugging tool, you can pass ip and port arguments directly.
  This is just to allow for you to easily startup nodes from the terminal.

  Usage:
  ./distribution.js --ip '127.0.0.1' --port 1234 --chromaPort 7777 --persist
*/
if (args.ip) {
  global.nodeConfig.ip = args.ip;
}

if (args.port) {
  global.nodeConfig.port = parseInt(args.port);
}

if (args.chromaPort) {
  global.nodeConfig.chromaPort = parseInt(args.chromaPort);
}

if (args.persist) {
  global.nodeConfig.persist = true;
}

if (args.config) {
  let nodeConfig = util.deserialize(args.config);
  global.nodeConfig.ip = nodeConfig.ip ? nodeConfig.ip : global.nodeConfig.ip;
  global.nodeConfig.port = nodeConfig.port
    ? nodeConfig.port
    : global.nodeConfig.port;
  global.nodeConfig.chromaPort = nodeConfig.chromaPort
    ? nodeConfig.chromaPort
    : global.nodeConfig.chromaPort;

  global.nodeConfig.persist = nodeConfig.persist
    ? nodeConfig.persist
    : global.nodeConfig.persist;

  global.nodeConfig.onStart = nodeConfig.onStart
    ? nodeConfig.onStart
    : global.nodeConfig.onStart;
}

// global dependencies
global.distribution = {};
global.distribution.url = require("url");
global.distribution.path = require("path");
global.distribution.fs = require("fs");
global.distribution.fsExtra = require("fs-extra");
global.distribution.dir = __dirname;
global.distribution.http = require("http");
global.distribution.axios = require("axios");
global.distribution.util = require("./distribution/util/util.js");
global.distribution.local = require("./distribution/local/local.js");
global.distribution.node = require("./distribution/local/node.js");

// all group (initialized by default)
global.distribution["all"] = {};
global.distribution["all"].status = require("./distribution/all/status.js")({
  gid: "all",
});
global.distribution["all"].comm = require("./distribution/all/comm.js")({
  gid: "all",
});
global.distribution["all"].groups = require("./distribution/all/groups.js")({
  gid: "all",
});
global.distribution["all"].routes = require("./distribution/all/routes.js")({
  gid: "all",
});
global.distribution["all"].mem = require("./distribution/all/mem.js")({
  gid: "all",
});
global.distribution["all"].store = require("./distribution/all/store.js")({
  gid: "all",
});

global.distribution["all"].vecStore = require("./distribution/all/vecStore.js")(
  {
    gid: "all",
  }
);

// templates (used when creating new groups)
global.distribution.commTemplate = require("./distribution/all/comm.js");
global.distribution.groupsTemplate = require("./distribution/all/groups.js");
global.distribution.statusTemplate = require("./distribution/all/status.js");
global.distribution.routesTemplate = require("./distribution/all/routes.js");
global.distribution.memTemplate = require("./distribution/all/mem.js");
global.distribution.storeTemplate = require("./distribution/all/store.js");
global.distribution.mrTemplate = require("./distribution/all/mr.js");
global.distribution.vecStoreTemplate = require("./distribution/all/vecStore.js");

// access token (store in a Secrets Manager in the future)
global.distribution.accessToken =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJhNjI5ODVhMjRkNGMxZmZlYzVjYTZhNjZmZDkwZWJhYSIsImp0aSI6IjczMTAzYmFlM2JmZDJlOTczODc0OTNhZmVmZDRjMGRjZjlkN2E4MjFjNTRjYThkNGEwYTIzZTY1ODllOGFhYTU3ZTM3MzYzNDYxNzY4MmYwIiwiaWF0IjoxNzE0MTAwMzgzLjYxMDYyNCwibmJmIjoxNzE0MTAwMzgzLjYxMDYyOCwiZXhwIjozMzI3MTAwOTE4My42MDkwNiwic3ViIjoiNzU1MTY3MDkiLCJpc3MiOiJodHRwczovL21ldGEud2lraW1lZGlhLm9yZyIsInJhdGVsaW1pdCI6eyJyZXF1ZXN0c19wZXJfdW5pdCI6NTAwMCwidW5pdCI6IkhPVVIifSwic2NvcGVzIjpbImJhc2ljIl19.hAVb14lkul0BW8a8kLh6ZqUyk2kAo9veyTFOxmWQq0D8xYwyhx0of3ZpqFdt-EuXY0x34hHYydU84k-1dmEEB0e2IWhQVc65oi5CCwSBpL9oa3_9KQTuW7ubaR8AXC4yIrnGqrPcjhdQPwUwZkG8R3jdwgDhgRF5uyDEdgKfH35gHMRcryiaITH9PrbwWVm1AEaaAWYu3EftrBlYfxjWC19UwmSv0F8KSDY2uAT4o6QlyE-Re8WEbk6nbs1aW13A3U6eykyeeWFQoS4PsJX9DRvD9UvpYxirsedMrD0H5eHoeCPiO9lfZjdfpC0gx_fgbkM_ZN7_D1t7YD9O67U4NkyHnjogfFivQx29QCDBhmt-m4aGKsWx3Axky3XbdjftcBVhQUgpeXuokI71egBZfjXYQnZy48biyTYlymaGa8tBESD2OMn_BydnTvzadbkdEe_t6IIWNm_AMv9btxIGpnVsjZ3FwcnXy-fd5gzBr2C-Dajm5lz2GtZ-uMmvi2PIJSV7Gw5yKVgrr5x0ghs0b54_xC2VMvV_V16PjQK0KTe_mlc1FfyhM7amjkZh1FHCbXX03IMgtGavUBhC3CDC5GzKjOP2A49caTUHm4V6X9DMinG6kv1YxeVHfy5WEgAQl2QbTRHxq_XeOIJTT_vY8s9Bbjga4CYV4NqQLtjS5aU";

module.exports = global.distribution;

let sid = global.distribution.util.id.getSID(global.nodeConfig);

// example url: http://localhost:9000/api/v1
// example response: {"nanosecond heartbeat":1714773622287886000}
async function pingChroma(url) {
  try {
    const response = await axios.get(url);

    // check the status code
    const sc = response.statusCode;
    if (sc < 200 || sc >= 300) {
      return false;
    }

    // make sure the ping was successful
    const responseBody = response.data;
    if ("nanosecond heartbeat" in responseBody) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

async function launchChromaServer(callback) {
  console.log("Launching Chroma server...");
  chromaProcess = spawn("chroma", [
    "run",
    "--port",
    global.nodeConfig.chromaPort.toString(),
    "--path",
    `database/chroma_data/${sid}`,
    "--log-path",
    `database/${sid}.log`,
  ]);

  const sleep = async (timeout) => {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, timeout);
    });
  };

  let success = false;

  while (!success) {
    try {
      success = await pingChroma(
        `http://localhost:${global.nodeConfig.chromaPort}/api/v1`
      );
      await sleep(100); // wait 100 milliseconds before pinging again
    } catch (error) {
      callback(new Error(error.message), undefined);
    }
  }

  callback(undefined, true);
}

console.log("Loading GloVe word embeddings...");
global.distribution.util.loadGloVeEmbeddings(
  "./distribution/util/glove_50d_test",
  (e, v) => {
    if (e) {
      console.log(e);
      return;
    } else {
      console.log("Successfully loaded GloVe word embeddings!");

      const launchChroma = (e, v) => {
        if (e) {
          console.log("Failed to reset database: ", e);
          return;
        }

        // terminate any conflicting Chroma server
        try {
          const result = execSync(
            `./kill_chroma.sh ${global.nodeConfig.chromaPort}`,
            {
              encoding: "utf8",
            }
          );
          console.log(result);

          launchChromaServer((e, v) => {
            if (e) {
              console.log(e);
              return;
            } else {
              console.log("Successfully launched Chroma server!");
              distribution.node.start(global.nodeConfig.onStart);
            }
          });
        } catch (error) {
          console.log(error);
          return;
        }
      };

      if (global.nodeConfig.persist) {
        launchChroma(undefined, undefined);
        return;
      }

      console.log(global.nodeConfig.persist);

      // if not persisting, clear database files (if they exists)
      global.distribution.local.vecStore.reset(launchChroma);
    }
  }
);
