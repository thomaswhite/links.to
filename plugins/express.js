var box = require('../lib/box')
    , express    = box.express =  require('express.io')
    , app        = box.app = express()
    , mongoStore = require('connect-mongo')(express)
    , staticCache = require('express-static-cache')
    , path       = require('path')

    , config;

app.http().io();
//box.server = require('http').Server(app);

app.configure('development', function () {
    app.use(express.errorHandler());
});

box.on('init', function (App, Config, done) {
    var ts   = new Date().getTime();
    config = Config;

    app.set('port', config.express.port );

    box.cookieParser = express.cookieParser(config.express.session.secret);
    box.sessionStore = new mongoStore(config.db);


    app.configure(function () {
            app.use(express.logger('dev'));
            app.use(express.favicon());

// TODO: replace with https://github.com/mscdex/dicer
// reason: https://github.com/senchalabs/connect/wiki/Connect-3.0
            app.use(
                express.bodyParser({
                    keepExtensions: true,
                    uploadDir: Config.__dirname + Config.upload.dir,
                    limit: '10mb'
                })
            );

           app.enable('trust proxy')
           app.use(express.json());
            app.use(express.urlencoded());
            app.use(express.methodOverride());
            app.use(express.compress());
            app.use( box.cookieParser );
            app.use(express.responseTime());

            app.use(
                express.session({
                    secret: config.express.session.secret
                    , cookie: { maxAge: 1000 * config.express.session.maxAgeSeconds}
                    , store: box.sessionStore
                })
            );

            app.set('views',  config.views );
            app.engine('dust', box.kleiDust.dust);+
            app.set('view engine', 'dust');
            app.set('view options', {layout: false});
    });

    app.io.configure(function() {
           //  app.io.enable('browser client minification');  // send minified client
            //    app.io.enable('browser client gzip');          // gzip the file
            // app.io.set('log level', 1);                    // reduce logging
    });


    box.app.on('error', box.emit.bind(box, 'error'));

    box.on('init.attach', function (app, config, done) {
        var ts   = new Date().getTime();
        app.use(require('less-middleware')( config.less ));
        app.use(staticCache(path.join(config.__dirname, 'public')), {
            maxAge: config.express.static.maxAge, //365 * 24 * 60 * 60,
            buffer:config.express.static.buffer
        });
        box.utils.later( done, null, '+' + ( new Date().getTime() - ts) + 'ms route "public directory" attached.');
    });

    box.on('init.listen', function (done) {
        var ts   = new Date().getTime();
          app.listen( config.port, function(){
              done( null, '+' + ( new Date().getTime() - ts) + 'ms express.io listens on ' + config.express.host + ':' + config.port );
          });
          // box.server.listen(config.port);
          // box.emit('init.server', box.server);
        // box.utils.later( done, null, '+' + ( new Date().getTime() - ts) + 'ms express.io listens on port #' + config.port);
    });

    box.utils.later( done, null, '+' + ( new Date().getTime() - ts) + 'ms plugin "express.io" initialised.');

});
