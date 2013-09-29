var box = require('../../lib/box.js')
  , SessionSockets = require('session.socket.io')

//  , MongoStore     = require('socket.io-mongo')
  , io
  , config
  , store
  ;


box.on('init', function (App, Config, done) {
    config = Config;
    //   store = new MongoStore({url: 'mongodb://localhost:27017/yourdb'});
    //   store.on('error', console.error);
    done(null, 'plugin socket.io initialised');
});



box.on('init.listen', function(done) {
    box.io = io = require('socket.io').listen(box.server);

    box.sessionSockets = new SessionSockets(io, box.sessionStore , box.express.cookieParser(config.common.session.secret) );


    box.emit('init.socket-io', io, box.sessionSockets );

    //except for the optional fail and success the parameter object has the
    //same attribute than the session middleware http://www.senchalabs.org/connect/middleware-session.html
 /*
    io.set("authorization", passportSocketIo.authorize({
        key:    'connect.sid',       //the cookie where express (or connect) stores its session id.
        secret: config.common.session.secret, //the session secret to parse the cookie
        store:   box.sessionStore,     //the session store that express uses
        fail: function(data, accept) {     // *optional* callbacks on success or fail
            accept(null, false);             // second param takes boolean on whether or not to allow handshake
        },
        success: function(data, accept) {
            accept(null, true);
        }
    }));
*/
    done(null, 'plugin socket.io initialised');
});

/*
box.on('init.attach.no', function (app, config, done) {
});
*/

