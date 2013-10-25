console.log('Loading app.js...' );

var debug = require('debug')('linksTo:app')
    , dummy = debug('Application is loading...')
    , box = require('./lib/box')
    , glob = require('glob').Glob
    , path = require('path')
    , async = require('async')
    , config = box.config = require('./config').init(  'dev', __dirname )
    , requestDir = require('./lib/request-directory')
    , dummy2 = debug('Begin plugins load.')
    , gl = new glob('./plugins/*.js' , { sync:true, cache:true, nosort :true}, function (er, plugins) {
        for(var i=0; i < plugins.length; i++){
            require(path.resolve(plugins[i]));
            debug('Plugin ' + plugins[i] + ' loaded.');
        }
        debug('All plugins have been loaded.');
    })

    , app = box.app  // set in the express plugin
    , passports = require('./lib/passports')
    , socket = require('./lib/socket-io')
    , routes = require('./routes')
    , info = []
    ;

app.locals.config = config;
config.less.paths.push ( path.join( path.join(__dirname, 'node_modules', 'bootstrap') , 'less') );
// config.__dirname = __dirname;

console.log('Application is initialising...');
box.series('init', app, config, function(err, result){
    if (err) {
        return box.emit('error', err);
    }
    info.push({init : result});
    //debug(  box.utils.inspect(result, { showHidden: true, depth: null, colors:false }));
    box.series('init.attach', app, config, function(err2, result2){
        if (err) {
            return box.emit('error', err2);
        }
        info.push( {"init.attach" : result2});
        //debug( box.utils.inspect(result2, { showHidden: true, depth: null, colors:false }) );
        box.series('init.listen', function (err3, result3) {
            info.push( [
                        {"init.listen" : result3},
                        { listen : 'Links.To server listening on port ' + app.get('port')}
                       ]
                    );
            debug( box.utils.inspect(info, { showHidden: false, depth: null, colors:false }) );

            //debug( box.utils.inspect(result3, { showHidden: true, depth: null, colors:false }) );
            console.log('Links.To server listening on port ' + app.get('port') );
        });
    });
});