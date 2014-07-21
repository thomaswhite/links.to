
/*
 * GET home page.
 */

var box = require('../lib/box')
    , config
    , app
    ;

require('./collections');
require('./links');
require('./imports');
require('./upload');


function top ( req, res ){
    box.dust.render( res, 'main', { title: 'Home page', pageParam:{} } );
//    res.render('main', box.dust.makeBase({ title: 'title' }) );
}

box.on('init', function (App, Config, done) {
    var ts = new Date().getTime();
    app = App;
    config = Config;
    box.utils.later( done, null, '+' + ( new Date().getTime() - ts) + 'ms route "index.js" initialised.');
});

box.on('init.attach', function (app, config,  done) {
    var ts = new Date().getTime();
    app.use(
        box.middler()
         .get('/', top)
         .handler
    );
    box.utils.later( done, null, '+' + ( new Date().getTime() - ts) + 'ms route "index.js" attached.');
});


exports.init = function( App, Config ){
    config = Config;
    app = App;
    return this;
};