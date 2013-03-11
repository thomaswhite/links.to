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
            created : new Date(),
            gravatarURL:OpenID.gravatarURL || null,
            gravatarURL_https:OpenID.gravatarURL_https || null,
            gravatarURL96:OpenID.gravatarURL96 || null,
            gravatarURL96_https:OpenID.gravatarURL96_https || null
        };
    };

    this.userGravatar = function ( User, Email, replace ){
        var settings = common_config.gravatar;
        var settings96 = _.defaults({s:96}, settings );
        var email = User.email || Email || 'noemail@nodomain.com';

        if( replace || null === User.gravatarURL  ){
            User.gravatarURL =  gravatar.url( email, settings );
        }
        if( replace || null === User.gravatarURL96  ){
            User.gravatarURL96 =  gravatar.url(  email, settings96 );
        }
        if( replace || null === User.gravatarURL_https  ){
            User.gravatarURL_https =  gravatar.url(  email, settings, true );
        }
        if( replace || null === User.gravatarURL96_https ){
            User.gravatarURL96_https =  gravatar.url(  email, settings96, true );
        }
        return User;
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
                dbCode.insertOne( 'users', dbCode.userGravatar( dbCode.newUser( waterfall.openID ), '', false) ,  { safe: true },function(err, new_User ) {
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

// ===================================

    return this;
};
