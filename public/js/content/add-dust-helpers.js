define([
    'moment',
    'dustjs-linkedin',
    'dustjs-helpers'
], function (moment, dust, helpers) {

    helpers.timeFromNow = function(chunk, ctx, bodies, params) {
        var time = helpers.tap(params.time, chunk, ctx);
        return time ? chunk.write( moment(time).fromNow() )
            : chunk;
    };
    helpers.timeStamp = function(chunk, ctx, bodies, params) {
        var time  = helpers.tap(params.time, chunk, ctx),
            format = helpers.tap(params.format, chunk, ctx) || 'YYYY-MM-DD HH:mm';

        return time ? chunk.write( moment(time).format(format) )
            : chunk;
    };

    return dust;
});
