var box = require('../lib/box')
  , middler = box.middler = require('middler')
  ;

box.on('init', function (app, conf, done) {
    var ts = new Date().getTime();
    box.middleware = middler(box.app);
    box.utils.later( done, null, '+' + ( new Date().getTime() - ts) + 'ms plugin "middleware" initialised.');
});