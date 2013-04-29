var ShortId  = require('shortid').seed(96715);
var async = require('async');
var mongo = require('mongodb');
var ObjectID = mongo.ObjectID;
var _ = require('underscore');
var logger  = require('nlogger').logger(module);
logger.info("server.js has started loading");

// These variables are local to this module
var db;
var connection;
var posts_collection;
var users_collection;
var openID_collection;
var collections_collection;
var links_collection;
var emails_collection;

var context;
var settings;

function ShorterID(){
   return  ShortId.generate().substr(0, settings.db.short_id_length);
}

module.exports = db = {
    ObjectID : ObjectID,

    find: function(name, query, limit, callback) {
        db.collection(name).find(query).sort({_id: -1}).limit(limit).toArray(callback);
    },
    findOne: function(name, query, callback) {
        db.collection(name).findOne(query, callback);
    },
    insert: function(name, items, callback) {
        db.collection(name).insert(items, callback);
    },
    insertOne: function(name, item, callback) {
        module.exports.insert(name, item, function(err, items) {
            callback(err, items[0]);
        });
    },
    open: function(callback) {
        db.open(callback);
    },

    // Initialize the module. Invokes callback when ready (or on error)
  init: function(contextArg, callback) {
        context = contextArg;
        settings = context.settings;

        // Open the database connection
        var dbConnection = connection = new mongo.Db(
          settings.db.name,
          new mongo.Server(settings.db.host, settings.db.port, {}),
          {});// native_parser:false

        // Store it in the context for use by other mongodb-powered code outside
        // the model layer of our app, such as the connect-mongodb session storage handler
        context.mongoConnection = dbConnection;

        // db.open doesn't happen right away; we pass a callback function
        // to know when it succeeds
      dbConnection.open(function(err) {
          if (err) {
            // If something goes wrong, call the callback with the error so
            // server.js is aware of the problem
            callback(err);
          }
          // Fetch a MongoDB "collection" (like a table in SQL databases)
          posts_collection = dbConnection.collection('post');
          users_collection = dbConnection.collection('users');
          openID_collection =  dbConnection.collection('openids');
          collections_collection =  dbConnection.collection('collections');
          links_collection =  dbConnection.collection('links');
          emails_collection =  dbConnection.collection('emails');

          // Make sure that collection has a unique index on the "slug" field
          // before we continue. This ensures we don't have two blog posts
          // with the same slug. Once again, we pass a callback function


        callback();
        return;

         async.parallel([
             function(callback){   links_collection.ensureIndex("coll_id", callback);    },
             function(callback){   links_collection.ensureIndex("title",   callback);    },
             function(callback){   links_collection.ensureIndex("shortID",   callback);    },

             function(callback){   posts_collection.ensureIndex("url",          callback);    },

             function(callback){   users_collection.ensureIndex("screen_name",  callback);    },
             function(callback){   users_collection.ensureIndex("user_name",    callback);    },
             function(callback){   users_collection.ensureIndex("email",        callback);    },
             function(callback){   users_collection.ensureIndex("name",     callback);     },
             function(callback){   users_collection.ensureIndex("openIDs",  callback);     },

             function(callback){   users_collection.ensureIndex("email",  callback);      },
             function(callback){   users_collection.ensureIndex("pinged", callback);      },
             function(callback){   users_collection.ensureIndex("activated",  callback);      },

             function(callback){   openID_collection.ensureIndex("id", callback);             },
             function(callback){   openID_collection.ensureIndex("provider", callback);           },
             function(callback){   openID_collection.ensureIndex("screen_name", callback);    },
             function(callback){   openID_collection.ensureIndex("user_name", callback);      },
             function(callback){   openID_collection.ensureIndex("email", callback);          },
             function(callback){   openID_collection.ensureIndex("name",  callback);      },
             function(callback){   openID_collection.ensureIndex("openids",  callback);      },

             function(callback){   collections_collection.ensureIndex("userID", callback);      },
             function(callback){   collections_collection.ensureIndex("title", callback);   },
             function(callback){   collections_collection.ensureIndex("categories", callback);   },
             function(callback){   collections_collection.ensureIndex("tags", callback);   },
             function(callback){   collections_collection.ensureIndex("shortID", callback);   }

             // TODO: add campaund  index user + title
          ],
             function(err, results ){  callback(err, results);  }
         );

      });
  },

  openIDs:{
      findOrCreate: function( provider, profile, callback ){
          profile.provider = profile.provider || provider;
          openID_collection.findOne( {"provider":profile.provider, "id":profile.id }, function(err, openID) {
            if (err){
                callback(err);
            }else if(openID){
                callback(err, openID);
            }else{
                profile.provider = provider;
                profile.created = new Date();
                openID_collection.insert( profile,  { safe: true },  function(err, openID) {
                    callback(err, err ? null : openID[0], true ); // true, this a newly added id
                });
            }
          });
      },
      update:function(openID, updated){
        openID_collection.update( {_id: ObjectID(openID) }, _.extend ({$set:{ updated : new Date()}}, updated ) );
      },
      setEmail:function(openID, email){
          openID_collection.update( {_id: ObjectID(openID) },{
            $set:{
                updated : new Date(),
                email:email,
                verifiedEmail:true
            }
        });
      }
  },

    collections:{
        all: function( userID, sort, page, pageSize, callback ){
            filter = userID ? {userID: userID } : null;
            sort = sort || {title: 1};
            page = page || 1;
            pageSize = pageSize || 20;
            collections_collection.find( filter ).sort( sort ).toArray( callback );
        },
        addOne: function( userID, newCollection, callback ){
            newCollection.created = newCollection.updated = new Date();
            newCollection.shortID = ShorterID();
            collections_collection.insert( newCollection,  { safe: true },  function(err, collection) {
                callback(err, err ? null : collection[0] );
            });
        },
        update: function( collectionID, updated, callback ){
            collections_collection.update( {_id: ObjectID(collectionID) }, updated,  function(err, collection) {
                callback(err, err ? null : collection[0] );
            });
        },

         removeOne: function( collectionID, callback ){
            // TODO: Only if all links are members of other collections then delete this collction.
            collections_collection.remove( {_id: ObjectID( collectionID ) }, function(err){
                callback(err);
            });
        },
        findOne: function(collectionID , callback) {
          collections_collection.findOne({_id: ObjectID( collectionID ) }, callback);
        },
        addLink: function( coll_id, LinkObjectID, callback ){
          collections_collection.update(
              { _id: ObjectID(coll_id), "links" :{ $ne : LinkObjectID }},
              {  $push: {  "links" : LinkObjectID } }
          );
          if( typeof callback === 'function') {
            callback();
          }
        },
        removeLink:      function( collectionID, link_id, callback ){
           collections_collection.update( { _id: ObjectID(collectionID)}, {  $pull: {  "links" : ObjectID(link_id) } }, callback );
        },
        eip: function( collectionID, field_name, new_value ){
          var updated = {$set:{ updated : new Date()}};
          updated.$set[ field_name ] = new_value;
          collections_collection.update( {_id: ObjectID(collectionID) }, updated );
        },

        remove2: function( collectionShortID, callback ){
          // TODO: Only if all links are members of other collections then delete this collction.
             collections_collection.remove( { shortID: collectionShortID }, callback);
        },
        update2: function( collectionShortID, updated, callback ){
          collections_collection.update( { shortID: collectionShortID }, updated,  function(err, collection) {
            callback(err, err ? null : collection[0] );
          });
        },
        find2: function( collectionShortID, callback) {
           collections_collection.findOne({shortID: collectionShortID  }, callback);
        },
        linkAdd: function( collectionShortID, LinkObjectID, callback ){
          collections_collection.update(
              { shortID: collectionShortID, "links" :{ $ne : LinkObjectID }},
              { $push: {  "links" : LinkObjectID } },
              callback
          );
        },
        linkRemove:  function( collectionShortID, LinkObjectID, callback ){
          collections_collection.update( { shortID: collectionShortID }, {  $pull: {  "links" : LinkObjectID } }, callback );
        },
        eip2: function( collectionShortID, field_name, new_value ){
          var updated = {$set:{ updated : new Date()}};
          updated.$set[ field_name ] = new_value;
          collections_collection.update( { shortID: collectionShortID  }, updated );
        }
    },

  links:{
      inCollection: function( coll_id, sortBy,  callback) {
          links_collection.find({"colls": coll_id }).sort(  sortBy || {title: 1}  ).toArray( callback );
      },
      addOne: function( Link, coll_id, callback) {
          Link.colls = [ coll_id  ];
          Link.created =  Link.updated = new Date();
          Link.shortID = ShorterID();
          links_collection.insert( Link, { safe: true }, function(error, data){
            if( error ){
              callback(error);
            }else{
              context.db.collections.addLink( coll_id,  data[0]._id, callback );
            }

          } );
      },
      findOne: function(id, callback) {
          links_collection.findOne({ _id: ObjectID(id)}, callback );
      },
      deleteOne: function( id, coll_id, callback ){
          context.db.collections.removeLink(coll_id, id );
          links_collection.remove({ _id: ObjectID(id) });
      },
      replace: function( id, obj, callback ){
          links_collection.update({ _id: ObjectID(id) }, obj,  { safe: true }, callback ); //  ,  { safe: true },
      },

      update: function( id, obj, callback ){
          var update =  {$set:  _.extend ({ updated : new Date()}, obj )} ;
          links_collection.update( {_id: ObjectID(id) }, update,  { safe: true }, callback  );
      },

      eip: function( id, field_name, new_value, callback ){
        var updated = {$set:{ updated : new Date()}};
        updated.$set[ field_name ] = new_value;
        links_collection.update( {_id: ObjectID( id ) }, updated, { safe: true }, callback );
      },

      clone: function( id, callback){
          links_collection.findOne({ _id: ObjectID(id)}, function (err, Link  ){
             if( err ){
                 callback(err);
             }else{
                 Link.updated = new Date();
                 links_collection.insert( Link, { safe: true }, callback );
             }
          });
      },

      addToCollection:      function( link_id, coll_id, callback ){
          links_collection.update(
              { _id: ObjectID(link_id), "colls" :{ $ne : ObjectID(coll_id) }},
              {  $push: {  "colls" : ObjectID(coll_id) } },
              callback
          );
      },
      removeFromCollection: function( link_id, coll_id, callback){
          links_collection.update(
              { _id: ObjectID(link_id), $pull :{ "colls" : ObjectID(coll_id) }}
          );
      },

    add2: function( Link,  collectionShortID, callback) {
      Link.colls = [ coll_id  ];
      Link.created =  Link.updated = new Date();
      Link.shortID = ShorterID();
      links_collection.insert( Link, { safe: true }, function(error, data){
        if( error ){
          callback(error);
        }else{
          context.db.collections.addLink(  collectionShortID,  data[0]._id, callback );
        }

      } );
    },
    findOne: function(id, callback) {
      links_collection.findOne({ _id: ObjectID(id)}, callback );
    },
    deleteOne: function( id, coll_id, callback ){
      context.db.collections.removeLink(coll_id, id );
      links_collection.remove({ _id: ObjectID(id) });
    },
    replace: function( id, obj, callback ){
      links_collection.update({ _id: ObjectID(id) }, obj,  { safe: true }, callback ); //  ,  { safe: true },
    },

    update: function( id, obj, callback ){
      var update =  {$set:  _.extend ({ updated : new Date()}, obj )} ;
      links_collection.update( {_id: ObjectID(id) }, update,  { safe: true }, callback  );
    },




  },


  users:{
    findUserForOpenID: function( OpenID, callback ){
      users_collection.findOne( {"openIDs": OpenID._id }, function(err, user) {
        if (err){
          callback(err);
        }else if(user){
          user.active_openID = OpenID._id;
          user.active_provider = OpenID.provider;
          user.provider = OpenID.provider;
          callback(err, user);
        }else{
          // create a brand new account
          var newUser = _.extend( {}, OpenID, {
            openIDs:[ OpenID._id ],
            active_openID : OpenID._id,
            active_provider : OpenID.provider,
            emailPinged:false,
            created : new Date()
          });
          delete(newUser._id);
          users_collection.insert( newUser,  { safe: true },  function(err, users) {
            callback(err, err ? null : users[0], true ); // true, this a newly added id
          });
        }
      });
    },
    update:function(userID, updated){
      var update = {$set:  _.extend ({ updated : new Date()}, updated )} ;
      users_collection.update( {_id: ObjectID(userID) }, update );
    },

    setEmail:function(userID, email ){
      users_collection.update( {_id: ObjectID(userID) },{
        $set:{
          updated : new Date(),
          email:email,
          verifiedEmail:true,
          emailPinged:false
        }
      });
    },

    getActiveOpenID:function( userID, User,  callback ){
      if( User ){
        openID_collection.findOne( {_id: ObjectID(  User.active_openID ) }, callback);
      }else{
        users_collection.findOne( {_id: userID }, function(err, User) {
          openID_collection.findOne( {_id: ObjectID(  User.active_openID ) }, callback);
        });
      }
    },
    addOpenID:function(userID, openID_id, callback){},
    removeOpenID:function(userID, openID_id, callback){}
  },

  emails:{

    findOne: function(collectionID , callback) {
      emails_collection.findOne({_id: ObjectID( collectionID ) }, callback);
    },

    ping: function(email, userID, openID, provider, callback ){
      emails_collection.findOne( { email:email, userID:userID  }, function(err, Email ) {
        if (err){
          callback(err);
        }else if(Email){
          if( !Email.activated ){
            emails_collection.update(
                { email:email, userID:userID  },
                { $set:{ pinged: new Date()}});
          }
          callback(err, Email);
        }else{
          emails_collection.insert( {
                email:email,
                userID: userID,
                openID:openID,
                pinged: new Date(),
                clicked:new Date(),
                activated:false,
                provider : provider
              },
              { safe: true },
              function(err, Email) {
                callback(err, err ? null : Email[0], true ); // true, this a newly added item
              }
          );
        }
      });

    },
    activate: function(ID, callback){
      emails_collection.findOne( {"_id": ObjectID(ID) }, function(err, email ) {
        if (err){
          callback(err);
        }else if(!email){
          callback('NotFound');
        }else{
          emails_collection.update(
              { _id: ObjectID(ID) },
              { $set:{
                clicked:new Date(),
                activated:true
              }}
          );
          db.users.setEmail( email.userID,  email.email );
          db.openIDs.setEmail(email.openID, email.email );
          callback(err, email);
        }
      });
    }
  },

  posts: {
    // Find all posts in reverse order (blog order)
    findAll: function(callback) {
      posts_collection.find().sort({title: 1}).toArray(function(err, posts) { // created: -1
        callback(err, posts);
      });
    },
    deleteOneById: function( id, callback ){
        posts_collection.remove({ _id: mongo.ObjectID(id) },  { safe: true }, callback);
      //  if( callback ){callback(null)};
    },
     replaceOneById: function( id, obj, callback ){
          posts_collection.update({ _id: mongo.ObjectID(id) }, obj,  { safe: true }, callback ); //  ,  { safe: true },
     },

      // Fetch a particular post by its slug
    findOneBySlug: function(slug, callback) {
      posts_collection.findOne({slug: slug}, function(err, post) {
        callback(err, post);
      });
    },
      findOneById: function(id, callback) {
          posts_collection.findOne({ _id: mongo.ObjectID(id)}, function(err, post) {
              callback(err, post);
          });
      },
      // Insert a new post
    insert: function(post, callback) {
      // Create a reasonable slug from the title
      post.slug = db.slugify(post.url);
      // Set the creation date/time
      post.created = new Date();
      // Pass the 'safe' option so that we can tell immediately if
      // the insert fails (due to a duplicate slug, for instance)
      posts_collection.insert(post, { safe: true }, function(err) {
        if (err)
        {
          callback(err);
        } 
        else
        {
          callback(err, post);
        }
      });
    }
  },
  // Create a reasonable slug for use in URLs based on the supplied string
  slugify: function(s){
    // Note: you'll need to use xregexp instead if you need non-Latin character
    // support in slugs
    s = s.replace(/[^A-Za-z0-9]/g, '-');    // Everything not a letter or number becomes a dash
    s = s.replace(/\-+/g, '-');             // Consecutive dashes become one dash
    s = s.replace(/^\-/, '');               // Leading dashes go away
    s = s.replace(/\-$/, '');               // Trailing dashes go away
    if (!s.length)                           // If the string is empty, supply something so that routes still match
    {
      s = 'none';
    }
    return s.toLowerCase();
  }
};

