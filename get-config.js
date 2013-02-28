// Settings for our app. The 'require' call in server.js returns
// whatever we assign to 'module.exports' in this file

var cc = require('config-chain')
    , opts = require('optimist').argv
    , env = opts.env || process.env.YOUR_APP_ENV || 'dev'
    , path = require('path')
    , configDir = path.join(__dirname, 'config', env)
    , S = require('string')
    , fs = require('fs')
    , files = fs.readdirSync(configDir)
    ;

var config = cc(
        opts,
        cc.env('links_'), //myApp_foo = 'like this'
        path.join(__dirname, 'config.' + env + '.json'),

        //IF `env` is PRODUCTION
        env === 'prod'
            ? path.join(__dirname, 'special.json') //load a special file
            : null

    ).on('error',function (err) {
            throw err;
        }).on('load', function (config) {
            console.log('Config has been loaded.')
        })
    ;

    for( var i=0; i < files.length; i++){
        if( S(files[i]).endsWith('.json')){
            config.addFile(  path.join( configDir, files[i]));
        }
    }

    config.addFile( cc.find('config.json') );
    config.add({
        host:'localhost',
        port:8000
    });


module.exports = {
    config:config
};
