/**
 * Module dependencies.
 */

var express = require('express')
    , routes = require('./routes')
    , user = require('./routes/user')
    , http = require('http')
    , path = require('path')
    , cons = require('consolidate')

    , cc = require('config-chain')
    , opts = require('optimist').argv
    , env = opts.env || process.env.YOUR_APP_ENV || 'dev'
    , configDir = path.join(__dirname, 'config', env)
    , config = cc(
            opts,
            cc.env('links_'),  //myApp_foo = 'like this',
            path.join(__dirname, 'config.' + env + '.json'),
            env === 'prod' ? path.join(__dirname, 'special.json') : null,
            path.join(configDir, 'common.json'),
            path.join(configDir, 'db.json'),
            path.join(configDir, 'mailer.json'),
            path.join(configDir, 'passport.json'),
            path.join(configDir, 'swig.json'),
            cc.find('config.json'), //SEARCH PARENT DIRECTORIES FROM CURRENT DIR FOR FILE
            {
                host:'localhost',
                port:3000
            }
        )
    ;


var app = express();

app.configure(function () {
    app.set('port', config.get('port') );
    app.engine('html', cons.swig);
    app.set('view engine', 'html');
    app.set('views', __dirname + '/views');

    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('your secret here'));
    app.use(express.session( config.store.common.sessionSecret ));
    app.use(app.router);
    app.use(require('less-middleware')({ src:__dirname + '/public' }));
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
    app.use(express.errorHandler());
});

app.get('/', routes.index );
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
});
