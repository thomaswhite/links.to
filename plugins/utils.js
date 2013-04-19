/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 18/04/13
 * Time: 23:19

 */

var emitter = require('../emitter.js')

    ;

emitter.on('init', function (app, conf, done) {
    emitter.utils = {
         _ : require('lodash'),
         path : require('path'),
         fs : require('fs'),
         colors : require('colors'),
         inspect : require('eyes').inspector({
            styles: {                 // Styles applied to stdout
                all:     'cyan',      // Overall style applied to everything
                label:   'underline', // Inspection labels, like 'array' in `array: [1, 2, 3]`
                other:   'inverted',  // Objects which don't have a literal representation, such as functions
                key:     'bold',      // The keys in object literals, like 'a' in `{a: 1}`
                special: 'grey',      // null, undefined...
                string:  'green',
                number:  'magenta',
                bool:    'blue',      // true false
                regexp:  'green'      // /\d+/
            },
            pretty: true,             // Indent object literals
            hideFunctions: true,     // Don't output functions at all
            stream: process.stdout,   // Stream to write to, or null
            maxLength: 32000           // Truncate output if longer
        })
    };
    done(null, 'utils ready');
});