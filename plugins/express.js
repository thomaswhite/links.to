var box = require('../box.js')
    , express    = box.express =  require('express.io')
    , app        = box.app = express()
    , mongoStore = require('connect-mongo')(express)
    , path       = require('path')

    , cons = box.cons = require('consolidate')

//    , http = require('http')
    , config;

app.http().io();
//box.server = require('http').Server(app);

app.configure('development', function () {
    app.use(express.errorHandler());
});

box.on('init', function (App, Config, done) {
    config = Config;

    app.set('port', config.port );

    box.cookieParser = express.cookieParser(config.common.session.secret);
    box.sessionStore = new mongoStore(config.db);


    app.configure(function () {
            app.use(express.logger('dev'));
            app.use(express.favicon());
            app.use(
                express.bodyParser({
                    keepExtensions: true,
                    uploadDir: Config.__dirname + Config.upload.dir,
                    limit: '10mb'
                })
            );
            app.use(express.json());
            app.use(express.urlencoded());

            app.use(express.methodOverride());
            app.set('views',  config.views );

            app.engine('dust', box.kleiDust.dust);
            app.set('view engine', 'dust');
            app.set('view options', {layout: false});

            app.use( box.cookieParser );
            app.use(
                express.session({
                    secret: config.common.session.secret
                    , cookie: { maxAge: 1000 * config.common.session.maxAgeSeconds}
                    , store: box.sessionStore
                })
            );
    });

    app.io.configure(function() {
            app.io.enable('browser client minification');  // send minified client
            //    app.io.enable('browser client gzip');          // gzip the file
            // app.io.set('log level', 1);                    // reduce logging
    });


    box.app.on('error', box.emit.bind(box, 'error'));

    box.on('init.attach', function (app, config, cb) {
          app.use(express.compress());
          app.use(require('less-middleware')( config.less ));
          app.use(express.static(path.join(config.__dirname, 'public')));
          cb(null, path.join(config.__dirname, 'public') + ' attached' );
    });

    box.on('init.listen', function (cb) {
          app.listen( config.port );
          // box.server.listen(config.port);
          // box.emit('init.server', box.server);
          cb(null, 'listening on port #' +config.port );
    });

    done(null, 'plugin express.io initialised');
});
