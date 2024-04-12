const start = function(started) {
  const server = http.createServer((req, res) => {
    /* 
      TODO
    */
    const serviceCallback = (e, v) => {
      res.end(serialization.serialize([e, v]));
    };
  });

  server.listen(global.config.port, global.config.ip, () => {
    started(server);
  });
};

module.exports = {
  start: start,
};
