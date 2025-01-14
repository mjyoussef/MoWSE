global.nodeConfig = {ip: '127.0.0.1', port: 7070};
const distribution = require('../distribution');
const id = distribution.util.id;

const groupsTemplate = require('../distribution/all/groups');

const ncdcGroup = {};
const dlibGroup = {};

/*
   This hack is necessary since we can not
   gracefully stop the local listening node.
   The process that node is
   running in is the actual jest process
*/
let localServer = null;

/*
    The local node will be the orchestrator.
*/

const n1 = {ip: '127.0.0.1', port: 7110};
const n2 = {ip: '127.0.0.1', port: 7111};
const n3 = {ip: '127.0.0.1', port: 7112};

beforeAll((done) => {
  /* Stop the nodes if they are running */

  ncdcGroup[id.getSID(n1)] = n1;
  ncdcGroup[id.getSID(n2)] = n2;
  ncdcGroup[id.getSID(n3)] = n3;

  dlibGroup[id.getSID(n1)] = n1;
  dlibGroup[id.getSID(n2)] = n2;
  dlibGroup[id.getSID(n3)] = n3;

  const startNodes = (cb) => {
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, (e, v) => {
          cb();
        });
      });
    });
  };

  distribution.node.start((server) => {
    localServer = server;

    const ncdcConfig = {gid: 'ncdc'};
    startNodes(() => {
      groupsTemplate(ncdcConfig).put('ncdc', ncdcGroup, (e, v) => {
        const dlibConfig = {gid: 'dlib'};
        groupsTemplate(dlibConfig).put('dlib', dlibGroup, (e, v) => {
          done();
        });
      });
    });
  });
}, 1000*60*2);

afterAll((done) => {
  let remote = {service: 'status', method: 'stop'};
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        localServer.close();
        done();
      });
    });
  });
});

// function for clearing 'store' directory
function deleteFilesSynchronously() {
  const path = global.distribution.path;
  const fs = global.distribution.fs;
  const directory = path.join(global.distribution.dir, 'store');
  try {
    // Read all files and directories in the specified directory
    const files = fs.readdirSync(directory);

    for (const file of files) {
      // Construct full path to the file or directory
      const fullPath = path.join(directory, file);

      // Skip .gitignore in the root directory
      if (file === '.gitignore' && fullPath === path.join(directory, '.gitignore')) {
        continue;
      }

      // Check if the path is a directory or a file
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Recursively delete directories
        fs.rmSync(fullPath, {recursive: true, force: true});
      } else {
        // Delete files
        fs.unlinkSync(fullPath);
      }
    }
  } catch (err) {
    console.error('Failed to delete:', err);
  }
}

beforeEach(() => {
  // make sure the store directory is empty
  deleteFilesSynchronously();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---all.mr---

test('(25 pts) all.mr:ncdc', (done) => {
  let m1 = (key, value) => {
    return new Promise((resolve, reject) => {
      let words = value.split(/(\s+)/).filter((e) => e !== ' ');
      let out = {};
      out[words[1]] = parseInt(words[3]);
      resolve(out);
    });
  };

  let r1 = (key, values) => {
    return new Promise((resolve, reject) => {
      let out = {};
      out[key] = values.reduce((a, b) => Math.max(a, b), -Infinity);
      resolve(out);
    });
  };

  let dataset = [
    {'000': '006701199099999 1950 0515070049999999N9 +0000 1+9999'},
    {'106': '004301199099999 1950 0515120049999999N9 +0022 1+9999'},
    {'212': '004301199099999 1950 0515180049999999N9 -0011 1+9999'},
    {'318': '004301265099999 1949 0324120040500001N9 +0111 1+9999'},
    {'424': '004301265099999 1949 0324180040500001N9 +0078 1+9999'},
  ];

  let expected = [{'1950': 22}, {'1949': 111}];

  /* Sanity check: map and reduce locally */
  // sanityCheck(m1, r1, dataset, expected, done);

  /* Now we do the same thing but on the cluster */
  const doMapReduce = (cb) => {
    distribution.ncdc.mr.exec({mrid: 'ncdc-mr', mapFn: m1, reduceFn: r1}, (e, v) => {
      expect(e).toBeFalsy();
      expect(v).toEqual(expect.arrayContaining(expected));
      done();
    });
  };

  let cntr = 0;

  // We send the dataset to the cluster
  dataset.forEach((o) => {
    let key = Object.keys(o)[0];
    let value = o[key];
    distribution.ncdc.store.put(value, key, (e, v) => {
      cntr++;
      if (cntr === dataset.length) {
        doMapReduce();
      }
    }, ['ncdc-mr', 'map']);
  });
});

test('(25 pts) all.mr:dlib', (done) => {
  let m2 = (key, value) => {
    // map each word to a key-value pair like {word: 1}
    return new Promise((resolve, reject) => {
      let words = value.split(/(\s+)/).filter((e) => e !== ' ');
      let out = [];
      words.forEach((w) => {
        let o = {};
        o[w] = 1;
        out.push(o);
      });
      resolve(out);
    });
  };

  let r2 = (key, values) => {
    return new Promise((resolve, reject) => {
      let out = {};
      out[key] = values.length;
      resolve(out);
    });
  };

  let dataset = [
    {'b1-l1': 'It was the best of times, it was the worst of times,'},
    {'b1-l2': 'it was the age of wisdom, it was the age of foolishness,'},
    {'b1-l3': 'it was the epoch of belief, it was the epoch of incredulity,'},
    {'b1-l4': 'it was the season of Light, it was the season of Darkness,'},
    {'b1-l5': 'it was the spring of hope, it was the winter of despair,'},
  ];

  let expected = [
    {It: 1}, {was: 10},
    {the: 10}, {best: 1},
    {of: 10}, {'times,': 2},
    {it: 9}, {worst: 1},
    {age: 2}, {'wisdom,': 1},
    {'foolishness,': 1}, {epoch: 2},
    {'belief,': 1}, {'incredulity,': 1},
    {season: 2}, {'Light,': 1},
    {'Darkness,': 1}, {spring: 1},
    {'hope,': 1}, {winter: 1},
    {'despair,': 1},
  ];

  /* Sanity check: map and reduce locally */
  // sanityCheck(m2, r2, dataset, expected, done);

  const doMapReduce = (cb) => {
    distribution.dlib.mr.exec({mrid: 'dlib-mr', mapFn: m2, reduceFn: r2}, (e, v) => {
      expect(e).toBeFalsy();
      expect(v).toEqual(expect.arrayContaining(expected));
      done();
    });
  };

  let cntr = 0;

  // We send the dataset to the cluster
  dataset.forEach((o) => {
    let key = Object.keys(o)[0];
    let value = o[key];
    distribution.dlib.store.put(value, key, (e, v) => {
      cntr++;
      if (cntr === dataset.length) {
        doMapReduce();
      }
    }, ['dlib-mr', 'map']);
  });
});
