global.nodeConfig = {ip: '127.0.0.1', port: 8080};
const { expect } = require('@jest/globals');
const distribution = require('../distribution');
const id = distribution.util.id;

const groupsTemplate = require('../distribution/all/groups');

afterEach(() => {
  jest.useRealTimers();
});

// This group is used for testing most of the functionality
const mygroupGroup = {};


/*
   This hack is necessary since we can not
   gracefully stop the local listening node.
   This is because the process that node is
   running in is the actual jest process
*/
let localServer = null;

const n1 = {ip: '127.0.0.1', port: 8000};
const n2 = {ip: '127.0.0.1', port: 8001};
const n3 = {ip: '127.0.0.1', port: 8002};

jest.setTimeout(1000*60*10)

beforeAll((done) => {
  // First, stop the nodes if they are running
  let remote = {service: 'status', method: 'stop'};

  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
      });
    });
  });

  mygroupGroup[id.getSID(n1)] = n1;
  mygroupGroup[id.getSID(n2)] = n2;
  mygroupGroup[id.getSID(n3)] = n3;

  // Now, start the base listening node
  distribution.node.start((server) => {
    localServer = server;

    const groupInstantiation = (e, v) => {
      const mygroupConfig = {gid: 'mygroup'};

      // Create some groups
      groupsTemplate(mygroupConfig).put('mygroup', mygroupGroup, (e, v) => {
        done();
      });
    };

    // Start the nodes
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, groupInstantiation);
      });
    });
  });
}, 1000*60*2);

afterAll((done) => {
  distribution.mygroup.status.stop((e, v) => {
    let remote = {service: 'status', method: 'stop'};
    remote.node = n1;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n2;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n3;
        distribution.local.comm.send([], remote, (e, v) => {
          done()
        });
      });
    });
  });
});

test('all.comm.send(index.embed(text))', (done) => {
  const remote = {service: 'index', method: 'embed'};
  const text = 'The quick brown fox jumps over the lazy dog';

  distribution.mygroup.comm.send([text], remote, (e, v) => {
    try {
      expect(e).toEqual({});
      results = [];
      keys = Object.keys(v);
      for (let i = 0; i < keys.length; i++) {
        results.push(v[keys[i]]);
      }
      expect(results[0].sort()).toEqual(results[1].sort());
      expect(results[0].sort()).toEqual(results[2].sort());
      done();
    } catch (error) {
      done(error);
    }
  });
});
