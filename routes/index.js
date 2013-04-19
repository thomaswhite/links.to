
/*
 * GET home page.
 */

var emitter = require('../emitter.js')
    , _ = require('lodash')
    , debug = require('debug')('linksTo:view')
    , breadcrumbs = require('./breadcrumbs.js')
    , config
    , app

    ;


emitter.on('init', function (app, conf, done) {
    var dummy = 1;
    done(null, 'routers ready');
});


exports.init = function( App, Config, Emitter ){
    config = Config;
    //emitter = Emitter;
    app = App;

    this.top = function( req, res ){
        res.render('layout', { title: 'Express' });
    };

    this.collections = require('./collections.js').init(App, Config, Emitter);
    this.links       = require('./links.js').init(App, Config, Emitter);

    return this;
};