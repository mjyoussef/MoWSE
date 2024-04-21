const {Writable, Transform} = require('stream');
const axios = require('axios');
const {parse} = require('node-html-parser');

function fetchHTML(url) {
  return axios({
    url,
    method: 'GET',
    responseType: 'stream',
  }).then((response) => response.data);
}

global.coordinator = undefined;
global.crawlLimit = 0;
global.crawlCounter = 0;

let embedStream = undefined;
let urlStream = undefined;

const crawler = {};

crawler.open = (coordinator, gid, hash, cb) => {
  cb = cb || function(e, v) {};
  // initialize the coordinator
  global.coordinator = coordinator;

  // initialize the embedStream
  embedStream = new Transform({
    objectMode: true,
    transform(text, encoding, callback) {
      // TODO: split the text into words and generate an embedding

      global.crawlCounter += 1;
    },
  });

  // initialize the urlStream
  urlStream = new Writable({
    objectMode: true,
    write(baseURL, encoding, callback) {
      callback = callback || function(error) {};
      let rawData = '';

      fetchHTML(baseURL).then((htmlStream) => {
        htmlStream.on('data', (chunk) => {
          rawData += chunk.toString();
        });

        htmlStream.on('end', (chunk) => {
          // convert to HTML
          const root = parse(rawData);

          // get the text
          const text = root.textContent;

          // pipe into the next stream
          embedDocument.write({type: 'text', content: text});

          global.distribution.local.groups.get(gid, (e, nodes) => {
            if (e) {
              callback(new Error('Failed to get nodes from group'));
              return;
            }

            const links = root.querySelectorAll('a');
            const nidMapping = {};

            links.forEach((link) => {
              const href = link.getAttribute('href');
              const url = new URL(href, baseURL).toString();
              const urlID = global.distribution.util.id.getID(url);
              const nid = global.distribution.util[hash](urlID, Object.keys(nodes));
              const nidURLs = nidMapping[nid] || [];
              nidURLs.push(url);
              nidMapping[nid] = nidURLs;
            });

            const urlPromises = [];
            for (const [nid, nidURLs] in nidMapping) {
              urlPromises.push(new Promise((resolve, reject) => {
                const remote = {
                  node: nodes[nid],
                  service: 'crawl',
                  method: 'write',
                };
                global.distribution.local.comm.send([nidURLs], remote, (e, v) => {
                  if (e) {
                    reject(e);
                  } else {
                    resolve(v);
                  }
                });
              }));
            }

            Promise.all(urlPromises).then((results) => {
              callback();
            }).catch((error) => {
              callback(new Error('Failed to forward extracted URLs'));
            });
          });
        });
      });
    },
  });

  // call the callback to `open`
  cb(undefined, true);
};

crawler.end = (cb) => {
  cb = cb || function(e, v) {};
  if (!embedStream || !urlStream) { // already ended
    cb(undefined, true);
  }
  embedStream.end(() => {
    urlStream.end(() => {
      embedStream = undefined;
      urlStream = undefined;
      cb(undefined, true);
    });
  });
};

crawler.write = (urls, cb) => {
  cb = cb || function(e, v) {};

  const writePromises = [];
  for (const url in urls) {
    writePromises.push(new Promise((resolve, reject) => {
      urlStream.write(url, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      });
    }));
  }

  Promise.all(writePromises).then((results) => {
    cb(undefined, true);
  }).catch((error) => {
    cb(new Error('Failed write for at least one URL'), undefined);
  });
};

crawler.track = (cb) => {
  cb = cb || function(e, v) {};
  // coordinator regularly polls this method to see if the crawlLimit has been
  // met, and gracefully stops all the nodes if so
  cb(undefined, global.crawlLimit);
};
