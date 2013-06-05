
/*
 * GET home page.
 */

var box = require('../box.js')
    , config
    , app
    ;

require('./collections');
require('./links');


function top ( req, res ){
    box.dust.render('main', box.dust.makeBase({ title: 'title' }), res );
//    res.render('main', box.dust.makeBase({ title: 'title' }) );
}

box.on('init', function (App, Config, done) {
    app = App;
    config = Config;
    done(null, 'routers index.js initialised');
});

box.on('init.attach', function (app, config,  done) {
    app.use(
        box.middler()
         .get('/', top)
         .handler
    );
    done(null, 'routes index attached'  );
});


exports.init = function( App, Config ){
    config = Config;
    app = App;
    return this;
};