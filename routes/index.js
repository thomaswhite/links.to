
/*
 * GET home page.
 */

var box = require('../box.js')
    , _ = require('lodash')
    , debug = require('debug')('linksTo:view')
    , breadcrumbs = require('./breadcrumbs.js')
    , config
    , app

    ;

require('./collections');
require('./links');



function top ( req, res ){
    res.render('layout', { title: 'Express' });
}

box.on('init', function (App, Config, done) {
    app = App;
    config = Config;
    done(null, 'routers ready');
});

box.on('atach-paths', function (app, config,  done) {
    app.use(
        box.middler()
         .get('/', top)
         .handler
    );
    done(null, 'atach-paths: index'  );
});


exports.init = function( App, Config ){
    config = Config;
    app = App;
    return this;
};