/* Gets all of the nodes in a group using the coordinator
node's view.

PARAMETERS:
context: holds the group ID
groupName: the name of the group
callback: an optional callback
*/
const get = (context, groupName, callback) => {
  callback = callback || function(e, v) {};
  const message = [groupName];
  const remote = {service: 'groups', method: 'get'};
  global.distribution[context.gid].comm.send(message, remote, callback);
};

/* Puts nodes in a group

PARAMETERS:
context: holds the group ID
groupName: the name of the group
nodes: a list of nodes to add
callback: an optional callback
*/
const put = (context, groupName, nodes, callback) => {
  callback = callback || function(e, v) {};
  global.distribution.local.groups.put(groupName, nodes, (e, v) => {
    const message = [groupName, nodes];
    const remote = {service: 'groups', method: 'put'};
    global.distribution[context.gid].comm.send(message, remote, callback);
  });
};

/* Adds a single node to the group

PARAMETERS:
context: holds the group ID
groupName: the name of the group
node: a node
callback: an optional callback
*/
const add = (context, groupName, node, callback) => {
  callback = callback || function(e, v) {};
  global.distribution.local.groups.add(groupName, node, (e, v) => {
    const message = [groupName, node];
    const remote = {service: 'groups', method: 'add'};
    global.distribution[context.gid].comm.send(message, remote, callback);
  });
};

/* Removes a node from the group

PARAMETERS:
context: holds the group ID
groupName: the name of the group
node: a node
callback: an optional callback
*/
const rem = (context, groupName, nodeId, callback) => {
  callback = callback || function(e, v) {};
  const message = [groupName, nodeId];
  const remote = {service: 'groups', method: 'rem'};
  global.distribution[context.gid].comm.send(message, remote, callback);
};

/* Deletes a group

PARAMETERS:
context: holds the group ID
groupName: the name of the group
callback: an optional callback
*/
const del = (context, groupName, callback) => {
  callback = callback || function(e, v) {};
  const message = [groupName];
  const remote = {service: 'groups', method: 'del'};
  global.distribution[context.gid].comm.send(message, remote, callback);
};

const groups = (config) => {
  const context = {};
  context.gid = config.gid || 'all';

  return {
    get: get.bind(null, context),
    put: put.bind(null, context),
    add: add.bind(null, context),
    rem: rem.bind(null, context),
    del: del.bind(null, context),
  };
};

module.exports = groups;
