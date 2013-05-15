/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 08/05/13
 * Time: 20:50
 * To change this template use File | Settings | File Templates.
 */

var box = require('./box');


box.on('init.attach', function (app, config, cb) {

    box.app.io.route('ready', function(req) {
        console.log( req.data );
        req.session.ts = new Date().getTime();
        req.session.save();
        req.io.emit('talk', {
            message: 'io event from an io route on the server',
            session: req.session
        })
    });

    cb(null,   'io.rutes attached' );

});

/*

 connect
 connecting
 disconnect
 connect_failed
 error
 message
 reconnect_failed
 reconnect
 reconnecting


 io.sockets.on('connection', function(socket) {}) - initial connection from a client. socket argument should be used in further communication with the client.
 socket.on('message', function(message, callback) {}) - "message" is emitted when a message sent with socket.send is received. message is the message sent, and callback is an optional acknowledgement function.
 socket.on('anything', function(data) {}) - "anything" can be any event except for the reserved ones.
 socket.on('disconnect', function() {}) - the disconnect event is fired in all cases, when the client-server connection is closed.
           It fires on wanted, unwanted, mobile, unmobile, client and server disconnects.
           There is no dedicated reconnect event. You have to use the "connection" event for reconnect handling.
 */

