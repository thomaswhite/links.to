var box = require('../modules/box.js')
    , path = require('path')
    , kleiDust = require('klei-dust')
    , helpers = require('dustjs-helpers')
    , moment = require('moment')
    , util = require('util')
    , debug = require('debug')('linksTo:plugin:kleiDust')
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

 //   done(null, 'plugin kleiDust initialised ');
 //   return;
    require('../modules/duster').watch(
        kleiDust.getDust(),
        path.join(config.__dirname, 'views'),
        path.join(config.__dirname, 'public/templates'),
        '.dust',
        function(err, result ){
            result.push( '--------------------- > plugin kleiDust initialised ');
            done(null, result );
        }
    );
});

box.on('init.attach', function(app, config, done){

    box.dust = {
        render: function( res, template, context) {
            var opt = kleiDust.getOptions(),
                Context = context.stack && context.stack.tail ? context:  kleiDust.getDust().makeBase( context );

            context.context = config.context;
 //         debug( "Dust render context: \n", box.utils.inspect( context ));

            if( opt.stream  ){
                var stream = kleiDust.getDust().stream(template, Context);
                stream.on('data', function(data) {       res.write(data);     });
                stream.on('end', function() {            res.end();           });
                stream.on('error', function(err) {       res.end(err);        });
            }else{
                kleiDust.dust(template, Context, function(err, out) {
                    if (err ){
                        throw err;
                    }else{
                        res.send( out);
                    }
                });
            }
        },
        makeBase: function( o ) {
            o.config = config;
            return kleiDust.getDust().makeBase( o );
        }
    };

    var hlp = kleiDust.getDust().helpers;
    hlp.timeFromNow = function(chunk, ctx, bodies, params) {
        var time = hlp.tap(params.time, chunk, ctx);
        return time ? chunk.write( moment(time).fromNow() )
                     : chunk;
    };
    hlp.timeStamp = function(chunk, ctx, bodies, params) {
        var time  = hlp.tap(params.time, chunk, ctx),
            format = hlp.tap(params.format, chunk, ctx) || 'YYYY-MM-DD HH:mm';
        return time ? chunk.write( moment(time).format(format) )
            : chunk;
    };

    done(null, 'plugin kleiDust attached');
});