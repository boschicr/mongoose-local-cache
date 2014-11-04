# Some module requires
crypto = require "crypto"
_ = require "lodash"
lruCache = require "lru-cache"

# Begin the happy thing!
# How we do it:
# We cache the original mongoose.Query.prototype.exec function,
# and replace it with this version that utilizes local caching.
#
# For more information, get on to the readme.md!

DEFAULT_CACHE_TTL = 60
DEFAULT_CACHE_MAX_SIZE = 1000

# We need RegExp::toJSON to serialize queries with reqular expressions

RegExp::toJSON = ->
  json = $regexp: @source
  str = @toString()
  ind = str.lastIndexOf '/'
  opts = str.slice ind + 1
  json.$options = opts if opts.length > 0
  json

# Let's start the party!

mongooseLocalCache = (mongoose, options, callback) ->
  options ?= {}

  prefix = options.prefix || "cache"
  max = options.max || DEFAULT_CACHE_MAX_SIZE
  ttl = options.ttl || DEFAULT_CACHE_TTL

  client = lruCache
    max: max, 
    maxAge: ttl * 1000

  # Cache original exec function so that
  # we can use it later
  mongoose.Query::_exec = mongoose.Query::exec

  # Replace original function with this version that utilizes
  # local caching when executing finds.
  # Note: We only use this version of execution if it's a lean call,
  # meaning we don't cast each object to the Mongoose schema objects!
  # Also this will only enabled if user had specified cache: true option
  # when creating the Mongoose Schema object!

  mongoose.Query::exec = (callback) ->
    self = this
    model = @model
    query = @_conditions || {}
    options = @_optionsForExec(model) || {}
    fields = _.clone(@_fields) || {}
    populate = @options.populate || {}

    schemaOptions = model.schema.options
    collectionName = model.collection.name

    # Enable caching only for those schemas explicitly specifying it, and 
    # only for lean queries
    unless schemaOptions.cache and @_mongooseOptions.lean
      return mongoose.Query::_exec.apply self, arguments

    hash = crypto.createHash 'md5'
      .update JSON.stringify query
      .update JSON.stringify options
      .update JSON.stringify fields
      .update JSON.stringify populate
      .digest 'hex'

    key = [prefix, collectionName, hash].join ':'

    cb = (err, result) ->
      if err then return callback err

      if not result
        # If the key is not found in cache, executes Mongoose original
        # exec() function and then cache the results

        for k, path of populate
          path.options ||= {}
          _.defaults path.options, cache: false

        mongoose.Query::_exec.call self, (err, docs) ->
          if err then return callback err
          str = JSON.stringify docs
          client.set key, str
          callback null, docs
      else
        # Key is found, yay! Return the baby!
        docs = JSON.parse(result)
        return callback null, docs

    value = client.get key
    cb null, value

    return @

  return

# Just some exports, hah.
module.exports = mongooseLocalCache
