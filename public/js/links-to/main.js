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
            console.error(err);
        }else if( !$target ){
            console.log( out );
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

                case 'replace':
                default:
                    $target.html(out);
                    break;
            }
        }
    });
}


var pageEvents = {
    renderContent:function(event, data, routeIO, Context){
        Context = Context || page_context(null,null, routeIO);
        myRender( Context.page.tempateID, data, Context.$container, Context.page.contentAction);
    },

    collectionDelete:function(event, data, routeIO, Context){
        Context = Context || page_context(null,null, routeIO);
        $('#' + Context.page.id_prefix + data.param.id ).slideUp(500, function(){
            $(this).remove();
        });
    },
    insertLink:function(event, data, routeIO, Context){
        Context = Context || page_context(null,null, routeIO);
        myRender( Context.page.tempateID, data, $("#token_" + data.param.token  ) , 'replace-slide'); // Context.page.contentAction
    }
};

// TODO: make sure adding the collection in in coll/mine
function fnBtnAdd(event){
    var Context = page_context(this, event);
    Context.$this.attr('disabled', true );
    Context.$input.attr('disabled', true );
    socket.emit(Context.page.routeIO, Context.data, function(dataDone){
        Context.$this.removeAttr('disabled');
        Context.$input.removeAttr('disabled').val('');
        console.log ('btn_Add', dataDone);

        if( Context.page.routeIO == "link:add" ){
            var param = Context.page.adding;
            myRender( param.tempateID, dataDone, $(param.containerID), param.contentAction  );
            if( dataDone.state != 'found'){
                setTimeout('$("#token_"' + dataDone.token + '" ).slideUp(400)', 1000);
            }
        }
        return;
    });
}

function fnBtnDelete(event){
    var Context = page_context(this, event);
    Context.$closest.addClass('deleting');
    socket.emit(Context.page.routeIO, Context.data, function(dataDone){
        if( dataDone.result == 'ok' ){
            console.log ('btn_Delete: OK, ', Context.data, dataDone);
        }else{
            console.log ('btn_Delete: ERROR, ', Context.data, dataDone);
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

function socketEvent_common(data){
    var Context = page_context( null,null, null, data.param.route );
    console.log ( 'socketEvent_common, data:', data, ' context:', Context );
    $('body').trigger(Context.page.eventDone, [ data, data.param.route, Context] );
}

function page_init() {
    addDustHelpers();

    $('body').on('click', 'button.btnAdd',     fnBtnAdd);
    $('body').on('click', 'a.deleteIcon.coll', fnBtnDelete);
    $('body').on('click', 'a.linkDelete',      fnBtnDelete);
    $('body').on('keydown', 'input.addInput',  inputCR);

    $.each(pageEvents, function(id, fn ){
        $('body').on(id, fn);
    });

    // TODO if the current page is /collections/mine, just replace the waiting sign with the new collection name
// else go to /collections/mine
    socket.on('collection.added',   socketEvent_common);
    socket.on('collection.deleted', socketEvent_common);
    socket.on('link.deleted',       socketEvent_common);
    socket.on('link.saved',         socketEvent_common);

}
