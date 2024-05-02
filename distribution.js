#!/usr/bin/env node
const util = require("./distribution/util/util.js");
const args = require("yargs").argv;

// Default configuration
global.nodeConfig = global.nodeConfig || {
  ip: "127.0.0.1",
  port: 8080,
  onStart: () => {
    console.log("Node started!");
  },
};

/*
  As a debugging tool, you can pass ip and port arguments directly.
  This is just to allow for you to easily startup nodes from the terminal.

  Usage:
  ./distribution.js --ip '127.0.0.1' --port 1234
*/
if (args.ip) {
  global.nodeConfig.ip = args.ip;
}

if (args.port) {
  global.nodeConfig.port = parseInt(args.port);
}

if (args.config) {
  let nodeConfig = util.deserialize(args.config);
  global.nodeConfig.ip = nodeConfig.ip ? nodeConfig.ip : global.nodeConfig.ip;
  global.nodeConfig.port = nodeConfig.port
    ? nodeConfig.port
    : global.nodeConfig.port;
  global.nodeConfig.onStart = nodeConfig.onStart
    ? nodeConfig.onStart
    : global.nodeConfig.onStart;
}

// global dependencies
global.distribution = {};
global.distribution.url = require("url");
global.distribution.path = require("path");
global.distribution.fs = require("fs");
global.distribution.dir = __dirname;
global.distribution.http = require("http");
global.distribution.util = require("./distribution/util/util.js");
global.distribution.local = require("./distribution/local/local.js");
global.distribution.node = require("./distribution/local/node.js");
global.distribution.axios = require("axios");

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

// clear the vector database
console.log("Starting vectordb");
global.distribution.local.vecStore.init((e, v) => {
  if (e) {
    console.log(e);
  } else {
    console.log(v);
  }
});

// load word embeddings into memory
folderPath = "./distribution/util/glove_50d_split";
global.distribution.util.loadGloVeEmbeddings(folderPath, (e, v) => {
  if (e) {
    console.log(e);
  } else {
    console.log(v);
  }
});

/* The following code is run when distribution.js is run directly */
if (require.main === module) {
  distribution.node.start(global.nodeConfig.onStart);
}
