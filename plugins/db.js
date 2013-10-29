/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:25
 */

var   box = require('../lib/box')
    , Monk  = require('monk')
    , path = require('path')
    , request_files_from_directory = require('../lib/request_files_from_directory')

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

    box.on('db.init', function( Config, done ){
        var settings = Config.db
            , common_config = Config.common;

        box.utils.later( done, null, 'db:session');
    });

    //get : function(path, excludeNames, initParams)
    var modules = request_files_from_directory.get( settings.dbModules, [], Config);
    box.parallel('db.init', Config, function(err, result){
        var ts2   = new Date().getTime();
        initDone(null,  '+' + ( new Date().getTime() - ts) + 'ms plugin "db" initialised [' + result.join(', ') + ']');
    });

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