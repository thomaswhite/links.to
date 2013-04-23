
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

function top ( req, res ){
    res.render('layout', { title: 'Express' });
}

box.on('init', function (App, Config, done) {
    app = App;
    config = Config;

    var dummy = 1;
    done(null, 'routers ready');
});

box.on('atach-paths', function (app, config,  done) {
    box.middleware.get('/', top);
    app.use(
        box.middler()
         .get('/', top)
         .handler
    );
    done(null, 'atach-paths: index'  ); //
});


exports.init = function( App, Config ){
    config = Config;
    app = App;

    this.top = top;
    this.collections = require('./collections.js').init(App, Config, box);
    this.links       = require('./links.js').init(App, Config, box);

    return this;
};