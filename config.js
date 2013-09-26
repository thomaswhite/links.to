/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 02/03/13
 * Time: 09:02
 * To change this template use File | Settings | File Templates.
 */

var config
    , etc = require('etc')()
    , path = require('path')
    ;

exports.init = function(  env, mainDir ){
    env = env || 'dev';

    etc
        .argv()
        .env('links_')
        .env('HTTP_')   // HTTP_PROXY
        .env('HTTP')   // HTTP_PROXY
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
                paths:[
                    '.'
                    // , path.join( mainDir, 'node_modules', 'bootstrap' , 'less')
                ],
                src  :  path.join(mainDir, 'public'),
                dest :  path.join(mainDir, 'public'),
                prefix:  ['/stylesheets', '/less']
            },
            db:{
                dbModules: path.join(mainDir, 'db', '*.js')
            }
        })
        .folder(  path.join(mainDir, 'config', env) )
    ;
    var json = etc.toJSON();
    json.request.proxy =  json.PROXY;
    json.__dirname = mainDir;

    return json;
};
