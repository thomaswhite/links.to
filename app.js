var debug = require('debug')('linksTo:app.js');
debug("Loading" );

/*
var that = require('that')
    , async = require('async')
    , path = require('path')
    , bootstrapPath = path.join(__dirname, 'node_modules', 'bootstrap')
    , config = require('./config.js').init( __dirname, bootstrapPath )

    ;
that.on('error', console.error);

// bootstrap


var tasks = that.listeners('init').map(function (listener) {
    return listener.bind(that, config);
});

async.series(tasks, function (err) {
    if (err) return that.emit('error', err);

    that.emit('listen', function () {
        console.log('server listening on port ' + that.server.port);
    });
});
*/

/*
 require('./plugins/server');
 require('./plugins/static');
 require('./plugins/view');
 require('./plugins/controller');
 */

var  box = require('./box');

// bootstrap
    require('./plugins/utils');
    require('./plugins/db');
    require('./plugins/middleware');


// dummy entry
box.on('listen', function(cb){ cb(null, 'dummy listen'); });

var color = require('colors')

    , express = require('express')
    , app = express()
    , http = require('http')

    , cons = require('consolidate')
    , swig = require('swig')
    , mongoStore = require('connect-mongo')(express)

    , path = require('path')
    , bootstrapPath = path.join(__dirname, 'node_modules', 'bootstrap')
    , config = require('./config').init(  'dev' )

    , routes = require('./routes').init( app, config, box )
    //, db = require('./db').init( app, config  )
    , passports = null
    ;

config.less.paths.push ( path.join(bootstrapPath, 'less') );

app.locals.config = box.config = config;

box.parallel('init', app, config, function(err, result){

    if (err) return box.emit('error', err);
    debug(  'Init results:' +  box.utils.inspect(result) );

    box.parallel('listen', function (err, result) {
        console.log( box.utils.inspect(result ));
        console.log('server listening on port ' + (box.server ? box.server.port : '???') );
    });
});



    app.configure(function () {
        app.engine('html', cons.swig );
        app.set('view engine', 'html');
        app.set('views',  config.views );
        swig.init( config.swig );

        app.set('port', config.port );
        app.use(express.favicon());
        app.use(express.logger('dev'));
        app.use(express.bodyParser());
        app.use(express.methodOverride());
        app.use(express.cookieParser('your secret here'));
        app.use(express.session({
            secret: config.common.session.secret
            , cookie: { maxAge: 1000 * config.common.session.maxAgeSeconds}
            , store: new mongoStore(config.db)
        }));

        passports  = require('./passports').init( app, config.passport, box );

        app.use(app.router);
        app.use('/img', express['static'](path.join(bootstrapPath, 'img')));
        app.use(require('less-middleware')( config.less ));
        app.use(express.static(path.join(__dirname, 'public')));
    });

    app.configure('development', function () {
        app.use(express.errorHandler());
    });


    app.get('/coll/mine',       routes.collections.mine);
    app.get('/coll',            routes.collections.all);
    app.post('/coll/new',       routes.collections.add);

    app.get('/coll/:id',        routes.collections.get);
    app.get('/w/c/:id',         routes.collections.get);
    app.get('/coll/:id/delete', routes.collections.delete);

    app.post('/link/new/:coll?',        routes.links.add);
    app.get('/link/:id/delete/:coll?',  routes.links.delete);

//    app.get('/favorites',        routes.collections.favorites);
//    app.get('/favorites/mine',   routes.collections.favorites_mine);

//    app.get('/tags',        routes.collections.tags);
//    app.get('/tags/mine',   routes.collections.tags_mine);


    http.createServer(app).listen(config.port, function () {
        debug("Links.To" + " server listening on port " + ('' + app.get('port'))  );
        console.log("Links.To" + " server listening on port " + ('' + app.get('port'))  );
    });



