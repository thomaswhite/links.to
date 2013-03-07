
/*
 * GET home page.
 */

var config = 1,
    emitter;

exports.init = function( app, Config, Emitter ){
    config = Config;
    emitter = Emitter;

    this.test = function( req, res ){
        res.render('layout', { title: 'Express' });
    };

    emitter(this);
    return this;
};