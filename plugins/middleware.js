var box = require('../modules/box.js')
  , middler = box.middler = require('middler')
  ;

box.on('init', function (app, conf, done) {
  box.middleware = middler(box.app);
    process.nextTick(function() {
        done(null, 'plugin middleware initialised');
    });
});