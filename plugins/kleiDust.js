var box = require('../box.js')
    , path = require('path')
    , kleiDust = require('klei-dust')
    , util = require('util')
    , config;

box.kleiDust = kleiDust;

box.on('init', function (App, Config, done) {
    config = Config;

    kleiDust.setOptions({
          root: path.join(config.__dirname, 'views'),
          relativeToFile: true,
          keepWhiteSpace: true,
          useHelpers: false,
          cache: false,
          stream: false
    });

    require('../lib/watcher').watch(
        kleiDust.getDust(),
        path.join(config.__dirname, 'views'),
        path.join(config.__dirname, 'public/templates'),
        '.dust',
        function(err, result ){
            done(null, 'plugin kleiDust initialised ' + util.inspect(result, { showHidden: true, depth: null, colors:false }) );
        }
    );
});

box.on('init.attach', function(app, config, done){

    box.dust = {
        render: function(template, context, res) {
            var opt = kleiDust.getOptions();
            if( opt.stream  ){
                var stream = kleiDust.getDust().stream(template, context);
                stream.on('data', function(data) {       res.write(data);     });
                stream.on('end', function() {            res.end();           });
                stream.on('error', function(err) {       res.end(err);        });
            }else{
                kleiDust.dust(template, context, function(err, out) {
                    if (err ){
                        throw err;
                    }else{
                        res.send( out);
                    }
                });
            }
        },
        makeBase: function( o ) {
            return kleiDust.getDust().makeBase( o );
        }
    };

    done(null, 'plugin kleiDust initialised');
})