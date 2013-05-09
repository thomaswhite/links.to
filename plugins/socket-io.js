var box = require('../box.js')
  , SessionSockets = require('session.socket.io')
  , MongoStore = require('socket.io-mongo')
  , io
  , config
  , store
  ;


box.on('init.listen', function(done) {
     box.io = io = require('socket.io').listen(box.server);

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
//     io.set('store', store);


    box.sessionSockets = new SessionSockets(io,  box.sessionStore, box.cookieParser);
    box.emit('init.socket-io', io, box.sessionSockets );
    done(null, 'plugin socket.io initialised');
});

 box.on('init', function (App, Config, done) {
     config = Config;
     store = new MongoStore({url: 'mongodb://localhost:27017/yourdb'});
     store.on('error', console.error);

     done(null, 'plugin socket.io initialised');
 });


/*
box.on('init.attach', function (app, config, done) {
});
box.on('init.server', function (server) {
});

 */
