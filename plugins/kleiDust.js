var box = require('../lib/box')
    , path = require('path')
    , kleiDust = require('klei-dust')
//    , Dust = require('dustjs-linkedin')
    , helpers = require('dustjs-helpers')
    , moment = require('moment')
    , util = require('util')
    , config;

box.kleiDust = kleiDust;




box.on('init', function (App, Config, done) {
    var ts   = new Date().getTime();
    config = Config;

    kleiDust.setOptions({
          root: path.join(config.__dirname, 'views'),
          relativeToFile: false,
          keepWhiteSpace: true,
          useHelpers: false,
          cache: false,
          stream: false
    });

 //   done(null, 'plugin kleiDust initialised ');
 //   return;
    require('../lib/duster').watch(
        kleiDust.getDust(),
        path.join(config.__dirname, 'views'),
        path.join(config.__dirname, 'public/templates'),
        '.dust',
        function(err, result ){
            var ts2   = new Date().getTime();
            done( null, '+' + ( new Date().getTime() - ts) + 'ms plugin "kleiDust" initialised [' + result.join(', ') + ']');
        }
    );
});

box.on('init.attach', function(app, config, done){
    var ts   = new Date().getTime();
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
    box.utils.later( done, null, '+' + ( new Date().getTime() - ts) + 'ms plugin "kleiDust" attached.');
});