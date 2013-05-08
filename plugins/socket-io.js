var box = require('../box.js')
  , io = require('socket.io')
  , MongoStore = require('socket.io-mongo')
  ;

box.io = io;

box.on('init', function (app, config, done) {
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

    done(null, 'plugin socket.io initialised');
});

/*
box.on('atach-paths', function (app, config, done) {
    done(null, 'plugin socket.io atach-paths');
});
*/

box.on('listening', function (server) {
    box.io.listen(box.server);
    //cb(null, 'socket.io is listening' );
});