/* Puts a service for every node in the group.

PARAMETERS:
context: stores the group ID
service: the service to add
serviceName: the name of the service
callback: an optional callback
*/
const put = (context, service, serviceName, callback) => {
  callback = callback || function(e, v) {};
  global.distribution[context.gid][serviceName] = service;
  global.distribution.local[serviceName] = service;

  const message = [service, serviceName];
  const remote = {service: 'routes', method: 'put'};
  global.distribution[context.gid].comm.send(message, remote, callback);
};

/* Gets a service from every node in the group.

PARAMETERS:
context: stores the group ID
serviceName: the name of the service
callback: an optional callback
*/
const get = (context, serviceName, callback) => {
  callback = callback || function(e, v) {};
  const message = [serviceName];
  const remote = {service: 'routes', method: 'get'};
  global.distribution[context.gid].comm.send(message, remote, callback);
};

const routes = (options) => {
  const context = {};
  context.gid = options.gid || 'all';

  return {
    put: put.bind(null, context),
    get: get.bind(null, context),
  };
};

module.exports = routes;
