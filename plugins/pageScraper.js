var box = require('../lib/box')
    , pageScraper = require('../lib/pageScraper/pageScraper')
    ;

box.on('init', function (app, config, done) {
    pageScraper.init( config.request );
    process.nextTick(function() {
        done(null, 'plugin "pageScraper" initialised');
    });
});