/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:25
 */

var   box = require('../box.js')
    , debug = require('debug')('linksTo:db')
    , Monk  = require('monk')

    , glob = require('glob')

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
    }
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


//    var controller = that.middler;
    var modules = [];

    var search = glob( settings.dbModules );
    search.on('match', function (file) {
        var filename = box.utils.path.resolve(file);
        modules.push( filename );
        require(filename);
    });
    search.once('error', initDone );
    search.once('end', function () {
        box.parallel('db.init', monk, Config, function(err, result){
            var ts2   = new Date().getTime();
            result.push( 'plugin db initialised: ' + (ts2 - ts) + ' ms')     ;
            initDone(null, result );
        });
    });


});

