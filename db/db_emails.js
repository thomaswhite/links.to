/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../lib/box')
    , debug = require('debug')('linksTo:db:emails')
    ;

function newEmail ( email, userID, openID, provider ){
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

box.on('db.init', function(  Config, done ){
    var   settings = Config.db
        , common_config = Config.common
        , Emails = box.db.coll.emails = box.db.monk.get('emails')
        ;

    box.on('not-in-use.email.pinged' , function(email, userID, openID, provider, callback ){
        Emails.findOne( { email:email, userID:userID  }, function(err, Email ) {
            if (err){
                callback(err);
            }else if(Email){
                if( !Email.verified ){
                    dbCode.set('emails', { "_id": Email._id  },{ pinged: new Date()});
                }
                callback(err, Email);
            }else{
                dbCode.insertOne( 'emails',
                    newEmail(email, userID, openID, provider),
                    { safe: true },
                    function(err, Email) {
                        callback(err, Email ); // TODO check if we really need this
                    }
                );
            }
        });

    });
    box.on('not-in-use.email.confirmed', function(emailID, callback){
        Emails.findOne({"_id": dbCode.ObjectID(emailID) }, function(err, Email ) {
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
    box.utils.later( done, null, 'db:emails');

});

