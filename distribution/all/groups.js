/**
 * Gets each group member's view of the group name.
 *
 * @param {Object} context - metadata such as gid
 * @param {string} groupName - name of the group
 * @param {Function} callback - optional callback that takes error, value
 */
const get = (context, groupName, callback) => {
  const message = [groupName];
  const remote = { service: "groups", method: "get" };
  global.distribution[context.gid].comm.send(message, remote, callback);
};

/**
 * Registers a new group.
 *
 * @param {Object} context - metadata such as gid
 * @param {string} groupName - name of the group
 * @param {string[]} nodes - list of nodes in the group
 * @param {Function} callback - optional callback that takes error, value
 */
const put = (context, groupName, nodes, callback) => {
  global.distribution.local.groups.put(groupName, nodes, (e, v) => {
    const message = [groupName, nodes];
    const remote = { service: "groups", method: "put" };
    global.distribution[context.gid].comm.send(message, remote, callback);
  });
};

/**
 * Adds a new node to a group.
 *
 * @param {Object} context - metadata such as gid
 * @param {string} groupName - name of the group
 * @param {Object} node - a new node to add
 * @param {Function} callback - optional callback that takes error, value
 */
const add = (context, groupName, node, callback) => {
  global.distribution.local.groups.add(groupName, node, (e, v) => {
    const message = [groupName, node];
    const remote = { service: "groups", method: "add" };
    global.distribution[context.gid].comm.send(message, remote, callback);
  });
};

/**
 * Removes a node from a group.
 *
 * @param {Object} context - metadata such as gid
 * @param {string} groupName - name of the group
 * @param {string} nodeId - id of the node to remove
 * @param {Function} callback - optional callback that takes error, value
 */
const rem = (context, groupName, nodeId, callback) => {
  const message = [groupName, nodeId];
  const remote = { service: "groups", method: "rem" };
  global.distribution[context.gid].comm.send(message, remote, callback);
};

/**
 * Deletes a group.
 *
 * @param {Object} context - metadata such as gid
 * @param {string} groupName - name of the group
 * @param {Function} callback - optional callback that takes error, value
 */
const del = (context, groupName, callback) => {
  const message = [groupName];
  const remote = { service: "groups", method: "del" };
  global.distribution[context.gid].comm.send(message, remote, callback);
};

const groups = (options) => {
  const context = {};
  context.gid = options.gid || "all";

  return {
    get: get.bind(null, context),
    put: put.bind(null, context),
    add: add.bind(null, context),
    rem: rem.bind(null, context),
    del: del.bind(null, context),
  };
};

module.exports = groups;
