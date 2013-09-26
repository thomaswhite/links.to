/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:25
 */

var   box = require('../modules/box.js')
    , debug = require('debug')('linksTo:db')
    , Monk  = require('monk')

    , glob = require('glob').Glob
    , path = require('path')


    , app
    , settings
    , common_config
    , monk
    ;


box.on('init', function (App, Config, initDone) {
    var ts   = new Date().getTime();

    app = App;
    settings = Config.db;
    common_config = Config.common;
    monk = Monk(settings.host + ':' + settings.port + '/' + settings.db + '?auto_reconnect=true&poolSize=8');

    box.db = {
        monk :  monk,
        Dummy : monk.get('dummy'),
        coll:{}
    };
    var AuthTemp   = monk.get('auth_temp');
    AuthTemp.index({expires: 1}, { expireAfterSeconds: 60 });
    AuthTemp.options.safe = false;

    var session = monk.get(settings.collection);
    session.index({expires: 1}, { expireAfterSeconds: common_config.session.maxAgeSeconds });
    session.options.safe = false;

    box.on('db.init', function( monk2, Config, done ){
        var settings = Config.db
            , common_config = Config.common;
        done(null, 'db:session and db:authTemp initialised.');
    });



    new glob( settings.dbModules, { sync:true, cache:true }, function (er, files) {
        if( er ){
            initDone(er);
        }else{
            for(var i=0; i < files.length; i++){
                 require(path.resolve(files[i]));
            }
             box.parallel('db.init', monk, Config, function(err, result){
                 var ts2   = new Date().getTime();
                 result.push( 'plugin db initialised: ' + (ts2 - ts) + ' ms')     ;
                 initDone(null, result );
             });

        }
    });




/*
    var search = new glob( settings.dbModules );
    search.on('match', function (file) {
            require( path.resolve(file) );
    });
    search.once('error', initDone );
    search.once('end', function () {
        box.parallel('db.init', monk, Config, function(err, result){
            var ts2   = new Date().getTime();
            result.push( 'plugin db initialised: ' + (ts2 - ts) + ' ms')     ;
            initDone(null, result );
        });
    });
*/

});



/*
 https://github.com/LearnBoost/monk

 users.index('name.first', fn);
 users.index('email', { unique: true }); // unique
 users.index('name.first name.last') // compound
 users.index({ 'email': 1, 'password': -1 }); // compound with sort
 users.index('email', { sparse: true }, fn); // with options
 users.indexes(fn); // get indexes
 users.dropIndex(name, fn); // drop an index
 users.dropIndexes(fn); // drop all indexes

 */