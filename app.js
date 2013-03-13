
var express = require('express')
    , app = express()
    , path = require('path')
    ,  _ = require('lodash')
    , EventFlow = require('eventflow')
    , http = require('http')
    , cons = require('consolidate')
    , swig = require('swig')
    , mongoStore = require('connect-mongo')(express)

    , caterpillar = require ("caterpillar")
    , logger = new caterpillar.Logger()
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
            hideFunctions: false,     // Don't output functions at all
            stream: process.stdout,   // Stream to write to, or null
            maxLength: 2048           // Truncate output if longer
    })

    , emitter = EventFlow()
    , db = require('./db.js').init( config.db, config.common, emitter )
    , passports = null
    ;

    app.locals.config = config;

    db.open(function(err){
        if( err ){
            throw err;
        }


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
                , store: new mongoStore({db:db.db, collection:config.db.connect_mongodb.collection })
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

        app.get('/authenticate',       passports.authenticate );
        app.get('/logout',             passports.logout );
        app.get('/auth-after-success', passports.auth_after_success);
        app.post('/secret/ping-email', passports.ping_email);
        app.get('/confirm/alabala/:emailID', passports.confirm_email);

        app.get('/', routes.test );
        app.get('/users', user.list);

        http.createServer(app).listen(app.get('port'), function () {
            console.log("=======================================================".blue );
            console.log("Links.To".rainbow + " server listening on port ".blue + ('' + app.get('port')).red  );
            console.log("=======================================================".blue );
        });

    });


