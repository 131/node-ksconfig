"use strict";
const fs = require('fs');
const path = require('path');

const xml2js = require('xml2js');


const promisify = function(fn, ctx) {
  if(ctx === undefined)
    ctx = this;
  return function() {
    var args = [].slice.apply(arguments);

    return new Promise(function (resolve, reject) {
      args.push(function (err, res) {
        if(err)
          return reject(err);
        resolve(res);
      });
      fn.apply(ctx, args);
    });

  };
};

const parseString = promisify(xml2js.parseString);
const Builder = xml2js.Builder;

function dive(obj, path = []) {
  let node = path.shift();
  if(!node)
    return obj;

  if(!Array.isArray(obj))
    obj = [obj];

  for(let child of obj) {
    if(node in child)
      return dive(child[node], path);
  }

  console.log({obj, node});
  throw `Cannot find ${node}`;
}

async function read_config({root = process.cwd(), wd = process.cwd()}, entry) {
  let [entrypoint, xpath_root] = entry.split(' ');

  let entrypoint_path = path.join(entrypoint.startsWith('/') ? root : wd, entrypoint);

  let fromBody = fs.readFileSync(entrypoint_path, 'utf8');
  let obj = await  parseString(fromBody);

  if(xpath_root) {
    obj = Object.entries(obj)[0][1];
    obj = dive(obj, xpath_root.split('/'));
  }

  obj = await   inline({wd}, obj);
  return obj;
}

async  function inline(ctx, obj) {
  if(typeof obj != "object")
    return obj;

  if('$' in obj && obj['$']['file']) {
    // eslint-disable-next-line no-unused-vars
    let {file, ...xargs} = obj['$'];
    let tree = await read_config(ctx, obj['$']['file']);
    let root = Object.entries(tree)[0][1];

    if(typeof root !== "object") //e.g. string
      return root;

    root['$'] = {...root['$'], ...xargs};
    return root;
  }

  for(let k in obj)
    obj[k] = await inline(ctx, obj[k]);

  return obj;
}

module.exports = async function({replaceEnv = String, wd = process.cwd()}, entrypoint) {
  let env = {};
  if(typeof entrypoint == "object")
    ({entrypoint, env, wd = wd} = entrypoint);

  let obj = await read_config({wd}, entrypoint);

  var builder = new Builder();
  var xml = builder.buildObject(obj);

  xml = replaceEnv(xml, env);

  return xml;
};




