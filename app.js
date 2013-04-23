var debug = require('debug')('linksTo:app');
debug("Loading" );

var  box = require('./box');

// bootstrap
    require('./plugins/express');
    require('./plugins/passport');
    require('./plugins/middleware');
    require('./plugins/utils');
    require('./plugins/db');
//    require('./plugins/server');

// dummy entry
box.on('listen', function(cb){ cb(null, 'dummy listen'); });
box.on('atach-path2', function(app, config, cb){ cb(null, 'dummy atach-path'); });

var color = require('colors')
    , express = box.express //require('express')
    , app = box.app         //express()
    , path = require('path')

    , bootstrapPath = path.join(__dirname, 'node_modules', 'bootstrap')
    , config = app.locals.config = box.config = require('./config').init(  'dev' )
    , passports = require('./passports')

    , routes = require('./routes').init( app, config, box )
    ;

config.less.paths.push ( path.join(bootstrapPath, 'less') );

box.parallel('init', app, config, function(err, result){
    if (err) return box.emit('error', err);
    debug(  'Init results:' +  box.utils.inspect(result) );

    box.parallel('atach-paths', app, config, function(err2, result2){
        if (err) return box.emit('error', err2);
        debug(  'atach-path results:' +  box.utils.inspect(result2) );

        app.use(express.static(path.join(__dirname, 'public')));
        app.use(require('less-middleware')( config.less ));
    //        app.use('/img', express.static(path.join(bootstrapPath, 'img')));


        app.get('/coll/mine',       routes.collections.mine);
        app.get('/coll',            routes.collections.all);
        app.post('/coll/new',       routes.collections.add);

        app.get('/coll/:id',        routes.collections.get);
        app.get('/w/c/:id',         routes.collections.get);
        app.get('/coll/:id/delete', routes.collections.delete);

        app.post('/link/new/:coll?',        routes.links.add);
        app.get('/link/:id/delete/:coll?',  routes.links.delete);

        box.parallel('listen', function (err, result) {
            console.log( box.utils.inspect(result ));
            console.log('Links.To server listening on port ' + app.get('port') );
        });

    //    app.get('/favorites',        routes.collections.favorites);
    //    app.get('/favorites/mine',   routes.collections.favorites_mine);

    //    app.get('/tags',        routes.collections.tags);
    //    app.get('/tags/mine',   routes.collections.tags_mine);
    });
});



