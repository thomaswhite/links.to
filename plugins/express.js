var box = require('../box.js')
    , express = box.express =  require('express')
    , app     = box.app  = box.server   = express()
    , mongoStore = require('connect-mongo')(express)
    , cons = require('consolidate')
    , swig = require('swig')


//    , http = require('http')
    , config;


app.configure('development', function () {
    app.use(express.errorHandler());
});

box.on('init', function (App, Config, done) {
  config = Config;

  app.set('port', config.port );

  app.configure(function () {
        app.use(express.logger('dev'));
        app.use(express.favicon());
        app.use(express.bodyParser());
        app.use(express.methodOverride());

        app.engine('html', cons.swig );
        app.set('view engine', 'html');
        app.set('views',  config.views );
        swig.init( config.swig );

        app.use(express.cookieParser(config.common.session.secret));
        app.use(express.session({
            secret: config.common.session.secret
            , cookie: { maxAge: 1000 * config.common.session.maxAgeSeconds}
            , store: new mongoStore(config.db)
        }));
  });

  box.app.on('error', box.emit.bind(box, 'error'));

  box.on('listen', function (cb) {
       box.app.listen(config.port, function () {
//          if (cb) box.once('listening', cb);
//          box.emit('listening');
            cb(null, 'listening on port #' +config.port );
       });
  });

  done(null, 'express initialised');
});
