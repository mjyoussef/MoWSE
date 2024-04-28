const id = global.distribution.util.id;
const config = require('./config.js');

const groups = {};

const sid = global.moreStatus.sid;
groups.nodeGroups = {
  all: {
    [sid]: config,
  },
  local: {
    [sid]: config,
  },
};

/* Gets the nodes in a group.

group: the group ID
cb: an optional callback
*/
groups.get = (group, cb) => {
  const callback = cb || (() => {});

  if (group in groups.nodeGroups) {
    callback(null, groups.nodeGroups[group]);
  } else {
    callback(new Error(`group ${group} not found`));
  }
};

/* Puts a list of nodes in a group.

groupName: the group ID
nodes: the list of nodes to add
cb: an optional callback
*/
groups.put = (groupName, nodes, cb) => {
  const callback = cb || function(e, v) {};
  groups.nodeGroups[groupName] = nodes;

  const context = {
    gid: groupName,
  };

  global.distribution[groupName] = {
    comm: global.distribution.commTemplate(context),
    groups: global.distribution.groupsTemplate(context),
    status: global.distribution.statusTemplate(context),
    routes: global.distribution.routesTemplate(context),
    mem: global.distribution.memTemplate(context),
    store: global.distribution.storeTemplate(context),
    mr: global.distribution.mrTemplate(context),
    vecStore: global.distribution.vecStoreTemplate(context),
  };

  callback(null, nodes);
};

/* Adds a node to the group.

groupName: the group ID
node: the node to add
cb: an optional callback
*/
groups.add = (groupName, node, cb) => {
  const callback = cb || function(e, v) {};

  const nodeSID = id.getSID(node);
  if (!(groupName in groups.nodeGroups)) {
    callback(null, {});
    return;
  }

  groups.nodeGroups.all[nodeSID] = node;

  groups.nodeGroups[groupName][nodeSID] = node;
  callback(null, node);
};

/* A node to remove from the group.

groupName: the group ID
nodeId: th id of the node
cb: an optional callback
*/
groups.rem = (groupName, nodeId, cb) => {
  const callback = cb || function(e, v) {};
  if (
    !(groupName in groups.nodeGroups) ||
    !(nodeId in groups.nodeGroups[groupName])
  ) {
    callback(null, {});
    return;
  }

  const nodeToDelete = groups.nodeGroups[groupName][nodeId];
  delete groups.nodeGroups[groupName][nodeId];

  callback(null, nodeToDelete);
};

/* Deletes a group.

groupName: the group ID
cb: an optional callback
*/
groups.del = (groupName, cb) => {
  const callback = cb || function(e, v) {};
  if (!(groupName in groups.nodeGroups)) {
    callback(new Error(`group ${groupName} not found`));
    return;
  }

  const groupToDelete = groups.nodeGroups[groupName];
  delete groups.nodeGroups[groupName];

  delete global.distribution[groupName];

  callback(null, groupToDelete);
};

module.exports = groups;
