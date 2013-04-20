var box = require('../box.js')
  , middler = require('middler')
  ;

box.on('init', function (app, conf, done) {
  box.middler = middler;
  box.middleware = middler(box.server);
  done(null, 'middleware initialised');
});