/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 18/04/13
 * Time: 23:19

 */

var box = require('../box.js')

    , ShortId  = require('shortid').seed(96715)

    , _ = require('lodash')
    , path = require('path')
    , fs = require('fs')
    , colors = require('colors')
    , inspect = require('eyes').inspector({
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
    , async = require('async')
    , moment = require('moment')
    ;

function ShorterID( length ){
    return  ShortId.generate().substr(0, length || 7 );
};


/**
 *
 * @param array of results returned by .paralel
 * @param type - value of the type parameter to be selected
 * @returns {*}
 */
function pickUpFromAsyncResult( a, type ){
    return a ?_.first(a, function(element, pos, all){ return element.type == type;  })[0]: null;
}

function formatUpdated (arr){
    var A = arr && arr.hasOwnProperty('length') ? arr : [arr];
    A.forEach(function(o) {
        if(o.updated){
            var d =  moment(o.updated);
            o.updatedStr = d.format('YYYY-MM-DD HH:mm');
            o.updatedFromNow = d.fromNow();
        }
    });
}

function updatedFromNow (s){
    return  moment(s).fromNow();
}

// multiple RegEx can be passes as second, third etc argument
function removeAll(s, regEx ){
    for(var i=1; i< arguments.length; i++){
        var REx = arguments[i];
        while (REx.test(s)) {
            s = s.replace(REx, "");
        }
    }
    return s;
}


box.on('init', function (app, conf, done) {
    box.utils = {
        _ : _,
        path : path,
        fs : fs,
        colors : colors,
        inspect : inspect,
        shorterID: ShorterID,
        async : async,
        pickUpFromAsyncResult: pickUpFromAsyncResult,
        formatUpdated:formatUpdated,
        removeAll: removeAll
     };
    done(null, 'plugin utils initialised');
});