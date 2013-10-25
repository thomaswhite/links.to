
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
    box.dust.render( res, 'main', { title: 'Home page' } );
//    res.render('main', box.dust.makeBase({ title: 'title' }) );
}

box.on('init', function (App, Config, done) {
    app = App;
    config = Config;
    box.utils.later( done, null,  'route index.js initialised');
});

box.on('init.attach', function (app, config,  done) {
    app.use(
        box.middler()
         .get('/', top)
         .handler
    );
    box.utils.later( done, null,  'route index attached'  );
});


exports.init = function( App, Config ){
    config = Config;
    app = App;
    return this;
};