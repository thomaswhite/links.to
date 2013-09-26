
/*
 * GET home page.
 */

var box = require('../modules/box.js')
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
    process.nextTick(function() {
        done(null, 'route index.js initialised');
    });

});

box.on('init.attach', function (app, config,  done) {
    app.use(
        box.middler()
         .get('/', top)
         .handler
    );
    process.nextTick(function() {
        done(null, 'route index attached'  );
    });
});


exports.init = function( App, Config ){
    config = Config;
    app = App;
    return this;
};