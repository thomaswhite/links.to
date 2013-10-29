/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../lib/box')
    , debug = require('debug')('linksTo:db:openID')

    ;

box.on('db.init', function(  Config, done ){
    var   settings = Config.db
        , common_config = Config.common
        , OpenIDs = box.db.coll.openIDs = box.db.monk.get('openID')
        , AuthTemp   = box.db.monk.get('auth_temp')
        ;

    OpenIDs.ensureIndex( { provider: 1, id:1, email:1 }); // , {background:true}
    AuthTemp.ensureIndex( {session:1}, {expireAfterSeconds:1800});

    box.on('openID.authenticated', function( waterfall, callback ){
        var oOpenID = box.utils._.extend( { owner:''} ,waterfall.picked_openID);
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
                });
            }
        });
    });

    box.on('openID.beforeAuth', function(req, callback){
        if( !req.session ){
            callback();
        }else{
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
        }
    });

    box.on('openID.afterAuth', function(req, callback){
        if( req && req.session && req.session.id  ){
            AuthTemp.findOne( {"session":req.session.id }, callback );
        }else{
            callback( null, null );
        }
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

    box.utils.later( done, null, 'db:openID');
});