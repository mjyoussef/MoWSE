const get = (context, groupName, callback) => {
  const message = [groupName];
  const remote = {service: 'groups', method: 'get'};
  global.distribution[context.gid].comm.send(message, remote, callback);
};

const put = (context, groupName, nodes, callback) => {
  global.distribution.local.groups.put(groupName, nodes, (e, v) => {
    const message = [groupName, nodes];
    const remote = {service: 'groups', method: 'put'};
    global.distribution[context.gid].comm.send(message, remote, callback);
  });
};

const add = (context, groupName, node, callback) => {
  global.distribution.local.groups.add(groupName, node, (e, v) => {
    const message = [groupName, node];
    const remote = {service: 'groups', method: 'add'};
    global.distribution[context.gid].comm.send(message, remote, callback);
  });
};

const rem = (context, groupName, nodeId, callback) => {
  const message = [groupName, nodeId];
  const remote = {service: 'groups', method: 'rem'};
  global.distribution[context.gid].comm.send(message, remote, callback);
};

const del = (context, groupName, callback) => {
  const message = [groupName];
  const remote = {service: 'groups', method: 'del'};
  global.distribution[context.gid].comm.send(message, remote, callback);
};

const groups = (options) => {
  const context = {};
  context.gid = options.gid || 'all';

  return {
    get: get.bind(null, context),
    put: put.bind(null, context),
    add: add.bind(null, context),
    rem: rem.bind(null, context),
    del: del.bind(null, context),
  };
};

module.exports = groups;
