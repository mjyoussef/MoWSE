const getRandomNodes = (group, n) => {
  const keys = Object.keys(group);

  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }

  const selectedKeys = keys.slice(0, n);

  const result = {};
  selectedKeys.forEach((key) => {
    result[key] = group[key];
  });

  return result;
};

const send = (context, message, rem, callback) => {
  const local = global.distribution.local;

  const remote = {...rem};

  local.groups.get(context.gid, (e, allNodes) => {
    const randomNodes = getRandomNodes(allNodes, context.subset);

    const nodesToErrors = {};
    const nodesToValues = {};
    const counter = {count: 0};

    for (const [sid, node] of Object.entries(randomNodes)) {
      remote.node = node;
      local.comm.send(message, remote, (e2, v2) => {
        if (e2) {
          nodesToErrors[sid] = e2;
        } else {
          nodesToValues[sid] = v2;
        }
        counter.count++;

        if (counter.count === context.subset) {
          callback(nodesToErrors, nodesToValues);
        }
      });
    }
  });
};

const at = (context, interval, pollFunc, callback) => {
  const intervalId = setInterval(() => {
    pollFunc();
  }, interval);

  callback(null, intervalId);
};

const del = (context, intervalId, callback) => {
  clearInterval(intervalId);
  callback(null, intervalId);
};

const gossip = (options) => {
  const context = {};
  context.gid = options.gid || 'all';
  context.subset = options.subset || 3;

  return {
    send: send.bind(null, context),
    at: at.bind(null, context),
    del: del.bind(null, context),
  };
};

module.exports = gossip;
