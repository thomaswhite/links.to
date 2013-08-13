/**
 * Created with JetBrains WebStorm.
 * User: twhite
 * Date: 13/08/13
 * Time: 13:52
 * To change this template use File | Settings | File Templates.
 */

var SocketIOFileUploadServer = require('socketio-file-upload'),
    socketio = require('socket.io'),
    express = require('express'),
    util = require('util');

// Make your Express server:
var app = express()
    .use(SocketIOFileUploadServer.router)
    .use(express.static(__dirname + "/public"))
    .listen(81);

// Start up Socket.IO:
var io = socketio.listen(app);

io.sockets.on("connection", function(socket){

    // Make an instance of SocketIOFileUploadServer and listen on this socket:
    var uploader = new SocketIOFileUploadServer();
    // uploader.dir = "uploaded";
    uploader.listen(socket);

    uploader.on("start", function(event){
        console.log('start' + util.inspect( event, false, 7, true ) );
    });

    uploader.on("progress", function(event){
        console.log('progress' + util.inspect( event, false, 7, true ) );
    });

    uploader.on("complete", function(event){
        console.log("complete " + util.inspect( event, false, 7, true ) );
    });

    uploader.on("error", function(event){
        console.log("error" + util.inspect( event, false, 7, true ) );
    });

    // Do something when a file is saved:
    uploader.on("saved", function(event){
        console.log("saved"+ util.inspect( event, false, 7, true ) );
    });
});