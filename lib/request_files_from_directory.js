/**
 * Created by twhite on 28/10/13.
 */

var glob = require('glob').Glob
    , path = require('path')
    , async = require('async')
    , _ = require('lodash')
    , debug = require('debug')('linksTo:request_directory')
;

module.exports = {
     get : function(sPath, excludeNames, initParams, log ){
        excludeNames = excludeNames || [];
        sPath =  path.resolve(sPath);
        var ts  = new Date().getTime(),
            ts2,
            ts3,
            fileNames = [],
            modules = [],
            TS = [],
            gl =  new glob( sPath + '/*.js'  , { sync:true, cache:true, nosort :true}, function (err, files ) {  //
                ts2 = new Date().getTime();
                fileNames.push('glob(' + (ts2 - ts) +')' );
                    TS.push( ts2 - ts);
                for(var i=0; files && i < files.length; i++){
                    var file = files[i],
                        baseName = path.basename(file);

                    if(_.indexOf(excludeNames, baseName ) ==  -1 ){
                        var ts3 = new Date().getTime(),
                            file_path = path.resolve(file),
                            module = require( file_path);

                        if( typeof module.init == 'function'){
                            module.init(initParams);
                        }
                        fileNames.push( baseName + '(' + (new Date().getTime() - ts3) + ')' );
                        //debug( "- file '%s' required.", baseName);
                        modules.push(module);
                    }
                }
            });
        debug( '%dms %s [%s]', new Date().getTime() - ts, sPath, fileNames.join(', ') );
        return modules;
     }
};