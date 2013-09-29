/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 03/03/13
 * Time: 23:25
 * To change this template use File | Settings | File Templates.
 */
var debug = require('debug')('linksTo:db');

var ShortId  = require('shortid').seed(96715)
    , mongo = require('mongodb')
    , Monk  = require('monk')
    , gravatar = require('gravatar')
    , _ = require('lodash')
    , async = require('async')

    , box = require('./../lib/box.js')

    , app
    , db
    , settings
    , common_config
    , dbCode
    , monk

    , OpenIDs
    , Users
    , Emails
    , Collections
    , Links
    , Tags
    , Pages
    , AuthTemp
    , Dummy

    ;

function ShorterID(){
    return  ShortId.generate().substr(0, settings.db.short_id_length);
};

function noop(){}


exports.init = function( App, Config ){
    app = App;
    settings = Config.db;
    common_config = Config.common;
    dbCode = this;

    this.monk = monk = Monk(settings.host + ':' + settings.port + '/' + settings.db + '?auto_reconnect=true&poolSize=8') ;

    box.db = {
        monk :  monk
    }

    AuthTemp   = monk.get('auth_temp');
    OpenIDs = monk.get('openID');
    Users   = monk.get('users');
    Emails  = monk.get('emails');
    Collections = monk.get('collections');
    Links   = monk.get('links');
    Tags    = monk.get('tags');
    Pages   = monk.get('pages');
    Dummy   = monk.get('dummy');

    var session = monk.get(settings.collection);
    session.index({expires: 1}, { expireAfterSeconds: common_config.session.maxAgeSeconds });
    session.options.safe = false;

    AuthTemp.index({expires: 1}, { expireAfterSeconds: 60 });
    AuthTemp.options.safe = false;

// ================ openID =============================
    // called as waterfall

    box.on('openID.authenticated', function( waterfall, callback ){
        var oOpenID = _.extend( { owner:''} ,waterfall.picked_openID);
        OpenIDs.findOne( {"provider":oOpenID.provider, "id":oOpenID.id }, function(err, foundOpenID) {
            if (err ){
                callback(err);
            }else if ( foundOpenID ){
                foundOpenID.type = 'openID';
                waterfall.openID = foundOpenID;
                callback(err, waterfall );
            }else{
                OpenIDs.insert( oOpenID,  { safe: true }, function(err, savedOpenID) {
                    savedOpenID.justAdded = true;
                    waterfall.openID = savedOpenID;
                    callback(err, waterfall );
                })
            }
        });
    });
    box.on('not-in-use.email.verified', function( oEmail, callback){
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
    box.on('not-in-use.email.pinged' , function(email, userID, openID, provider, callback ){
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
    box.on('not-in-use.email.confirmed', function(emailID, callback){
         dbCode.findOne('emails', {"_id": dbCode.ObjectID(emailID) }, function(err, Email ) {
                if (err){
                    callback(err);
                }else if(!Email){
                    callback('email NotFound');
                }else{
                    dbCode.set('emails', { "_id": Email._id  }, {  verified:true }, function(err2, Email2){
                        box.parallel( 'email.verified', Email2, function(err, result){
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
            email: OpenID.email || '',
            openIDs:[ OpenID._id ],
            active_openID : OpenID._id,
            active_provider : OpenID.provider,
            shortID : ShorterID(),
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

    box.on('openID.authenticated', function( waterfall, callback ){
        var criterion = waterfall.openID.justAdded ? {"openIDs": waterfall.openID._id } : {"_id":  waterfall.openID.owner };
        Users.findOne( criterion, function(err, found_User ) {
            if (err || found_User){
                    found_User.type = 'user';
                    waterfall.user = found_User;
                callback(err, waterfall );
            }else{
                Users.insert(  dbCode.newUser( waterfall.openID ),  { safe: true }, function(err, new_User ) {
                    new_User.type = 'user';
                    new_User.justAdded = true;
                    waterfall.user = new_User;
                    OpenIDs.updateById( waterfall.openID._id,  {$set: { owner:new_User._id }} );
                    callback(err, waterfall );
                });
            }
        });
    });
    box.on('not-in-use.email.pinged' , function(email, userID, openID, provider, callback ){
        dbCode.set('users', {_id: dbCode.ObjectID(userID) },{
            email:email,
            emailPinged: new Date()
        });
    });
    box.on('not-in-use.email.verified' , function(oEmail, callback ){
        // TODO save emails as an array to allow more then one active email at a time
        dbCode.set('users', {_id: dbCode.ObjectID(oEmail.userID) },{
            email:oEmail.email,
            emailVerified:new Date()
        }, callback);
    });


// ==================  collections =================

    box.on('collection.add', function( oColl, callback){
        Collections.insert( oColl,  { safe: true }, callback);
    });

    box.on('collection.get', function( waterfall, callback){
        Collections.findById(waterfall.coll_id, function(err, found_coll ){
            if( found_coll) {
                found_coll.type = "collection";
            }
            waterfall.collection  = found_coll;
           callback(err, waterfall);
        });
    });

    box.on('collection.delete', function(coll_id, callback){
        if( !coll_id ){
            throw "Collection ID expected!";
        }else{
            // TODO move existing links into _unassigned_links collection that every user has
            Collections.remove( {_id: coll_id }, callback );
        }
    });


    box.on('collection.update', function(coll_id, toUpdate, callback){
        Collections.updateById( coll_id, {$set: toUpdate }, callback );
    });

    box.on('collection.eip', function(id, field, value, callback){
        var o = {};
        o[field] = value;
        Collections.updateById( coll_id, {$set: o }, callback );
    });

    box.on('collections.list', function( filter, limit, sort, callback){
        Collections.find( filter || {}, {limit:limit || 64, sort:sort || []}, function(err, result){
            if( result ){
                result.type = 'collections-list';
            }
            callback(err, result);
        });
    });

    box.on('link.added', function( newLink, callback){
        var link_id =  newLink._id;
        Collections.update(
            { _id: newLink.collection, "links" :{ $ne : link_id }},
            {  $push: {  "links" : link_id } },
            callback
        );
    });
    box.on('link.delete', function(link_id, coll_id, callback){
        Collections.updateById(
            coll_id,
            {  $pull: {  "links" : Collections.id(link_id) } },
            callback
        );
    });
    box.on('link.tag.updated', function( Tag, link_id, callback){

    });

    this.not_in_use_collections ={

        update: function( collectionID, updated, callback ){
            collections_collection.update( {_id: ObjectID(collectionID) }, updated,  function(err, collection) {
                callback(err, err ? null : collection[0] );
            });
        },

        eip: function( collectionID, field_name, new_value ){
            var updated = {$set:{ updated : new Date()}};
            updated.$set[ field_name ] = new_value;
            collections_collection.update( {_id: ObjectID(collectionID) }, updated );
        },
        eip2: function( collectionShortID, field_name, new_value ){
            var updated = {$set:{ updated : new Date()}};
            updated.$set[ field_name ] = new_value;
            collections_collection.update( { shortID: collectionShortID  }, updated );
        }
    };

// ========================  links ======================
    /**
     * Returns an array of the links for a collection
     */
    box.on('collection.get', function( waterfall, callback){
        if( waterfall.collection && waterfall.collection.links && waterfall.collection.links.length ){
            var options = waterfall.options || { sort:[['updated', -1]]};
            Links.find( { _id :  { $in : waterfall.collection.links} }, options , function(err, found_links) {
                if( found_links ){
                    found_links.type = 'links-list';
                }
                waterfall.links = found_links;
                callback( err, waterfall );
            });
        }else{
            waterfall.links = [];
            waterfall.links.type = 'links-list';
            callback( null, waterfall );
        }
    });

    box.on('link.add', function( oLink, collection_id, callback){
        oLink.collection = collection_id; //[ Links.id( collection_id ) ];
        Links.insert( oLink,  { safe: true }, callback );
    });

    box.on('link.delete', function(link_id, coll_id, callback){
        if( !link_id ){
            throw "Link ID expected!";
        }else{
            Links.remove( {_id: link_id }, callback );
        }
    });


// ===============  tags ====================

    box.on('link.added', function( newLink, callback){
        var link_id =  newLink._id,
            newTags = [];

        if( newLink.tags ){
            async.forEach(newLink.tags, function(tag, cb){
                    Tags.insert(
                        {
                           tag: tag.word,
                           link_ID: newLink._id,
                           coll_ID: Dummy.id(newLink.collection),
                           count: tag.count,
                          url:   newLink.url
                        },
                        function(err, newTag ){
                            //debug("Tag added:\n", app.locals.inspect(newTag) );
                            newTags.push( newTag );
                            cb(null);
                        }
                    );
                },
                function(err){
                    box.parallel('tags.added',  newTags, function(err, result){
                        callback(null);
                    });
                }
            );
        }else{
            callback(null, []);
        }
    });

    box.on('link.delete', function(link_id, coll_id, callback){
        if( !link_id ){
            throw "Link ID expected!";
        }else{
            Tags.remove( { link_ID: Dummy.id(link_id) }, callback );
        }
    });


// === pages ====
    box.on('page.save', function( sBody, uri, callback){
        Pages.insert(  {
                body : sBody,
                uri: uri,
                updated : new Date(),
                state:'none'
            },
            callback
        );
    });

// ====  openID ========================

    box.on('openID.beforeAuth', function(req, callback){
        AuthTemp.findAndModify(
            {"session":req.session.id },
            {
                created : new Date(),
                session: req.session.id,
                referer: req.headers.referer
            },
            {upsert:1},
            callback
         );
    });

    box.on('openID.afterAuth', function(req, callback){
        if( req && req.session && req.session.id  ){
            AuthTemp.findOne( {"session":req.session.id }, callback );
        }else{
            callback( null, null );
        }
    });

    debug("ready" );
    return this;
};

