global.nodeConfig = {ip: '127.0.0.1', port: 8080};
const distribution = require('../distribution');
const id = distribution.util.id;

const groupsTemplate = require('../distribution/all/groups');
const mygroupGroup = {};

jest.useFakeTimers('legacy')

/*
   This hack is necessary since we can not
   gracefully stop the local listening node.
   This is because the process that node is
   running in is the actual jest process
*/
let localServer = null;

beforeAll((done) => {
  const n1 = {ip: '127.0.0.1', port: 8000};
  const n2 = {ip: '127.0.0.1', port: 8001};
  const n3 = {ip: '127.0.0.1', port: 8002};

  // First, stop the nodes if they are running
  let remote = {service: 'status', method: 'stop'};
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {});
    });
  });

  mygroupGroup[id.getSID(n1)] = n1;
  mygroupGroup[id.getSID(n2)] = n2;
  mygroupGroup[id.getSID(n3)] = n3;

  // Now, start the base listening node
  distribution.node.start((server) => {
    localServer = server;
    // Now, start the nodes
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, (e, v) => {
          jest.setTimeout(5 * 60 * 1000);
          groupsTemplate({gid: 'mygroup'}).put(
              'mygroup',
              mygroupGroup,
              (e, v) => {
                done();
              },
          );
        });
      });
    });
  });
});

afterAll((done) => {
  distribution.mygroup.status.stop((e, v) => {
    const nodeToSpawn = {ip: '127.0.0.1', port: 8008};
    let remote = {node: nodeToSpawn, service: 'status', method: 'stop'};
    distribution.local.comm.send([], remote, (e, v) => {
      localServer.close();
      done();
    });
  });
});

// test('all routes test', (done) => {
//   const newService = {};
//   newService.mult = (arg1, arg2) => {
//     return arg1 * arg2;
//   };

//   distribution.mygroup.routes.put(newService, 'mult', (e, v) => {
//     const n1 = {ip: '127.0.0.1', port: 8000};
//     const n2 = {ip: '127.0.0.1', port: 8001};
//     const n3 = {ip: '127.0.0.1', port: 8002};
//     const r1 = {node: n1, service: 'routes', method: 'get'};
//     const r2 = {node: n2, service: 'routes', method: 'get'};
//     const r3 = {node: n3, service: 'routes', method: 'get'};

//     distribution.local.comm.send(['mult'], r1, (e, v) => {
//       expect(e).toBeFalsy();
//       expect(v.mult(2, 4)).toEqual(8);
//       distribution.local.comm.send(['mult'], r2, (e, v) => {
//         expect(e).toBeFalsy();
//         expect(v.mult(10, 10)).toEqual(100);
//         distribution.local.comm.send(['mult'], r3, (e, v) => {
//           expect(e).toBeFalsy();
//           expect(v.mult(-5, 4)).toEqual(-20);
//           done();
//         });
//       });
//     });
//   });
// });

// test('all status test', (done) => {
//   const nids = Object.values(mygroupGroup).map((node) => id.getNID(node));

//   distribution.mygroup.status.get('heapUsed', (e, v) => {
//     expect(e).toEqual({});
//     expect(Object.values(v).length).toBe(nids.length);
//     done();
//   });
// });

// test('status check heaptotal', (done) => {
//   distribution.mygroup.status.get('heapTotal', (e, v) => {
//     // console.log(e);
//     // console.log(v);
//     expect(e).toEqual({});
//     expect(v).toBeGreaterThan(100000);
//     done();
//   });
// });

// test('all groups test', (done) => {
//   distribution.mygroup.groups.get('random', (e, v) => {
//     Object.keys(mygroupGroup).forEach((sid) => {
//       expect(e[sid]).toBeDefined();
//       expect(e[sid]).toBeInstanceOf(Error);
//     });
//     expect(v).toEqual({});
//     done();
//   });
// });

// test('all send test', (done) => {
//   const sids = Object.values(mygroupGroup).map((node) => id.getSID(node));
//   const remote = {service: 'status', method: 'get'};
//   distribution.mygroup.comm.send(['sid'], remote, (e, v) => {
//     expect(e).toEqual({});
//     expect(Object.values(v).length).toBe(sids.length);
//     expect(Object.values(v)).toEqual(expect.arrayContaining(sids));
//     done();
//   });
// });

// test('all gossip test', (done) => {
//   distribution.mygroup.groups.put('newgroup', {}, (e, v) => {
//     let newNode = {ip: '127.0.0.1', port: 4444};
//     let message = ['newgroup', newNode];

//     let remote = {service: 'groups', method: 'add'};
//     distribution.mygroup.gossip.send(message, remote, (e, v) => {
//       distribution.mygroup.groups.get('newgroup', (e, v) => {
//         let count = 0;
//         for (const k in v) {
//           if (Object.keys(v[k]).length > 0) {
//             count++;
//           }
//         }
//         /* Gossip only provides weak guarantees */
//         expect(count).toEqual(3);
//         done();
//       });
//     });
//   });
// });


test('embedding test', (done) => {
  jest.setTimeout(1000 * 60 * 10);
  const n1 = {ip: '127.0.0.1', port: 8000};
  const n2 = {ip: '127.0.0.1', port: 8001};
  const n3 ={ip: '127.0.0.1', port: 8002};
  const r1 = {node: n1, service: 'word2vec', method: 'encode'};
  const r2 = {node: n2, service: 'word2vec', method: 'encode'};
  const r3 = {node: n3, service: 'word2vec', method: 'encode'};

  console.log(Object.keys(distribution.mygroup));

  distribution.local.comm.send(['the'], r1, (e, v) => {
    expect(v[0]).toEqual(0.418);
    distribution.local.comm.send(['the'], r2, (e, v) => {
      expect(v[0]).toEqual(0.418);
      distribution.local.comm.send(['the'], r3, (e, v) => {
        expect(v[0]).toEqual(0.418);
        done();
      });
    });
  });
});