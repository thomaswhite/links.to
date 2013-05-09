var box = require('../box.js')
  , ss = require('socketstream')
  ;

box.ss = ss;

ss.session.store.use('redis');
ss.session.options.maxAge = 8640000;

// Code & Template Formatters
ss.client.formatters.add(require('ss-less'));
ss.client.formatters.add(require('ss-stylus'));
ss.client.templateEngine.use(require('ss-hogan'));


ss.ws.transport.use('engineio', {
    client: {
        transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']
    },
    server: function(io){
        io.set('log level', 4)
    }
});


box.on('init', function (app, config, done) {
  // SS_ENV=production
  if (ss.env === 'production') {
      ss.client.packAssets();
  }
  done(null, 'plugin socketstream initialised');
});

box.on('init.server', function (server) {
    ss.start(server);
    box.app.stack = ss.http.middleware.stack.concat(box.app.stack); // Append SocketStream middleware to the stack
    //cb(null, 'socketstream is listening' );
});