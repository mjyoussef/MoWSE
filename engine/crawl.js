const https = require("https");
const { JSDOM } = require("jsdom");
const { URL } = require("url");

global.nodeConfig = { ip: "127.0.0.1", port: 7070 };
const distribution = require("../distribution");
const id = distribution.util.id;

const groupsTemplate = require("../distribution/all/groups");

const crawlGroup = {};

let localServer = null;

/*
    The local node will be the orchestrator.
*/

const n1 = { ip: "127.0.0.1", port: 7110 };
const n2 = { ip: "127.0.0.1", port: 7111 };
const n3 = { ip: "127.0.0.1", port: 7112 };

////////////////
// BEFORE ALL //
////////////////

/* Stop the nodes if they are running */

crawlGroup[id.getSID(n1)] = n1;
crawlGroup[id.getSID(n2)] = n2;
crawlGroup[id.getSID(n3)] = n3;

const startNodes = (cb) => {
  distribution.local.status.spawn(n1, (e, v) => {
    distribution.local.status.spawn(n2, (e, v) => {
      distribution.local.status.spawn(n3, (e, v) => {
        cb();
      });
    });
  });
};

////////////
// CRAWL  //
////////////

const crawl_map = (key, value) => {
  return new Promise((resolve, reject) => {
    https
      .get(key, (response) => {
        let html = "";
        response.on("data", (chunk) => {
          html += chunk;
        });

        response.on("end", () => {
          const dom = new JSDOM(html);
          const document = dom.window.document;
          const paragraphs = document.querySelectorAll("p");
          paragraphs.forEach((paragraph) => {
            const paragraphHtml = paragraph.innerHTML;
            const matches = paragraphHtml.match(/href=["'](\/wiki\/.*?)["']/gi);
            if (matches) {
              matches.forEach((match) => {
                const href = match.replace('href="', "").replace('"', "");
                const url = new URL(href, baseURL).toString();
                // Ignore URLs containing '&' or '#'
                if (!url.includes("&") && !url.includes("#")) {
                  urlSet.add(url);
                }
              });
            }
          });

          resolve(urlSet);
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};

const crawl_reduce = (key, values) => {
  return new Promise((resolve, reject) => {
    

  });
};

//////////////
// Workflow //
//////////////

distribution.node.start((server) => {
  localServer = server;

  const crawlConfig = { gid: "crawl" };
  startNodes(() => {
    groupsTemplate(crawlConfig).put("dlib", crawlGroup, (e, v) => {
      ///////////////
      // AFTER ALL //
      ///////////////

      let remote = { service: "status", method: "stop" };
      remote.node = n1;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n2;
        distribution.local.comm.send([], remote, (e, v) => {
          remote.node = n3;
          distribution.local.comm.send([], remote, (e, v) => {
            localServer.close();
          });
        });
      });
    });
  });
});
