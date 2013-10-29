console.log('Loading app.js...' );

var debug = require('debug')('linksTo:app')
    , box = require('./lib/box')
    , request_directory = require('./lib/request_directory')
    , path = require('path')
    , async = require('async')
    , config = box.config = require('./config').init(  'dev', __dirname )

    , plugins = request_directory.get( './plugins', [], {})
    , passports = require('./lib/passports')
    , socket = require('./lib/socket-io')
    , routes = require('./routes')
    , app = box.app  // set in the express plugin
    , info = []
    ;

app.locals.config = config;
config.less.paths.push ( path.join( path.join(__dirname, 'node_modules', 'bootstrap') , 'less') );
// config.__dirname = __dirname;

debug('Application is initialising...');
box.parallel('init', app, config, function(err, result){
    if (err) {
        return box.emit('error', err);
    }
    info.push({init : result});
    box.parallel('init.attach', app, config, function(err2, result2){
        if (err) {
            return box.emit('error', err2);
        }
        info.push( {"init.attach" : result2});
        box.parallel('init.listen', function (err3, result3) {
            info.push( {"init.listen" : result3} );
            debug( box.utils.inspect(info, { showHidden: false, depth: null, colors:false }) );
        });
    });
});