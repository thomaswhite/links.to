var debug = require('debug')('linksTo:app');
var  box = require('./box');

// bootstrap
    require('./plugins/express');
    require('./plugins/middleware');
    require('./plugins/passport');
    require('./plugins/utils');
    require('./plugins/db');
    require('./plugins/socketstream');

//    require('./plugins/server');

// dummy entry
//box.on('listen', function(cb){ cb(null, 'dummy listen'); });
//box.on('atach-path2', function(app, config, cb){ cb(null, 'dummy atach-path'); });

var express = box.express //require('express')
    , app = box.app         //express()
    , path = require('path')

    , bootstrapPath = path.join(__dirname, 'node_modules', 'bootstrap')
    , config = app.locals.config = box.config = require('./config').init(  'dev' )
    , passports = require('./passports')
    , routes = require('./routes')
    ;
require('./socketstream')

config.less.paths.push ( path.join(bootstrapPath, 'less') );
config.__dirname = __dirname;


box.parallel('init', app, config, function(err, result){
    if (err) return box.emit('error', err);
    debug( "%s", box.utils.inspect(result, { showHidden: true, depth: null, colors:true }) );

    box.parallel('atach-paths', app, config, function(err2, result2){
        if (err) return box.emit('error', err2);
        debug( "atach-paths: %s", box.utils.inspect(result2) );

        app.use(require('less-middleware')( config.less ));

//        app.use(express.static(path.join(__dirname, 'public')));
    //        app.use('/img', express.static(path.join(bootstrapPath, 'img')));

        box.parallel('listen', function (err, result3) {
            debug( "server : %j", result3 );
            //console.log('Links.To server listening on port ' + app.get('port') );
        });

    });
});



