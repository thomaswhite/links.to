var box = require('../modules/box.js')
    , pageSrcaper = require('../modules/pageSrcaper.js')
    ;

box.on('init', function (app, config, done) {
    pageSrcaper.init( config.request );
    done(null, 'plugin middleware initialised');
});