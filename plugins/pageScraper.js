var box = require('../lib/box.js')
    , pageSrcaper = require('../lib/pageSrcaper.js')
    ;

box.on('init', function (app, config, done) {
    pageSrcaper.init( config.request );
    process.nextTick(function() {
        done(null, 'plugin "pageSrcaper" initialised');
    });
});