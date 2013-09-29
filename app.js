var debug = require('debug')('linksTo:app')
    ,  box = require('./lib/box')
    , glob = require('glob').Glob
    , path = require('path')
    , config = box.config = require('./config').init(  'dev', __dirname )
;
    new glob('./plugins/*.js' , { sync:true, cache:true, nosort :true}, function (er, plugins) {
        for(var i=0; i < plugins.length; i++){
            require(path.resolve(plugins[i]));
        }
    });

var   app = box.app
    , passports = require('./lib/passports')
    , socket = require('./lib/socket-io')
    , routes = require('./routes')
    ;

app.locals.config = config;
config.less.paths.push ( path.join( path.join(__dirname, 'node_modules', 'bootstrap') , 'less') );
// config.__dirname = __dirname;

box.series('init', app, config, function(err, result){
    if (err) {
        return box.emit('error', err);
    }
    debug(  box.utils.inspect(result, { showHidden: true, depth: null, colors:false }));
    box.series('init.attach', app, config, function(err2, result2){
        if (err) {
            return box.emit('error', err2);
        }
        debug( box.utils.inspect(result2, { showHidden: true, depth: null, colors:false }) );
        box.series('init.listen', function (err3, result3) {
             debug( box.utils.inspect(result3, { showHidden: true, depth: null, colors:false }) );
                    //console.log('Links.To server listening on port ' + app.get('port') );
        });
    });
});