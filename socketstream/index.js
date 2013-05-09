
/*
 * GET home page.
 */

var box = require('../box.js')
    , config
    , app

    ;



box.on('init', function (App, Config, done) {
    app = App;
    config = Config;
    done(null, 'routers index.js initialised');
});

box.on('init.attach', function (app, config,  done) {
// Define a single-page client called 'main'
    box.ss.client.define('main', {
        view: 'app.html',
        css:  ['libs/reset.css', 'app.styl'],
        code: ['libs/jquery.min.js', 'app'],
        tmpl: '*'
    });

// Serve this client on the root URL
    box.ss.http.route('/ss', function(req, res){
        res.serveClient('main');
    });

    done(null, 'socketstream attached'  );
});
