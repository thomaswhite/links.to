/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 02/03/13
 * Time: 09:02
 * To change this template use File | Settings | File Templates.
 */

var config;

exports.init = function( mainDir, bootstrapPath ){
    var  etc = require('etc')()
        , path = require('path')
        , env = 'dev'
        , configDir = path.join(mainDir, 'config', env)
    ;

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
                paths:['.', path.join(bootstrapPath, 'less')],
                src  :  path.join(mainDir, 'public'),
                dest :  path.join(mainDir, 'public'),
                prefix:  ['/stylesheets', '/less']
            }
        })
        .folder(configDir)
    ;

    return etc.toJSON();
};
