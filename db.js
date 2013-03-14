/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 03/03/13
 * Time: 23:25
 * To change this template use File | Settings | File Templates.
 */

var ShortId  = require('shortid').seed(96715)
//    , async = require('async')
    , mongo = require('mongodb')
    , gravatar = require('gravatar')
    , _ = require('lodash')

    , db
    , settings
    , common_config
    , emitter
    , dbCode

    coll = {
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

    this.objectID = mongo.ObjectID;
    this.db = db = new mongo.Db(
        settings.name,
        new mongo.Server( settings.host, settings.port, {auto_reconnect: false, poolSize: 8}),
        {native_parser:false, w:0} //'majority'
    );

    this.open = function(callback) {
        db.open(function(err){
            if( err) {
                callback( err );
            }else {
//                this.mongoStore     = new connectMongoDb({ db: db, collection:configDB.connect_mongodb.collection });
                db.collection(configDB.connect_mongodb.collection).ensureIndex( {expires: 1},
                    { expireAfterSeconds: common_config.session.maxAgeSeconds }, noop );
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
    emitter.on('openID.authenticated.off', function( oOpenID, callback ){
        oOpenID.type = 'openID';
        oOpenID.owner = '';
        emitter.emit('db.findOne', {"provider":oOpenID.provider, "id":oOpenID.id }, function(err, foundOpenID) {
            if (err ){
                callback(err);
            }else if ( foundOpenID ){
                callback(err, {openID:foundOpenID});
            }else{
                emitter.emit('db.insertOne',  'openID', oOpenID,  { safe: true }, function(err, savedOpenID) {
                    callback(err, {originalProfile: oOpenID, openID: savedOpenID } );
                });
            }
        });
    });
// ================ openID =============================
    // called as waterfall
    emitter.on('openID.authenticated', function( oOpenID, callback ){
        oOpenID.type = 'openID';
        oOpenID.owner = '';
        db.collection('openID').findOne( {"provider":oOpenID.provider, "id":oOpenID.id }, function(err, foundOpenID) {
            if (err ){
                callback(err);
            }else if ( foundOpenID ){
                callback(err, {openID:foundOpenID});
            }else{
                dbCode.insertOne( 'openID', oOpenID,  { safe: true }, function(err, savedOpenID) {
                    callback(err, {originalProfile: oOpenID, openID: savedOpenID } );
                })
            }
        });
    });
    emitter.on('email.verified', function( oEmail, callback){
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
    emitter.on('email.pinged' , function(email, userID, openID, provider, callback ){
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
    emitter.on('email.confirmed', function(emailID, callback){
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
        return  {  // _.extend( {}, OpenID,
            type:'user',
            email: OpenID.email || '',
            openIDs:[ OpenID._id ],
            active_openID : OpenID._id,
            active_provider : OpenID.provider,
            created : new Date()
        };
    };


    emitter.on('email.pinged' , function(email, userID, openID, provider, callback ){
        dbCode.set('users', {_id: dbCode.ObjectID(userID) },{
            email:email,
            emailPinged: new Date()
        });
    });
    emitter.on('email.verified' , function(oEmail, callback ){
        // TODO save emails as an array to allow more then one active email at a time
        dbCode.set('users', {_id: dbCode.ObjectID(oEmail.userID) },{
            email:oEmail.email,
            emailVerified:new Date()
        }, callback);
    });
    emitter.on('openID.authenticated', function( waterfall, callback ){
        var criterion = waterfall.openID.justAdded ? {"openIDs": waterfall.openID._id } : {"_id":  waterfall.openID.owner };
        dbCode.findOne('users', criterion, function(err, found_User ) {
            if (err || found_User){
                waterfall.user = found_User;
                callback(err, waterfall );
            }else{
                dbCode.insertOne( 'users',  dbCode.newUser( waterfall.openID ),  { safe: true },function(err, new_User ) {
                    waterfall.user = new_User;
                    dbCode.set('openID',
                        {_id: waterfall.openID._id },
                        { owner:new_User._id },
                        noop
                    );
                    callback(err, waterfall );
                });
            }
        });
    });

// ==================  collections =================


    this.newCollection = function(param){
        return {
            owner: param.owner,
            title: param.collectionName.trim(),
            description: param.description || 'Description...',
            linksCount:0,
            links:[]
        }
    };

    emitter.on('collection.add', function(waterfall, callback){
        dbCode.insertOne( 'collections',  dbCode.newCollection( waterfall ),  { safe: true },function(err, new_Collection ) {
            waterfall.collection = new_Collection;
            callback(err, waterfall );
        });
    });

    emitter.on('collection.delete', function(waterfall, callback){
    });

    emitter.on('collection.get', function( coll_id, callback){
    });

    emitter.on('collection.update', function(waterfall, callback){
    });

    emitter.on('collection.eip', function(id, field, value, callback){
    });

    emitter.on('collection.get_page', function(page, page_size, callback){
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





    return this;
};
