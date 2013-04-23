var box = require('../box.js')
  , http = require('http')

  ;

box.on('init', function (App, Config, done) {
  var app = App;
  var config = Config;

  box.server = http.createServer(app);
  box.server.on('error', box.emit.bind(box, 'error'));

  box.on('listen', function (cb) {
    box.server.listen(config.port, function () {
      box.server.port = box.server.address().port;
      if (cb) box.once('listening', cb);
      box.emit('listening', 'listening' );
    });
  });
  done(null, 'server initialised');
});

