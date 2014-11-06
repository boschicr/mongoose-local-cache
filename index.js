// Generated by CoffeeScript 1.8.0
var DEFAULT_CACHE_MAX_SIZE, DEFAULT_CACHE_TTL, crypto, debug, lruCache, mongooseLocalCache, _;

crypto = require("crypto");

_ = require("lodash");

lruCache = require("lru-cache");

debug = require("debug")("mongoose-local-cache");

DEFAULT_CACHE_TTL = 60;

DEFAULT_CACHE_MAX_SIZE = 1000;

RegExp.prototype.toJSON = function() {
  var ind, json, opts, str;
  json = {
    $regexp: this.source
  };
  str = this.toString();
  ind = str.lastIndexOf('/');
  opts = str.slice(ind + 1);
  if (opts.length > 0) {
    json.$options = opts;
  }
  return json;
};

mongooseLocalCache = function(mongoose, options, callback) {
  var client, max, prefix, ttl;
  if (options == null) {
    options = {};
  }
  prefix = options.prefix || "cache";
  max = options.max || DEFAULT_CACHE_MAX_SIZE;
  ttl = options.ttl || DEFAULT_CACHE_TTL;
  client = lruCache({
    max: max,
    maxAge: ttl * 1000
  });
  mongoose.Query.prototype._exec = mongoose.Query.prototype.exec;
  mongoose.Query.prototype.exec = function(callback) {
    var cb, collectionName, fields, hash, key, model, populate, query, schemaOptions, self, value;
    self = this;
    model = this.model;
    query = this._conditions || {};
    options = this._optionsForExec(model) || {};
    fields = _.clone(this._fields) || {};
    populate = this.options.populate || {};
    schemaOptions = model.schema.options;
    collectionName = model.collection.name;
    debug("---");
    debug("Query: " + collectionName + ":" + JSON.stringify(query));
    if (!(schemaOptions.cache && this._mongooseOptions.lean)) {
      debug("Using mongodb");
      return mongoose.Query.prototype._exec.apply(self, arguments);
    }
    debug("Using cache");
    hash = crypto.createHash('md5').update(JSON.stringify(query)).update(JSON.stringify(options)).update(JSON.stringify(fields)).update(JSON.stringify(populate)).digest('hex');
    key = [prefix, collectionName, hash].join(':');
    cb = function(err, result) {
      var docs, k, path;
      if (err) {
        return callback(err);
      }
      if (!result) {
        for (k in populate) {
          path = populate[k];
          path.options || (path.options = {});
          _.defaults(path.options, {
            cache: false
          });
        }
        return mongoose.Query.prototype._exec.call(self, function(err, docs) {
          var str;
          if (err) {
            return callback(err);
          }
          str = JSON.stringify(docs);
          client.set(key, str);
          debug("Cache miss: " + str);
          return callback(null, JSON.parse(str));
        });
      } else {
        debug("Cache hit: " + result);
        docs = JSON.parse(result);
        return callback(null, docs);
      }
    };
    value = client.get(key);
    cb(null, value);
    return this;
  };
  return typeof callback === "function" ? callback(null) : void 0;
};

module.exports = mongooseLocalCache;
