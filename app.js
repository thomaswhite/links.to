var debug = require('debug')('linksTo:app')
    ,  box = require('./modules/box')
    , glob = require('glob')
;

    require('./plugins/kleiDust');
    require('./plugins/express');
    require('./plugins/middleware');
    require('./plugins/passport');
    require('./plugins/utils');
    require('./plugins/db');
/*
 glob( 'plugins/*.js' ).on('match', {cache:true, nosort :true }, function (file) {
    require(box.utils.path.resolve(file));
});
*/

var   app = box.app         //express()
    , path = require('path')
    , bootstrapPath = path.join(__dirname, 'node_modules', 'bootstrap')
    , config = app.locals.config = box.config = require('./config').init(  'dev' )
    , pageSrcaper = require('./modules/pageSrcaper.js').init(config.request  )
    , passports = require('./modules/passports')
    , socket = require('./modules/socket-io')
    , routes = require('./routes')
    ;

config.less.paths.push ( path.join(bootstrapPath, 'less') );
config.__dirname = __dirname;

box.series('init', app, config, function(err, result){
    if (err) {
        return box.emit('error', err);
    }
    debug( '\n' + box.utils.inspect(result, { showHidden: true, depth: null, colors:true }) );

    box.series('init.attach', app, config, function(err2, result2){
        if (err) return box.emit('error', err2);
        debug( "init.attach: %s", box.utils.inspect(result2) );

        box.series('init.listen', function (err, result3) {
            debug( "server : %j", result3 );
            //console.log('Links.To server listening on port ' + app.get('port') );
        });

    });
});



