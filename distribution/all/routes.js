/**
 * Registers a new service.
 *
 * @param {Object} context - metadata such as gid
 * @param {Object} service - actual service, which contains methods as fields
 * @param {string} serviceName - name of the service
 * @param {Function} callback - optional callback that accepts error, value
 */
const put = (context, service, serviceName, callback) => {
  global.distribution[context.gid][serviceName] = service;
  global.distribution.local[serviceName] = service;

  const message = [service, serviceName];
  const remote = { service: "routes", method: "put" };
  global.distribution[context.gid].comm.send(message, remote, callback);
};

/**
 * Gets a service.
 *
 * @param {Object} context - metadata such as gid
 * @param {string} serviceName - name of the service
 * @param {Function} callback - optional callback that accepts error, value
 */
const get = (context, serviceName, callback) => {
  const message = [serviceName];
  const remote = { service: "routes", method: "get" };
  global.distribution[context.gid].comm.send(message, remote, callback);
};

const routes = (options) => {
  const context = {};
  context.gid = options.gid || "all";

  return {
    put: put.bind(null, context),
    get: get.bind(null, context),
  };
};

module.exports = routes;
