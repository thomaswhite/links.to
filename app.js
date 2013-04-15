
var debug = require('debug')('linksTo:app');
debug("Loading" );

var  express = require('express')
    , app = express()
    , emitter = require('eventflow')()

    , http = require('http')
    , cons = require('consolidate')
    , swig = require('swig')
    , path = require('path')
    ,  _ = require('lodash')
    , async = require('async')

    , mongoStore = require('connect-mongo')(express)

 //   , caterpillar = require ("caterpillar")
 //   , logger = new caterpillar.Logger()
    , colors = require('colors')

    , bootstrapPath = path.join(__dirname, 'node_modules', 'bootstrap')
    , config = require('./config.js').init( __dirname, bootstrapPath )
    , routes = require('./routes').init( app, config, emitter )
    , user = require('./routes/user')

    , inspect = require('eyes').inspector({
        styles: {                 // Styles applied to stdout
            all:     'cyan',      // Overall style applied to everything
            label:   'underline', // Inspection labels, like 'array' in `array: [1, 2, 3]`
            other:   'inverted',  // Objects which don't have a literal representation, such as functions
            key:     'bold',      // The keys in object literals, like 'a' in `{a: 1}`
            special: 'grey',      // null, undefined...
            string:  'green',
            number:  'magenta',
            bool:    'blue',      // true false
            regexp:  'green'      // /\d+/
        },
        pretty: true,             // Indent object literals
        hideFunctions: true,     // Don't output functions at all
        stream: process.stdout,   // Stream to write to, or null
        maxLength: 8192           // Truncate output if longer
    })

    , dummy = debug("lodules loaded" )
    , db = require('./db.js').init( app, config.db, config.common, emitter )
    , passports = null
    ;

    app.locals.config = config;
    app.locals.inspect = inspect;

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

        passports  = require('./passports.js').init( app, config.passport, emitter );

        app.use(app.router);
        app.use('/img', express['static'](path.join(bootstrapPath, 'img')));
        app.use(require('less-middleware')( config.less ));
        app.use(express.static(path.join(__dirname, 'public')));
    });

    app.configure('development', function () {
        app.use(express.errorHandler());
    });


    app.get('/',                routes.top );
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
        debug("Links.To".rainbow + " server listening on port ".white + ('' + app.get('port')).red  );
    });



