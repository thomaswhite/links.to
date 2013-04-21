var box = require('../box.js')
  , middler = require('middler')
  ;

box.middler = middler;

box.on('init', function (app, conf, done) {
  box.middleware = middler(box.app);
  done(null, 'middleware initialised');
});