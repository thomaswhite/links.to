/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../box.js')
    , debug = require('debug')('linksTo:db:users')

    ;


//    addOpenID:function(userID, openID_id, callback){},
//    removeOpenID:function(userID, openID_id, callback){}
function newUser  ( OpenID ){
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



box.on('db.init', function( monk, Config, done ){
    var   settings = Config.db
        , common_config = Config.common
        , Users = box.db.coll.users = monk.get('users')
        ;


    box.on('openID.authenticated', function( waterfall, callback ){
        var criterion = waterfall.openID.justAdded ? {"openIDs": waterfall.openID._id } : {"_id":  waterfall.openID.owner };
        Users.findOne( criterion, function(err, found_User ) {
            if (err || found_User){
                found_User.type = 'user';
                waterfall.user = found_User;
                callback(err, waterfall );
            }else{
                Users.insert(  newUser( waterfall.openID ),  { safe: true }, function(err, new_User ) {
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


    done(null, 'db:users initialised.');
});

