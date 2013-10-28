var box = require('../lib/box')
    , pageScraper = require('../lib/pageScraper/pageScraper')
    ;

box.on('init', function (app, config, done) {
    var ts = new Date().getTime();
    pageScraper.init( config.request );
    box.utils.later( done, null, '+' + ( new Date().getTime() - ts) + 'ms plugin "pageScraper" initialised.');
});