var debug = require('debug')('linksTo:app')
    ,  box = require('./modules/box')
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
    , passports = require('./modules/passports')
    , socket = require('./modules/socket-io')
    , routes = require('./routes')
    ;

app.locals.config = config;
config.less.paths.push ( path.join( path.join(__dirname, 'node_modules', 'bootstrap') , 'less') );
config.__dirname = __dirname;

box.series('init', app, config, function(err, result){
    if (err) {
        return box.emit('error', err);
    }
    debug( '\n' + box.utils.inspect(result, { showHidden: true, depth: null, colors:true }) );

    box.series('init.attach', app, config, function(err2, result2){
        if (err) { return box.emit('error', err2); }
        debug( "init.attach: %s", box.utils.inspect(result2) );

        box.series('init.listen', function (err, result3) {
            debug( result3 );
            //console.log('Links.To server listening on port ' + app.get('port') );
        });

    });
});