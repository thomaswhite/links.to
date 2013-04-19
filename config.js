/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 02/03/13
 * Time: 09:02
 * To change this template use File | Settings | File Templates.
 */

var config
    , mainDir = __dirname
    , etc = require('etc')()
    , path = require('path')
    ;

exports.init = function(  env ){
    env = env || 'dev';
    var configDir = path.join(mainDir, 'config', env);

    etc
        .argv()
        .env('links_')
        .env('HTTP_')   // HTTP_PROXY
        .etc()
        .pkg()
        .add({
            views: path.join(mainDir, 'views'),
            host:'127.0.0.1',
            port:3000,
            swig:{
                root: path.join(mainDir, 'views')
            },
            less:{
                paths:['.'],
                src  :  path.join(mainDir, 'public'),
                dest :  path.join(mainDir, 'public'),
                prefix:  ['/stylesheets', '/less']
            },
            db:{
                dbModules: path.join(mainDir, 'db', '*.js'),
            }
        })
        .folder(configDir)
    ;

    return etc.toJSON();
};
