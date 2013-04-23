var debug = require('debug')('linksTo:app.js');
var  box = require('./box');

// bootstrap
    require('./plugins/express');
    require('./plugins/middleware');
    require('./plugins/passport');
    require('./plugins/utils');
    require('./plugins/db');
//    require('./plugins/server');

// dummy entry
//box.on('listen', function(cb){ cb(null, 'dummy listen'); });
//box.on('atach-path2', function(app, config, cb){ cb(null, 'dummy atach-path'); });

var color = require('colors')
    , express = box.express //require('express')
    , app = box.app         //express()
    , path = require('path')

    , bootstrapPath = path.join(__dirname, 'node_modules', 'bootstrap')
    , config = app.locals.config = box.config = require('./config').init(  'dev' )
    , passports = require('./passports')
    , routes = require('./routes')
    ;

config.less.paths.push ( path.join(bootstrapPath, 'less') );

box.parallel('init', app, config, function(err, result){
    if (err) return box.emit('error', err);
    debug(  'Init results:' +  box.utils.inspect(result) );

    box.parallel('atach-paths', app, config, function(err2, result2){
        if (err) return box.emit('error', err2);
        debug(  'Atach-path results:' +  box.utils.inspect(result2) );

        app.use(express.static(path.join(__dirname, 'public')));
        app.use(require('less-middleware')( config.less ));
    //        app.use('/img', express.static(path.join(bootstrapPath, 'img')));


        box.parallel('listen', function (err, result) {
            debug( "Listen event results:" +  box.utils.inspect(result ));
            debug('Links.To server listening on port ' + app.get('port'));
            console.log('Links.To server listening on port ' + app.get('port') );
        });

    });
});



