/**
 * Created by twhite on 28/10/13.
 */

var glob = require('glob').Glob
    , path = require('path')
    , async = require('async')
    , _ = require('lodash')
    , debug = require('debug')('request_files_from_directory')
;

module.exports = {
     get : function(sPath, excludeNames, initParams){
        excludeNames = excludeNames || [];
        var fileNames = [],
            modules = [];

        new glob( sPath + '/*.js'  , { sync:true, cache:true, nosort :true}, function (err, files ) {  //
            for(var i=0; files && i < files.length; i++){
                var file = files[i],
                    baseName = path.basename(file);

                if(_.indexOf(excludeNames, baseName ) ==  -1 ){
                    var file_path = path.resolve(file),
                        module = require( file_path );

                    if( typeof module.init == 'function'){
                        module.init(initParams);
                    }
                    fileNames.push( baseName );
                    modules.push(module);
                }
            }
        });
        debug('Path %s, \n%j', sPath, fileNames);
        return modules;
     }
}