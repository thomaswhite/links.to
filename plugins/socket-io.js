var box = require('../box.js')
   , SessionSockets = require('session.socket.io')
  , MongoStore = require('socket.io-mongo')
  , io
  , config;


box.on('init.listen', function(done) {
    box.io = io = require('socket.io').listen(box.server);
    box.sessionSockets = new SessionSockets(io,  box.sessionStore, box.cookieParser);
    box.emit('init.socket-io', io, box.sessionSockets );
    /*
     io.configure(function() {
     var store = new MongoStore({
     collectionPrefix: 'socket.io.',
     streamCollection: 'stream',
     storageCollection: 'storage',
     nodeId: null,  // id that uniquely identifies this node
     size: 1000000, // max size in bytes for capped collection
     num: null,     // max number of documents inside of capped collection
     // url: 'mongodb://localhost:27017/yourdb',
     host: 'localhost',
     port: 27017,
     db: 'socketio'
     });
     store.on('error', console.error);
     io.set('store', store);
     });
     */
    done(null, 'plugin socket.io initialised');
});

/*
 box.on('init', function (App, Config, done) {
     config = Config;
 done(null, 'plugin socket.io initialised');
 });


box.on('init.attach', function (app, config, done) {
});
box.on('init.server', function (server) {
});

 */
