const local = global.distribution.local;
const util = global.distribution.util;

function sendToNode(gid, hash, nodes, root, method, key, optionalArgs, cb) {
    const kid = util.id.getID(key);
    const nid = hash(kid, Object.keys(nodes));

    // arguments
    const args = optionalArgs || [];
    args.push({
        key: key,
        gid: gid,
    });
    args.push(root);

    // remote
    const remote = {
        node: nodes[nid],
        service: 'mem',
        method: method,
    }

    local.comm.send(args, remote, cb);
}

const mem = (config) => {
    const gid = config.gid || 'all';
    const hash = config.hash || util.id.naiveHash;

    return {
        get: (key, root, cb) => {
            local.groups.get(gid, (e, nodes) => {
                if (e) {
                    if (cb) {
                        cb(new Error(`Error from all.mem.get: failed to get nodes in gid`), undefined);
                    }
                    return;
                }

                if (key === null) {
                    const promises = [];
                    for (const nid in nodes) {
                        const remote = {
                            node: nodes[nid],
                            service: 'mem',
                            method: 'get',
                        }
                        const keyObj = {
                            key: null,
                            gid: gid,
                        }
                        promises.push(new Promise((resolve, reject) => {
                            local.comm.send([keyObj, root], remote, (e, v) => {
                                if (e) {
                                    resolve([]);
                                } else {
                                    resolve(v);
                                }
                            });
                        }));
                    }

                    Promise.all(promises).then((results) => {
                        if (cb) {
                            cb(undefined, results.flat());
                        }
                    }).catch((error) => {
                        if (cb) {
                            cb(new Error('Error from all.mem.get: failed to resolve promises'), undefined);
                        }
                    });

                    return;
                }

                // otherwise, find the appropriate node and send a request
                sendToNode(gid, hash, nodes, root, 'get', key, undefined, cb);
            });
        },

        put: (value, key, root, cb) => {
            // use value if the key is null
            if (key === null) {
                key = value;
            }

            local.groups.get(gid, (e, nodes) => {
                sendToNode(gid, hash, nodes, root, 'put', key, [value], cb);
            });
        },

        del: (key, root, cb) => {
            local.groups.get(gid, (e, nodes) => {
                sendToNode(gid, hash, nodes, root, 'del', key, undefined, cb);
            });
        },

        reconf: () => {
            //
        },
    }
}

module.exports = mem;
