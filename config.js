/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 02/03/13
 * Time: 09:02
 * To change this template use File | Settings | File Templates.
 */

var config;


exports.init = function( mainDir, bootstrapPath ){
    var fs = require('fs')
        , cc = require('config-chain')
        , path = require('path')
        , opts = require('optimist').argv
        , env = opts.env || process.env.YOUR_APP_ENV || 'dev'
        , configDir = path.join(mainDir, 'config', env)
    //    , files = fs.readdirSync(path)
    ;

    config = cc(
            opts,
            cc.env('links_'),  //myApp_foo = 'like this',
            //path.join(mainDir, 'config.' + env + '.json'),
            env === 'prod' ? path.join(mainDir, 'special.json') : null,
            path.join(configDir, 'common.json'),
            path.join(configDir, 'less.json'),
            path.join(configDir, 'db.json'),
            path.join(configDir, 'mailer.json'),
            path.join(configDir, 'passport.json'),
            path.join(configDir, 'swig.json'),
            cc.find('config.json'), //SEARCH PARENT DIRECTORIES FROM CURRENT DIR FOR FILE
            {   views:path.join(mainDir, 'views'),
                host:'localhost',
                port:3000
            }
    );

    config.store.swig.root = config.store.views;
    config.store.less.src = config.store.less.dest = path.join(mainDir, 'public');
    config.store.less.paths = ['.', path.join(bootstrapPath, 'less') ];
    config.store.less.prefix = ['/stylesheets', '/less'];
    return config;
};
