/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 03/03/13
 * Time: 23:25
 * To change this template use File | Settings | File Templates.
 */
var debug = require('debug')('linksTo:db');
debug("Loading" );

var ShortId  = require('shortid').seed(96715)
    , mongo = require('mongodb')
    , monk  = require('monk')
    , gravatar = require('gravatar')
    , _ = require('lodash')

    , db
    , settings
    , common_config
    , emitter
    , dbCode
    , monk

    , OpenIDs
    , Users
    , Emails
    , Collections
    , Links
    , Tags


    , coll = {
        openID:'openUD',
        collections:'collections',
        links: 'links',
        users:'users'
    };

function noop(){}

exports.init = function( configDB, commonConfig, Emitter ){
    settings = configDB;
    common_config = commonConfig;
    emitter  = Emitter;
    dbCode = this;

    this.monk = monk = monk(settings.host + ':' + settings.port + '/' + settings.db + '?auto_reconnect=true&poolSize=8');
    monk.get(configDB.collection).index({expires: 1}, { expireAfterSeconds: common_config.session.maxAgeSeconds });

    OpenIDs = monk.get('openID');
    Users   = monk.get('users');
    Emails  = monk.get('emails');
    Collections = monk.get('collections');
    Links   = monk.get('links');
    Tags    = monk.get('tags');


    this.objectID = mongo.ObjectID;

    this.db = db = new mongo.Db(
        settings.db,
        new mongo.Server( settings.host, settings.port, {auto_reconnect: false, poolSize: 8}),
        {native_parser:false, w:0} //'majority'
    );

    this.open = function(callback) {
        db.open(function(err){
            if( err) {
                callback( err );
            }else {
                callback(err, this );
            }
        });
    };
    this.shorterID =  function ShorterID(){
        return  ShortId.generate().substr(0, settings.db.short_id_length);
    };
    this.find = function(name, query, limit, callback) {
        db.collection(name).find(query).sort({_id: -1}).limit(limit).toArray(callback);
    };
    this.findOne = function(name, query, callback) {
        db.collection(name).findOne(query, callback);
    };
    this.insert = function(name, items, param, callback) {
        db.collection(name).insert(items, param || {}, callback);
    };
    this.insertOne = function(name, item,  param, callback) {
        dbCode.insert(name, item, function(err, items) {
            items[0].justAdded = true;
            callback(err, items[0]);
        });
    };
    this.set =  function(name, criteria, oToSet, callback) {
        db.collection(name).update( criteria, {$set: oToSet }, callback );
    };
/*
    emitter.on('db.find', function( name, query, limit, callback){
        dbCode.find(name, query, limit, callback);
    });
    emitter.on('db.findOne', function( name, query, limit, callback){
        dbCode.findOne(name, query, callback);
    });
    emitter.on('db.insert', function(name, items, param, callback) {
        dbCode.insert( name, items, param, callback );
    });
    emitter.on('db.insertOne', function(name, item,  param, callback) {
        dbCode.insertOne(name, item,  param, callback);
    });
    emitter.on('db.set',  function(name, criteria, oToSet, callback) {
        dbCode.set(name, criteria, oToSet, callback);
    });
*/

// ================ openID =============================
    // called as waterfall
    emitter.on('openID.authenticated', function( waterfall, callback ){
        var oOpenID = _.extend( {type:'openID', owner:''} ,waterfall.picked_openID);
        OpenIDs.findOne( {"provider":oOpenID.provider, "id":oOpenID.id }, function(err, foundOpenID) {
            if (err ){
                callback(err);
            }else if ( foundOpenID ){
                callback(err, {openID:foundOpenID});
            }else{
                OpenIDs.insert( oOpenID,  { safe: true }, function(err, savedOpenID) {
                    savedOpenID.justAdded = true;
                    waterfall.openID = savedOpenID;
                    callback(err, waterfall );
                })
            }
        });
    });
    emitter.on('not-in-use.email.verified', function( oEmail, callback){
        dbCode.set('openID',
             {_id: dbCode.ObjectID(oEmail.openID) },
             {
                email:oEmail.email,
                emailVerified:new Date()
             },
             function(err, OpenID ){
                 callback(err, OpenID); // TODO check id this is needed
             }
        );
    });

// ===================== emails ============================
    this.newEmail = function( email, userID, openID, provider ){
        return {
            type:'email',
            email:email,
            userID:userID,
            openID:openID,
            pinged: new Date(),
            verified:false,
            provider : provider
        }
    };
    emitter.on('not-in-use.email.pinged' , function(email, userID, openID, provider, callback ){
        dbCode.findOne('emails', { email:email, userID:userID  }, function(err, Email ) {
            if (err){
                callback(err);
            }else if(Email){
                if( !Email.verified ){
                    dbCode.set('emails', { "_id": Email._id  },{ pinged: new Date()});
                }
                callback(err, Email);
            }else{
                dbCode.insertOne( 'emails',
                    dbCode.newEmail(email, userID, openID, provider),
                    { safe: true },
                    function(err, Email) {
                        callback(err, Email ); // TODO check if we really need this
                    }
                );
            }
        });

    });
    emitter.on('not-in-use.email.confirmed', function(emailID, callback){
         dbCode.findOne('emails', {"_id": dbCode.ObjectID(emailID) }, function(err, Email ) {
                if (err){
                    callback(err);
                }else if(!Email){
                    callback('email NotFound');
                }else{
                    dbCode.set('emails', { "_id": Email._id  }, {  verified:true }, function(err2, Email2){
                        emitter.parallel( 'email.verified', Email2, function(err, result){
                            results.unshift(Email2);
                            callback(err2, results );
                        });
                    })
                }
         });

    });

    // =========================== users =======================
    //    addOpenID:function(userID, openID_id, callback){},
    //    removeOpenID:function(userID, openID_id, callback){}
    this.newUser = function ( OpenID ){
        var user =  {  // _.extend( {}, OpenID,
            type:'user',
            email: OpenID.email || '',
            openIDs:[ OpenID._id ],
            active_openID : OpenID._id,
            active_provider : OpenID.provider,
            created : new Date()
        };
        if( OpenID.gravatarURL ){
            user.gravatarURL   = OpenID.gravatarURL;
            user.gravatarURL96 = OpenID.gravatarURL;
        }
        if( OpenID.gravatarURL_https ){
            user.gravatarURL_https   = OpenID.gravatarURL_https;
            user.gravatarURL96_https = OpenID.gravatarURL_https;
        }
        return user;
    };

    emitter.on('openID.authenticated', function( waterfall, callback ){
        var criterion = waterfall.openID.justAdded ? {"openIDs": waterfall.openID._id } : {"_id":  waterfall.openID.owner };
        Users.findOne( criterion, function(err, found_User ) {
            if (err || found_User){
                waterfall.user = found_User;
                callback(err, waterfall );
            }else{
                Users.insert(  dbCode.newUser( waterfall.openID ),  { safe: true }, function(err, new_User ) {
                    new_User.justAdded = true;
                    waterfall.user = new_User;
                    OpenIDs.updateById( waterfall.openID._id,  {$set: { owner:new_User._id }} );
                    callback(err, waterfall );
                });
            }
        });
    });

    emitter.on('not-in-use.email.pinged' , function(email, userID, openID, provider, callback ){
        dbCode.set('users', {_id: dbCode.ObjectID(userID) },{
            email:email,
            emailPinged: new Date()
        });
    });
    emitter.on('not-in-use.email.verified' , function(oEmail, callback ){
        // TODO save emails as an array to allow more then one active email at a time
        dbCode.set('users', {_id: dbCode.ObjectID(oEmail.userID) },{
            email:oEmail.email,
            emailVerified:new Date()
        }, callback);
    });


// ==================  collections =================

    this.newCollection = function(oColl){
        return {
            type:'collection',
            owner: oColl.owner,
            title: oColl.collectionName.trim(),
            description: oColl.description || 'Description...',
            linksCount:0,
            links:[]
        }
    };

    emitter.on('collection.add', function( oColl, callback){
        Collections.insert( dbCode.newCollection( oColl ),  { safe: true }, callback);
    });

    emitter.on('collection.get', function( coll_id, callback){
        Collections.findById(coll_id, callback );
    });

    emitter.on('collection.delete', function(coll_id, callback){
        Collections.removeById( coll_id, callback );
    });


    emitter.on('collection.update', function(coll_id, toUpdate, callback){
        Collections.updateById( coll_id, {$set: toUpdate }, callback );
    });

    emitter.on('collection.eip', function(id, field, value, callback){
        var o = {};
        o[field] = value;
        Collections.updateById( coll_id, {$set: o }, callback );
    });

    emitter.on('collections.list', function( filter, limit, sort, callback){
        Collections.find( filter || {}, {limit:limit || 64, sort:sort || []}, function(err, result){
            // .toArray()
            if( result ){
                result.type = 'collections-list';
            }
            callback(err, result);
        });
    });

    emitter.on('link.add', function(waterfall, callback){
    });
    emitter.on('link.remove', function(waterfall, callback){
    });
    emitter.on('link.tag.updated', function(waterfall, callback){
    });

    this.collections ={
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
    };

// ========================  links ======================
    emitter.on('collection.get', function( coll_id, callback){
        Collections.findById(coll_id, callback );
        //return links for the collection
    });

    debug("ready" );
    return this;
};
