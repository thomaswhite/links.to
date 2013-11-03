/**
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01
 */


/**
 *
 * @param model
 * @param data
 * @param target
 * @param contentAction: 1 or append, -1 or prepend, 0 or replace
 */
function myRender(tempateID, data, $target, contentAction) {
    if (!tempateID) { return; }

    var base = dust.makeBase({
        user:socketContext.user,
        pageParam:pageParam
    });

    data.user =   socketContext.user;
    dust.render(tempateID,  base.push(data), function(err, out) {
        if (err) {
            debug.error(err.message);
        }else if( !$target ){
            debug.log( out );
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
        }
        return out;
    });
}


var pageEvents = {
    renderContent:function(event, data, Context, routeIO){
        //Context = Context || page_context(null,null, routeIO);
        myRender( Context.page.tempateID, data, Context.$container, Context.page.contentAction);
    },

    slideUpDeleted:function(event, data, Context, routeIO){
        $('#' + Context.page.id_prefix + data.param.id ).slideUp(500, function(){
            $(this).remove();
        });
    },
    insertLink:function(event, data, Context, routeIO){
        myRender( Context.page.tempateID, data, $("#token_" + data.param.token  ) , 'replace-slide'); // Context.page.contentAction
    },
    linkUpdated:function(event, data, Context, routeIO){
        myRender( Context.page.tempateID, data.link, $("#link_" + data.link._id  ) , Context.page.contentAction); // Context.page.contentAction
    }
};

// TODO: make sure adding the collection in coll/mine
function fnBtnAdd(event){
    var Context = page_context(this, event);
    Context.$this.attr('disabled', true );
    Context.$input.attr('disabled', true );
    socket.emit(Context.page.routeIO, Context.data, function(dataDone){
        Context.$this.removeAttr('disabled');
        Context.$input.removeAttr('disabled').val('');
        debug.log ('btn_Add', dataDone);

        if( Context.page.routeIO == "link:add" ){
            var param = Context.page.adding;
            myRender( param.tempateID, dataDone, $(param.containerID), param.contentAction  );
            //if( dataDone.state != 'found'){
                setTimeout('$("#token_"' + dataDone.token + '" ).slideUp(400)', 1000);
            //}
        }
        return;
    });
}

function fnBtnDelete(event){
    var Context = page_context(this, event);
    Context.$closest.addClass('deleting');
    socket.emit(Context.page.routeIO, Context.data, function(dataDone){
        if( dataDone.result == 'ok' ){
            debug.log ('btn_Delete: OK, ', Context.data, dataDone);
        }else{
            debug.log ('btn_Delete: ERROR, ', Context.data, dataDone);
        }
    });
}

function inputCR(event){
    if( 13 == (event.which || event.keyCode) ){
        $(this).next().trigger('click');
        return false;
    }
    return true;
}

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
 * Prepares the context needed for the event related to this route
 * @param data
 */
function socketEvent_common(data){
    var Context = page_context( null,null, null, data.param.route );
    debug.log ( 'socketEvent_common, data:', data, ' context:', Context );
    $('body').trigger(Context.page.eventDone, [ data, Context, data.param.route ] );
}

function socketResponseCommon( response, on, noLog, done ){
    on = on || (response.param && response.param.emitted ? response.param.emitted :'') || '?socketResponseCommon?';
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

function page_bottom_detected(event, nowTS, window_height){
    debug.info('page_bottom_detected, received. ts:' + nowTS + ', window_height:' + window_height );
}

function page_init() {
    addDustHelpers();

    $('body').on('click', 'button.btnAdd',     fnBtnAdd);
    $('body').on('click', 'a.deleteIcon.coll', fnBtnDelete);
    $('body').on('click', 'a.linkDelete',      fnBtnDelete);
    $('body').on('keydown', 'input.addInput',  inputCR);
    $('body').on('page_bottom_detected',       page_bottom_detected);

    $('body').trigger('page_bottom_detection');


    $.each(pageEvents, function(id, fn ){
        $('body').on(id, fn);
    });


//    detect_bottom();

        // TODO if the current page is /collections/mine, just replace the waiting sign with the new collection name
// else go to /collections/mine
    socket.on('collection.added',   socketEvent_common);
    socket.on('collection.deleted', socketEvent_common);
    socket.on('link.deleted',       socketEvent_common);
    socket.on('link.saved',         socketEvent_common);
    socket.on('link.updated',       socketEvent_common);

}
