/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 18/04/13
 * Time: 22:54
 */


/*
 var EventEmitter = require('events').EventEmitter,
 require('eventflow')(EventEmitter),
 emitter = new EventEmitter();

 */

//function fn(){};
//fn.prototype = require('eventflow');
//module.exports = new( fn );


module.exports = new( require('eventflow') );
//module.exports.setMaxListeners(0);