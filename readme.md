# mongoose-local-cache

Plugin to cache Mongoose MongoDB query results locally with node-lru-cache. Lean DB queries, much faster!

Forked from https://github.com/conancat/mongoose-redis-cache

Modified to make use of local LRU cache (through node-lru-cache) instead of Redis for caching.


## How to use
First, the usual:

    npm install boschicr/mongoose-local-cache

Then,

    Setup mongoose connect as usual:

       var mongoose = require("mongoose");
       var mongooseLocalCache = require("mongoose-local-cache");
       mongoose.connect("mongodb://localhost/mongoose-local-test")

    Create your schemas as usual:

       var ExampleSchema = new Schema(function(){
          field1: String
          field2: Number
          field3: Date
       });

    Enable redisCache on the schema!

       REQUIRED: Enable Redis caching on this schema by specifying

           ExampleSchema.set('cache', true)

    Register the schema as usual:

         Example = mongoose.model('Example', ExampleSchema)

    Setup your mongooseCache options:

        # With default options (max 1000 cached queries, cached for 1 minute)
        mongooseLocalCache(mongoose)

        # Or if you want to customize the cache parameters
        mongooseLocalCache(mongoose, {
           max: 500, // Maximum number of entries in the cache
           ttl: 5*60, // Time To Live, in seconds
           pass: "redisPass",
           options: "redisOptions"
         })

    Make a query as usual:

        query = Example.find({})
        query.where("field1", "foo")
        query.where("field2").gte(30)
        query.lean()  mongooseLocalCache only works for query.lean() queries!
        query.exec(function(err, result){
            Do whatever here!
        });

Check out the test example for more information.

## How this works

### What is a Mongoose `lean` query?

[Mongoose](http://mongoosejs.com), the MongoDB ORM for NodeJS has an awesome feature which casts each document
as a Mongoose [model](http://mongoosejs.com/docs/models.html). This allows awesome features like being able to call `model.save()` or `model.remove()` on each document directly, which makes coding much easier.

At the same time, Mongoose also casts each value in every document returned from MongoDB to their [schema types](http://mongoosejs.com/docs/guide.html), which makes sure your database value types stays consistent.

However, sometimes in situations where we need to READ a lot of data and have no intentions of doing anything to the
document, we can call [query.lean()](http://mongoosejs.com/docs/api.html#query_Query-lean) when constructing
our queries to remove the step which casts the documents into models. Documents are returned as normal Javascript
objects without the Model constructor functions, and values are not casted. This speeds things up considerably.

### Caching data locally

What if we want to speed things up even faster?

In these situations where we don't need Mongoose model functionalities, we may want to ramp out our reading speed
higher by caching data locally. Especially if we're talking about read-only data.

Caching data locally we avoid any networking overhead at the expense of increased memory usage. Your requirements will usually dictate if that's a reasonable trade-off.

Cool for high-volume data reading!

## API

### Setting up

    # If you're running this locally,
    mongooseLocalCache(mongoose)

    # Or if you need some specific cache parameters
    mongooseLocalCache(mongoose, {
      max: 5000,
      ttl: 2 * 60
     })

### cache: Boolean

    ExampleSchema.set('cache', true)

OPTIONAL 
Call this function on whatever collection you want to cache. You don't have to use this on every collection,
right? Pick and choose your collections wisely, you shall.


### query.lean()

    query = Example.find({})
    query.lean()
    query.exec(function(err, results){
      # Your results here #
    })

REQUIRED
Just a reminder. Be sure to call this whenever you want the results to be cached! More info
about [query.lean()](http://mongoosejs.com/docs/api.html#query_Query-lean) here.

Yeah, that's it. What else did you expect? Meh.

## How to Run Test

Try testing this on your machine and let me know how it went for you!

The usual jazz:

    # Clone em!
    git clone https://github.com/boschicr/mongoose-local-cache.git

    # Install those packages
    cd mongoose-local-cache
    npm install

    # If you don't have Mocha installed already
    npm install mocha -g

    # Yeah, just get in there and get on it
    cd tests
    mocha

### How the tests are run

#### Mock data
We generate a set number of mock data in the DB (defaults to 30000 items).
Each item contains a random person's name, some arbitary number as random data, a date, and
n array for the person's friend.

For testing purposes, we also called `ensureIndex()` on MongoDB to make sure we index
the field we want to query.

#### Execute test rounds
For every round we query the database for all the names (defaults to 20 of them),
and tracks the amount of time required to return the data. Each query returns around 1100 documents per call.
We run these same queries with and without Redis caching, for 20 rounds. Then we average out the time
needed to return the data.

All queries are query.lean(), meaning all documents returned are NOT casted as Mongoose models.
This gives us fair comparison between Redis caching and direct MongoDB queries.

## These awesome people!

* [mongoose](https://github.com/LearnBoost/mongoose)
* [node-redis](https://github.com/mranney/node_redis)

