const store = require('./store');
const util = global.distribution.util;

const mr = {};

mr.map = (args, cb) => {
    /* 
    args = {
        gid: string,
        mrid: string,
        keys: Array<any>,
    }
    */
    cb = cb || function() {};

    // map keys are stored as files under store/{sid}{mrid}/{map};
    // it can be accessed via. local.store.get(..., root=[mrid, 'map'])
}

mr.reduce = (args, cb) => {
    /* 
    args = {
        gid: string,
        mrid: string,
    }
    */
    cb = cb || function() {};
    
    // reduce keys are stored as files under store/{sid}{mrid}/{reduce};
    // it can be accessed via. local.store.get(..., root=[mrid, 'reduce'])
}

mr.append = (args, cb) => {
    /*
    args = {
        root: Array<string>,
        items: list of key-val pairs,
    }
    */
   
    cb = cb || function() {};

    // store each item (key-value pair)
    const promises = [];
    for (let i=0; i<args.items.length; i++) {
        const item = args.items[i];
        const key = Object.keys(item)[0];
        const value = item[key];

        promises.push(new Promise((resolve, reject) => {
            store.put(value, key, args.root, (e, v) => {
                if (e) {
                    reject(e);
                } else {
                    resolve(v);
                }
            });
        }));
    }

    // if append fails to store any item, an error
    // is returned w/ results being undefined (may want to change
    // this behavior)
    Promise.all(promises).then((results) => {
        cb(undefined, true);
    }).catch((error) => {
        cb(new Error('Error storing at least one key-val pair in local.mr.append'), undefined);
    });
}

module.exports = mr;
