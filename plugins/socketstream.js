var box = require('../box.js')
  , ss = require('socketstream')
  ;

box.ss = ss;

// Code & Template Formatters
ss.client.formatters.add(require('ss-less'));
ss.client.formatters.add(require('ss-stylus'));
ss.client.templateEngine.use(require('ss-hogan'));

box.on('init', function (app, config, done) {
  // SS_ENV=production
  if (ss.env === 'production') {
      ss.client.packAssets();
  }
  done(null, 'plugin socketstream initialised');
});

box.on('listening', function (server) {
    ss.start(server);
    box.app.stack = ss.http.middleware.stack.concat(box.app.stack); // Append SocketStream middleware to the stack
    //cb(null, 'socketstream is listening' );
});