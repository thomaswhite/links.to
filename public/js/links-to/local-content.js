

function addDustHelpers(){
    var helpers = dust.helpers;
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
}

/**
 *
 * @param model
 * @param data
 * @param target
 * @param contentAction: 1 or append, -1 or prepend, 0 or replace
 */
function myRender(tempateID, data, $target, contentAction, done ) {
    if (!tempateID) { return; }
    var base = dust.makeBase({
        user:socketContext.user,
        pageParam:pageParam
    });
    if( !$target ){
        throw  'myRender: missing target';
    }
    data.user =   socketContext.user;
    try{
        dust.render(tempateID,  base.push(data), function(err, out) {
            out = $.trim(out) || '--empty--';
            if (err) {
                err.where = 'myRender';
                throw err;
            } else {
                var $out = $(out);
                switch( contentAction ){
                    case 'append' :
                    case 1 :
                        $out.appendTo($target).hide().slideDown(400);
                        break;

                    case 'prepend' :
                    case -1:
                        $out.prependTo($target).hide().slideDown(400);
                        break;

                    case 'replace-slide':
                        $target.html(out).hide().slideDown(250);
                        break;

                    case '$replace':
                        $target.replaceWith( $out );
                        break;

                    case 'replace':
                    case 'replace-content':
                    default:
                        $target.html(out);
                        break;
                }
                if($.isFunction(done)){
                    done(err, out );
                }
            }
        });
    }catch(e){
        throw e;
    }
}

$.subscribe("renderContent", function(event, data, Context, routeIO){
    //Context = Context || page_context(null,null, routeIO);
    myRender( Context.page.tempateID, data, Context.$container, Context.page.contentAction);
});

$.subscribe("slideUpDeleted", function(event, data, Context, routeIO){
    $('#' + Context.page.id_prefix + data.param.id ).slideUp(500, function(){
        $(this).remove();
    });
});

$.subscribe("insertLink", function(event, data, Context, routeIO){
    myRender( Context.page.tempateID, data, $("#token_" + data.param.token  ) , 'replace-slide', function(err, out){
        var dummy = 1;
    }); // Context.page.contentAction
});

$.subscribe("linkUpdated", function(event, data, Context, routeIO){
    myRender( Context.page.tempateID, data.link, $("#link_" + data.link._id  ) , Context.page.contentAction); // Context.page.contentAction
});



function socketResponseCommon( response, on, noLog, done ){
    if( !on && response.param && response.param.emitted ){
        on =  response.param.emitted;
    }
    if( !on && response.request && response.request.emitted ){
        on =  response.request.emitted;
    }
    on = on || '?socketResponseCommon?';

    if( !noLog ){
        debug.log ( on, response );
    }
    if( !response ){
        debug.warn('Missing response for "' + on + '"!');
    }else if( response.go_to ){
        page(  response.go_to  );
    }else if( response.refresh || response.timeout  ){
        location.reload(true);
    }
    if($.isFunction(done )){
        done(response);
    }else{
        return response;
    }
}

/**
 * Prepares the context needed for the event related to this route
 * @param data
 */
function socketEvent_common(data){
    data = socketResponseCommon(data);
    var Context = page_context( null,null, null, data.param.route );
    $.publish(Context.page.eventDone, [ data, Context, data.param.route ] );
}

// TODO when adding a collection if the current page is /collections/mine, just replace the waiting sign with the new collection name else go to /collections/mine
socket.on('collection.added',   socketEvent_common);
socket.on('collection.deleted', socketEvent_common);
socket.on('link.deleted',       socketEvent_common);
socket.on('link.saved',         socketEvent_common);