var box = require('../lib/box')
  , middler = box.middler = require('middler')
  ;

box.on('init', function (app, conf, done) {
    box.middleware = middler(box.app);
    box.utils.later( done, null, 'plugin "middleware" has been initialised');
});