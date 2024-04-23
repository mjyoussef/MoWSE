const readline = require('readline');
const distribution = require('../distribution');
embed = distribution.local.index.embed;
// const embedded_query = distribution.local.index.embed(key.key);
global.nodeConfig = { ip: "127.0.0.1", port: 7070 };
const id = distribution.util.id;

const groupsTemplate = require("../distribution/all/groups");

const crawlGroup = {};

let localServer = null;

const n1 = { ip: "127.0.0.1", port: 7110 };
const n2 = { ip: "127.0.0.1", port: 7111 };
const n3 = { ip: "127.0.0.1", port: 7112 };

crawlGroup[id.getSID(n1)] = n1;
crawlGroup[id.getSID(n2)] = n2;
crawlGroup[id.getSID(n3)] = n3;

d1 = {
  url: 'https://en.wikipedia.org/wiki/Rome', 
  vec: embed('This is about Rome'),
};
d2 = {
  url:'https://en.wikipedia.org/wiki/Ancient_Rome',
  vec: embed('This is about Ancient Rome'),
};
d3 = {
  url: 'https://en.wikipedia.org/wiki/Greece',
  vec: embed('This is about Greece'),
};
d4 = {
  url: 'https://en.wikipedia.org/wiki/Kingdom_of_Greece',
  vec: embed('This is about the Kingdom of Greece'),
};
d5 = {
  url: 'https://en.wikipedia.org/wiki/Pizza',
  vec: embed('This is about Pizza'),
};
d6 = {
  url: 'https://en.wikipedia.org/wiki/Brown_University',
  vec: embed('This is about Brown University'),
};
d7 = {
  url: 'https://en.wikipedia.org/wiki/Computer_science',
  vec: embed('This is about Computer Science'),
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion() {
  console.log('---------------------------------------------------------');
  rl.question('Enter a search query: ', (query) => {
    const vecStore = distribution.crawl.vecStore;
    if (query.toLowerCase() == 'halt') {
      rl.close();
      return;
    } else {
      vecStore.query(query.toLowerCase(), (e, v) => {
        if (e) {
          console.log(e);
        } else {
          console.log(v);
        }
        askQuestion();
      });
    }
  });
}

distribution.node.start((server) => {
  localServer = server;

  const crawlConfig = { gid: "crawl" };
  groupsTemplate(crawlConfig).put("crawl", crawlGroup, (e, v) => {
    distribution.crawl.vecStore.put(d1.url, d1.vec, (e, v) => {
      distribution.crawl.vecStore.put(d2.url, d2.vec, (e, v) => {
        distribution.crawl.vecStore.put(d3.url, d3.vec, (e, v) => {
          distribution.crawl.vecStore.put(d4.url, d4.vec, (e, v) => {
            distribution.crawl.vecStore.put(d5.url, d5.vec, (e, v) => {
              distribution.crawl.vecStore.put(d6.url, d6.vec, (e, v) => {
                distribution.crawl.vecStore.put(d7.url, d7.vec, (e, v) => {
                  askQuestion();
                });
              });
            });
          });
        });
      });
    });
  });
});