/**
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01
 */




// define(['socket.io', 'links-to/debug' ], function (io, debug) {
//   define(['js!/socket.io/socket.io.js', 'links-to/debug' ], function (io, debug) {
   define(["debug", 'socket.io' ], function ( debug, io ) {
       "use strict";

       var socket = io.connect(''),  //  io.connect(host, options),
            socketContext = {},
            socketData = {} // saved by pager URL
            ;

        socket.on('connecting',     function() {    debug || debug.log('socket.io connecting...');});
        socket.on('reconnecting',   function() {    debug ||  debug.log('socket.io reconnecting...');});
        socket.on('connect',        function() {    debug ||  debug.log('socket.io connected!');});
        socket.on('reconnect',      function() {    debug ||  debug.log('socket.io reconnect');});
        socket.on('disconnect',     function () {   debug ||  debug.log('socket.io disconnected');});
        socket.on('error',          function (data ) {  debug || debug.log('socket.io error', data);});
        socket.on('reconnect_failed', function () {     debug || debug.log('socket.io reconnect failed');});
        socket.on('connect_failed', function () {       debug || debug.log('socket.io connect failed');}); // "connect_failed" is emitted when socket.io fails to establish a connection to the server and has no more transports to fallback to.

        socket.on('collection.adding', function( data ){
            debug.log ('collection-adding', data);
        });


        socket.on('link.in-progress', function( data ){
            debug.log ('link.in-progress:', data);
        });

        socket.on('link.ready', function( data, x ){
            debug.log ('link.ready', data);
            //render("links/link", data.data.link, null, 0);
        });

        socket.on('link-not-found', function( data ){
            debug.log ('link-not-found', data);
            // display error message about the link
        });

        socket.on('link-failure', function( data ){
            debug.log ('link-failure', data);
            // display error message about the link
        });
        socket.on('link-adding', function( data ){
            debug.log ('link-adding', data);
            // display waiting sign
        });
        socket.on('link-added', function( data ){
            debug.log ('link-added', data);
            // replace the waiting sign with the new link content
        });


        // ============================================================

        // This will bootstrap resources from the server
        // and data for 'pageParam.route'
        socket.emit('loaded', pageParam, function(data){
            socketContext.loaded = data;
            debug.log ('loaded:',  data);
        });

        socket.on('user', function( data ){
            socketContext.user = data;
            debug.log ('socketContext', socketContext);
        });

       socket.on('data', function( data ){
            debug.log ('socket-io ON data:', data);
            socketData[data.param.path] = data;
            //TODO: add data under [search].data and append rows when paginate
            //TODO: trigger update event to refresh the target Area.
            //page.show(param.route); // navigate to the route and now there will be data for it.
            debug.err ('FIXME:page.show(param.route); // navigate to the route and now there will be data for it.');
       });

       return socket;

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
