/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01
 * To change this template use File | Settings | File Templates.
 */

var socket = io.connect('http://localhost');
socket.on('init', function (data) {
    console.log(data);
    socket.emit('started', { my: 'my start line' });
});

socket.on('session', function (data) {
    console.log(data);
});