var box = require('../modules/box.js')
    , pageSrcaper = require('../modules/pageSrcaper.js')
    ;

box.on('init', function (app, config, done) {
    pageSrcaper.init( config.request );
    process.nextTick(function() {
        done(null, 'plugin "pageSrcaper" initialised');
    });
});