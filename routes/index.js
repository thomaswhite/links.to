
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


box.on('init', function (App, Config, done) {
    var dummy = 1;
    done(null, 'routers ready');
});


exports.init = function( App, Config ){
    config = Config;
    app = App;

    this.top = function( req, res ){
        res.render('layout', { title: 'Express' });
    }
    this.collections = require('./collections.js').init(App, Config, box);
    this.links       = require('./links.js').init(App, Config, box);

    return this;
};