var box = require('../lib/box')
    , pageScraper = require('../lib/pageScraper/pageScraper')
    ;

box.on('init', function (app, config, done) {
    pageScraper.init( config.request );
    box.utils.later( done, null, 'plugin "pageScraper" has been initialised');
});