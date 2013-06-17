/**
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01
 */

var socket = io.connect(''),
    socketContext = {},
    socketData = {} // saved by pager URL
    ;



socket.on('connecting',     function() {     console.log('socket.io connecting...');});
socket.on('reconnecting',   function() {     console.log('socket.io reconnecting...');});
socket.on('connect',        function() {     console.log('socket.io connected!');});
socket.on('reconnect',      function() {     console.log('socket.io reconnect');});
socket.on('disconnect',     function () {          console.log('socket.io disconnected');});
socket.on('error',          function (data ) {     console.log('socket.io error', data);});
socket.on('reconnect_failed', function () {     console.log('socket.io reconnect failed');});
socket.on('connect_failed', function () {       console.log('socket.io connect failed');}); // "connect_failed" is emitted when socket.io fails to establish a connection to the server and has no more transports to fallback to.

socket.on('pageScrape.image', function( data, x ){
    console.log ('pageScrape.image:', data);
});

socket.on('pageScrape.head', function( data, x ){
    console.log ('pageScrape.head', data);
});

socket.on('link.ready', function( data, x ){
    console.log ('link.ready', data);
    render("links/link", data.data.link, null, 0);
});
socket.on('link.saved', function( data, x ){
    console.log ('link.saved', data);
});

// ============================================================

// This will bootstrap resources from the server
// and data for 'pageParam.route'
socket.emit('loaded', pageParam, function(data){
    socketContext = data;
    console.log ('loaded:',  data);
});
socket.on('user', function( data, x ){
    socketContext.user = data;
    console.log ('socketContext', socketContext);
});

socket.on('data', function( param, data ){
    console.log ('data', param, data);
    socketData[param.path] = data;
    //TODO: add data under [search].data and append rows when paginate
    //TODO: trigger update event to refresh the target Area.
    page.show(param.route); // navigate to the route and now there will be data for it.
});



/* events:
   Links:
   emit link.queue
     on link.queued
     on link.bad
     on link.head
     on link.summary
     on link.images
     on link.tags

   Collection:
   emit collection.add
    on. collection.added

   emit collection.pub
     on collection.published

   emit collection.ask

   emit collections.list    page, [authorList], [excludeTagList], [includeTagList]
   emit tags.list           page, [authorList], [excludeTagList],
        tag.attached-list
   emit directions.list     page, [authorList], [excludeTagList], [includeTagList]
   emit direction.list      page, [authorList], [excludeTagList], [includeTagList]

 */


/*
 var socket = io.connect(host, options),
 socket.on('connect', function () {}) // "connect" is emitted when the socket connected successfully
 socket.on('connecting', function () {}) // "connecting" is emitted when the socket is attempting to connect with the server.
 socket.on('disconnect', function () {}) // "disconnect" is emitted when the socket disconnected
 socket.on('connect_failed', function () {}) // "connect_failed" is emitted when socket.io fails to establish a connection to the server and has no more transports to fallback to.
 socket.on('error', function () {}) // "error" is emitted when an error occurs and it cannot be handled by the other event types.
 socket.on('message', function (message, callback) {}) // "message" is emitted when a message sent with socket.send is received. message is the sent message, and callback is an optional acknowledgement function.
 socket.on('anything', function(data, callback) {}) // "anything" can be any event except for the reserved ones. data is data, and callback can be used to send a reply.
 socket.on('reconnect_failed', function () {}) // "reconnect_failed" is emitted when socket.io fails to re//establish a working connection after the connection was dropped.
 socket.on('reconnect', function () {}) // "reconnect" is emitted when socket.io successfully reconnected to the server.
 socket.on('reconnecting', function () {}) // "reconnecting" is emitted when the socket is attempting to reconnect with the server.

*/