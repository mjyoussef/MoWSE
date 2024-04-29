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
global.distribution.accessToken = `eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIyZjMy
N2VkYmQ0MDMzMTdiOGQ1NDIzNTkzNWI2Njg1ZSIsImp0aSI6ImQ4YzJmNDI2ZDk2NzQxZTA
1ODIwYzFiYjA2NzlmZDU2OGQwODAzZWJmNTZiYzkxM2YzNmIxNzIxNTgzODY2Y2FmMDhlN2
I1NTNmMGFhM2EwIiwiaWF0IjoxNzEzNjc0MTUxLjI5Njc3LCJuYmYiOjE3MTM2NzQxNTEuM
jk2NzczLCJleHAiOjMzMjcwNTgyOTUxLjI5NTQ4Niwic3ViIjoiNzU0Nzc1NDIiLCJpc3Mi
OiJodHRwczovL21ldGEud2lraW1lZGlhLm9yZyIsInJhdGVsaW1pdCI6eyJyZXF1ZXN0c19
wZXJfdW5pdCI6NTAwMCwidW5pdCI6IkhPVVIifSwic2NvcGVzIjpbImJhc2ljIl19.gTe9K
AO72dLLO8i_ZdCV07PbqSexfcfckBt01i7cvOBNWeKny7QieA0m5KFq7sxjiweecd4FhdR1
nZMZbpBC7UMYAEX2AvCIIkI_tF_SBZHduHzjN5A2hmaMBbUahGOCHGwcyVSQ-WUq41T7rzk
8qWqhxZdOMIFVwLBvzRC56YUPA_tnHqa_Zrd9ENRlsTgT5Jta4l2smo1c5UZBPzBiPYYzNK
7CLE5xAv543s9ceFAqwP3USY2vw3udr_Ye-vtH5vQpoqeleZFC3sh80AOXI2rAgXy3-3lVw
Ze0Xn_LfGC0XsPIeYNBnCZZAisimlmB_iPS472abCCWPdntNXj37MdAu_vVabGyinLiDtAQ
ZaRA5Qj1IaoDg7RD_8k3xi1tkqGV3eRn_-e7r0n9mP-KDISfHWdWp2cm6qfovGEhGmxWp7b
IVUmaKkXSOvSmOEjC43IcEphRj-HQCWJb6DhxAlWdmLnek7FFCiabYyvjPJbtjzBCUSRDEO
-E0JgqmvsGGADBO0hFd7jOvYUT4V2kcWp1vvLx-5-fz8yPXUsZwePvYdWkTlrJYMsPHpYAh
1QtCZH83xYvQI3l84ZRq4jBRK57ksbkyPLUz77oIay2q_RmYDxLvJscsTpF21oJn8R7sQVg
exW5DaPTGR_AnqY5IVxYo6XPPQeApSVtlJbWVW4`

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
