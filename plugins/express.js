var box = require('../box.js')
    , express = box.express =  require('express.io')
    , app     = box.app = express()

    , mongoStore = require('connect-mongo')(express)
    , cons = require('consolidate')
    , swig = require('swig')
    , path = require('path')

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
        app.use(express.bodyParser());
        app.use(express.methodOverride());

        app.engine('html', cons.swig );
        app.set('view engine', 'html');
        app.set('views',  config.views );
        swig.init( config.swig );

        app.use( box.cookieParser );
        app.use(express.session({
            secret: config.common.session.secret
            , cookie: { maxAge: 1000 * config.common.session.maxAgeSeconds}
            , store: box.sessionStore
        }));
  });

  app.io.configure(function() {
        app.io.enable('browser client minification');  // send minified client
        //    app.io.enable('browser client gzip');          // gzip the file
        // app.io.set('log level', 1);                    // reduce logging
  });


  box.app.on('error', box.emit.bind(box, 'error'));

  box.on('init.attach', function (app, config, cb) {
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
