/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 08/05/13
 * Time: 20:50
 * To change this template use File | Settings | File Templates.
 */

var box = require('./box');

box.on('init.socket-io', function (io, sessionSockets) {

    io.sockets.on('connection', function (socket) {
        socket.emit('init', { init: 1 });
        socket.on('started', function (data) {
            console.log(data);
        });
    });

    sessionSockets.on('connection', function (err, socket, session) {
        socket.emit('session', session);

        socket.on('foo', function(value) {
            session.foo = value;
            session.save();
            socket.emit('session', session);
        });
    });

});

