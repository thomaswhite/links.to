
/*
 * GET home page.
 */

var config = 1;

exports.init = function( app, Config ){
    config = Config;

    this.test = function( req, res ){
        res.render('layout', { title: 'Express' });
    };

    return this;
};