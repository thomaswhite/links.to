var debug = require('debug')('linksTo:app');
var  box = require('./box');

// bootstrap
    require('./plugins/express');
    require('./plugins/middleware');
    require('./plugins/passport');
    require('./plugins/utils');
    require('./plugins/db');
//    require('./plugins/socket-io');
//    require('./plugins/socketstream');

// dummy entry
//box.on('listen', function(cb){ cb(null, 'dummy listen'); });
//box.on('atach-path2', function(app, config, cb){ cb(null, 'dummy atach-path'); });

var   app = box.app         //express()
    , path = require('path')
    , bootstrapPath = path.join(__dirname, 'node_modules', 'bootstrap')
    , config = app.locals.config = box.config = require('./config').init(  'dev' )
    , passports = require('./passports')
    , routes = require('./routes')
    , socket = require('./socket-io')
    ;

config.less.paths.push ( path.join(bootstrapPath, 'less') );
config.__dirname = __dirname;


box.series('init', app, config, function(err, result){
    if (err) return box.emit('error', err);
    debug( "%s", box.utils.inspect(result, { showHidden: true, depth: null, colors:true }) );

    box.series('init.attach', app, config, function(err2, result2){
        if (err) return box.emit('error', err2);
        debug( "init.attach: %s", box.utils.inspect(result2) );

        box.series('init.listen', function (err, result3) {
            debug( "server : %j", result3 );
            //console.log('Links.To server listening on port ' + app.get('port') );
        });

    });
});



