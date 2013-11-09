/*! Tiny Pub/Sub - v0.7.0 - 2013-01-29
* https://github.com/cowboy/jquery-tiny-pubsub
* Copyright (c) 2013 "Cowboy" Ben Alman; Licensed MIT */
function tinyPubSub($) {
  var o = $({}),
      triggered = {};
      // save the first trigger of an event.
      // This will allow when if a lister registers later to be triggered with the last events triggered before they subscribed.
      // This is particularly convenient for initialisation when modules load asynchronously.

  $.subscribeOne = function( eventName, fn ) {
    if( triggered[eventName]){
        fn.apply(undefined, triggered[eventName]  );
    }else{
        o.on.one(o, arguments);
    }
  };

  $.subscribe = function(eventName, data, fn ) {
      o.on.apply(o, arguments);
      if( typeof data == 'object' && data.catchUp === true && triggered[eventName]){
          fn.apply(undefined, triggered[eventName] );
      }
  };

  $.unsubscribe = function() {
     o.off.apply(o, arguments);
  };

  $.publish = function( eventName, params ) {
      o.trigger.apply(o, arguments);
      if( !triggered[ eventName ] ){
          var args, event = jQuery.Event( eventName );
          if( params && typeof params.length == 'number' ){ // array
              params.unshift(event);
              args = params;
          }else{
              args = Array.prototype.slice.call(arguments, 1);
              Array.prototype.unshift.call( args, event );
          }
          triggered[ eventName ] = args;
      }
  };
}
