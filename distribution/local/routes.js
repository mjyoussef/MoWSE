const comm = require("./comm");
const status = require("./status");
const groups = require("./groups");
const mem = require("./mem");
const store = require("./store");
const mr = require("./mr");
const vecStore = require("./vecStore.js");
const routesStore = new Map();
const routes = {};

/**
 * Puts a new service.
 *
 * @param {Object} service - the service
 * @param {string} name - the name of the service
 * @param {Function} cb - an optional callback
 */
routes.put = (service, name, cb) => {
  routesStore[name] = service;
  if (cb) {
    cb(null, name);
  } else {
    return;
  }
};

/**
 * Gets a service.
 *
 * @param {string} the - name of the service
 * @param {Function} cb - an optional callback
 */
routes.get = (name, cb) => {
  if (!cb) {
    return;
  }

  if (name in routesStore) {
    let service = routesStore[name];
    cb(null, service);
  } else {
    // cb(new Error("Service not found in routes"), null);
    const globalLookup = global.toLocal.get(name);
    if (globalLookup) {
      cb(null, { call: globalLookup });
    } else {
      cb(new Error("Service not found in routes"));
    }
  }
};

routesStore.routes = routes;
routesStore.comm = comm;
routesStore.status = status;
routesStore.groups = groups;
routesStore.mem = mem;
routesStore.store = store;
routesStore.mr = mr;
routesStore.vecStore = vecStore;

module.exports = routes;
