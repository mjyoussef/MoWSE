/*
Service   Description                            Methods
comm      A message communication interface      send
groups    A mapping from group names to nodes    get,put, add, rem, del
routes    A mapping from names to functions      put
status    Information about the current group    get, stop, spawn
mem       An ephemeral (in-memory) store         get, put, del, reconf
store     A persistent store                     get, put, del, reconf
mr        A map-reduce implementation            exec
vecStore Local vecStore service                  put, query
*/

/* Comm Service */
const comm = require('./comm');

/* Groups Service */
const groups = require('./groups');

/* Routes Service */
const routes = require('./routes');

/* Status Service */
const status = require('./status');

/* Mem Service */
const mem = require('./mem');

/* Store Service */
const store = require('./store');

/* Map-Reduce Service */
const mr = require('./mr');

/* vecStore Service */
const vecStore = require('./vecStore');

module.exports = {
  comm: comm,
  groups: groups,
  status: status,
  routes: routes,
  mem: mem,
  store: store,
  mr: mr,
};
