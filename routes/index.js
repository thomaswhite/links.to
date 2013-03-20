
/*
 * GET home page.
 */

var  _ = require('lodash');
var debug = require('debug')('linksTo:view');
var breadcrumbs = require('./breadcrumbs.js');

var config,
    emitter,
    app;

exports.init = function( App, Config, Emitter ){
    config = Config;
    emitter = Emitter;
    app = App;

    this.top = function( req, res ){
        res.render('layout', { title: 'Express' });
    };

    this.collections = require('./collections.js').init(App, Config, Emitter);

    return this;
};