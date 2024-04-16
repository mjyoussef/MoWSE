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

groups.get = (group, cb) => {
  const callback = cb || (() => {});

  if (group in groups.nodeGroups) {
    callback(null, groups.nodeGroups[group]);
  } else {
    callback(new Error(`group ${group} not found`));
  }
};

groups.put = (groupName, nodes, cb) => {
  const callback = cb || (() => {});
  groups.nodeGroups[groupName] = nodes;

  const context = {
    gid: groupName,
  };

  global.distribution[groupName] = {
    comm: global.distribution.commTemplate(context),
    groups: global.distribution.groupsTemplate(context),
    status: global.distribution.statusTemplate(context),
    routes: global.distribution.routesTemplate(context),
    gossip: global.distribution.gossipTemplate(context),
    mem: global.distribution.memTemplate(context),
    store: global.distribution.storeTemplate(context),
    mr: global.distribution.mrTemplate(context),
  };

  callback(null, nodes);
};

groups.add = (groupName, node, cb) => {
  const callback = cb || (() => {});

  const nodeSID = id.getSID(node);
  if (!(groupName in groups.nodeGroups)) {
    callback(null, {});
    return;
  }

  groups.nodeGroups.all[nodeSID] = node;

  groups.nodeGroups[groupName][nodeSID] = node;
  callback(null, node);
};

groups.rem = (groupName, nodeId, cb) => {
  const callback = cb || (() => {});
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

groups.del = (groupName, cb) => {
  const callback = cb || (() => {});
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
