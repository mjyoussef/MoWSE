function serialize(object) {
  const que = [[globalThis, '']];
  const visitedObj = new WeakMap();
  const stringMap = new WeakMap();
  while (que.length !== 0) {
    const curr = que.shift();
    const obj = curr.shift();
    const base = curr.shift();
    visitedObj.set(obj, true);
    const keys = Reflect.ownKeys(obj);
    for (var i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (typeof key === 'string') {
        const val = obj[keys[i]];
        if (typeof val === 'function') {
          stringMap.set(val, base + '.' + key);
        } else if (
          typeof val === 'object' &&
          val !== null &&
          !visitedObj.has(val)
        ) {
          que.push([val, key]);
        }
      }
    }
  }

  function serializePrimitive(input) {
    if (typeof input === 'number') {
      return {type: 'number', value: input};
    } else if (typeof input === 'string') {
      return {type: 'string', value: input};
    } else if (typeof input === 'boolean') {
      return {type: 'boolean', value: input.toString()};
    } else if (input === null) {
      return {type: 'null'};
    } else if (input === undefined) {
      return {type: 'undefined'};
    } else {
      return -1;
    }
  }
  function serializeDate(input) {
    if (input instanceof Date) {
      return {type: 'Date', value: input.getTime()};
    } else {
      return -1;
    }
  }
  function serializeError(input) {
    if (input instanceof Error) {
      return {type: 'Error', message: input.message, stack: input.stack};
    } else {
      return -1;
    }
  }
  function serializeFunc(input) {
    if (typeof input === 'function') {
      const s = input.toString();
      if (s.includes('[native code]')) {
        return {type: 'Function', value: stringMap.get(input)};
      }
      return {type: 'Function', value: s};
    } else {
      return -1;
    }
  }
  function serializeArray(input) {
    if (Array.isArray(input)) {
      const values = [];
      for (var i = 0; i < input.length; i++) {
        values.push(controller(input[i]));
      }
      return {type: 'Array', value: values};
    } else {
      return -1;
    }
  }
  function clean(input) {
    var skip = true;
    return function(key, val) {
      if (!skip && typeof val === 'object' && input == val) {
        return '[Circular]';
      } else if (
        typeof val === 'function' ||
        val instanceof Error ||
        input[key] instanceof Date
      ) {
        return controller(input[key]);
      }
      if (skip) {
        skip = !skip;
      }
      return val;
    };
  }
  function serializeObject(input) {
    if (typeof input === 'object') {
      const cleaned = JSON.parse(JSON.stringify(input, clean(input)));
      const values = {};
      for (var [k, v] of Object.entries(cleaned)) {
        if (
          typeof v === 'object' &&
          v !== null &&
          (v.type === 'Function' || v.type === 'Error' || v.type === 'Date')
        ) {
          values[k] = v;
        } else {
          values[k] = controller(v);
        }
      }
      return {type: 'Object', value: values};
    }
  }

  function controller(input) {
    var output = serializePrimitive(input);
    if (output !== -1) {
      return output;
    }
    output = serializeDate(input);
    if (output !== -1) {
      return output;
    }
    output = serializeError(input);
    if (output !== -1) {
      return output;
    }
    output = serializeFunc(input);
    if (output !== -1) {
      return output;
    }
    output = serializeArray(input);
    if (output !== -1) {
      return output;
    }
    output = serializeObject(input);
    if (output !== -1) {
      return output;
    }
    return -1;
  }
  const output = controller(object);
  if (output === -1) {
    throw new Error('ERROR: Serialization failed!');
  }
  return JSON.stringify(output);
}

function deserialize(string) {
  const seen = {};

  function buildPrimitive(data) {
    if (data.type === 'number') {
      return parseFloat(data.value);
    } else if (data.type === 'string') {
      return data.value;
    } else if (data.type === 'boolean') {
      return data.value === 'true';
    } else if (data.type === 'null') {
      return null;
    } else if (data.type === 'undefined') {
      return undefined;
    } else {
      return -1;
    }
  }

  function buildDate(data) {
    if (data.type === 'Date') {
      return new Date(parseInt(data.value));
    } else {
      return -1;
    }
  }

  function buildError(data) {
    if (data.type === 'Error') {
      return new Error(data.message, data.stack);
    } else {
      return -1;
    }
  }

  function buildFunc(data) {
    if (data.type === 'Function') {
      return new Function('return ' + data.value)();
    } else {
      return -1;
    }
  }

  function buildArray(data, obj = null) {
    if (data.type === 'Array') {
      const arr = [];
      for (var i = 0; i < data.value.length; i++) {
        if (
          data.value[i].type === 'string' &&
          data.value[i].value === '[Circular]' &&
          obj !== null
        ) {
          arr.push(obj);
        } else {
          arr.push(parser(data.value[i], obj));
        }
      }
      return arr;
    } else {
      return -1;
    }
  }

  function buildObject(data, obj = null) {
    if (data.type === 'Object') {
      const obj = {};
      for (var [k, v] of Object.entries(data.value)) {
        if (k === 'self' && typeof v === 'object') {
          obj.self = obj;
        } else {
          obj[k] = parser(v, obj);
        }
      }
      return obj;
    } else {
      return -1;
    }
  }

  function parser(data, obj = null) {
    if (seen.hasOwnProperty(data)) {
      return seen[data];
    }
    var output = buildPrimitive(data);
    if (output !== -1) {
      return output;
    }
    output = buildDate(data);
    if (output !== -1) {
      return output;
    }
    output = buildError(data);
    if (output !== -1) {
      return output;
    }
    output = buildFunc(data);
    if (output !== -1) {
      return output;
    }
    output = buildArray(data, obj);
    if (output !== -1) {
      return output;
    }
    output = buildObject(data, obj);
    if (output !== -1) {
      return output;
    }
    return -1;
  }

  const output = parser(JSON.parse(string));
  if (output === -1) {
    throw new Error('ERROR: Deserialization failed!');
  }
  return output;
}

// const testData = {
//   a: 1,
//   b: 2,
//   c: 3,
//   d: 4,
//   c: 5,
// };

// const fn = process.abort;

// function testPerformance(testFunction, iterations, data, tag, s=true) {
//   const { performance } = require('perf_hooks');
//   const start = performance.now();
//   for (let i = 0; i < iterations; i++) {
//       testFunction(data);
//   }
//   const end = performance.now();
//   if (s) {
//     console.log(`Time taken to serialize ${tag} for ${
//       iterations} iterations: ${
//       end - start} milliseconds`);
//   } else {
//     console.log(`Time taken to deserialize ${tag} for ${
//       iterations} iterations: ${end - start} milliseconds`);
//   }
// }

// testPerformance(serialize, 100, testData, 'object');
// testPerformance(serialize, 1000, testData, 'object');
// testPerformance(serialize, 10000, testData, 'object');

// const serializedData = serialize(testData);
// testPerformance(deserialize, 100, serializedData, 'object', false);
// testPerformance(deserialize, 1000, serializedData, 'object', false);
// testPerformance(deserialize, 10000, serializedData, 'object', false);

// testPerformance(serialize, 100, fn, 'function');
// testPerformance(serialize, 1000, fn, 'function');
// testPerformance(serialize, 10000, fn, 'function');

// const serializedFn = serialize(fn);
// testPerformance(deserialize, 100, serializedFn, 'function', false);
// testPerformance(deserialize, 1000, serializedFn, 'function', false);
// testPerformance(deserialize, 10000, serializedFn, 'function', false);

// testPerformance(serialize, 1000, console.log, 'native function');
// const serializedNativeFn = serialize(console.log);
// testPerformance(deserialize, 1000,
//   serializedNativeFn, 'native function', false);

// testData.self = testData;
// testPerformance(serialize, 1000, testData, 'object w/ cycle');
// const serializedCircularData = serialize(testData);
// testPerformance(deserialize, 1000, serializedCircularData,
//   'object w/ cycle', false);

module.exports = {
  serialize: serialize,
  deserialize: deserialize,
};
