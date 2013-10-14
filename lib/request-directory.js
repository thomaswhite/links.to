/**
 * Created by Thomas on 14/10/13.
 */

var debug = require('debug')('request-directory')
    , path = require('path')
    , async = require('async')
    , glob = require('glob').Glob
;

module.exports.get = function( dir, done ){
    new glob( dir + '/*.js' , { sync:true, cache:true, nosort :true}, function (er, plugins) {
        debug('Begin plugins load.');
        async.map( plugins,
            function(sPath, done){
                require(path.resolve(sPath));
                debug('Plugin ' + sPath + ' loaded.') ;
                done( null, sPath );
            },
            function(err, pathList){
                if( err ){
                    debug(err);
                }
                debug('All plugins have been loaded.');
                done( pathList );
            }
        );
    });
};
