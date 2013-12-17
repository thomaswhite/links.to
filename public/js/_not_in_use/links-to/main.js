/**
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01
 */


// TODO: make sure adding the collection in coll/mine
function fnBtnAdd(event){
    var Context = pageContext(this, event);
    Context.$this.attr('disabled', true );
    Context.$input.attr('disabled', true );
    socket.emit(Context.page.routeIO, Context.data, function(dataDone){
        Context.$this.removeAttr('disabled');
        Context.$input.removeAttr('disabled').val('');
        log ('btn_Add', dataDone);

        if( Context.page.routeIO == "link:add" ){
            var param = Context.page.adding;
            $.publish('renderContent',  param.tempateID, dataDone, $(param.containerID), param.contentAction  );
            // myRender( param.tempateID, dataDone, $(param.containerID), param.contentAction  );
        }
    });
    event.preventDefault();
    //return false;
}

function fnBtnDelete(event){
    var Context = pageContext(this, event);
    Context.$closest.addClass('deleting');
    socket.emit(Context.page.routeIO, Context.data, function(dataDone){
        if( dataDone.result == 'ok' ){
            log ('btn_Delete: OK, ', Context.data, dataDone);
        }else{
            log ('btn_Delete: ERROR, ', Context.data, dataDone);
        }
    });
}

function inputCR(event){
    if( 13 == (event.which || event.keyCode) ){
        $(this).next().trigger('click');
        event.preventDefault();
        //return false;
    }
    return true;
}

function page_bottom_detected(event, nowTS, window_height){
    debug.log('page_bottom_detected, received. ts:' + nowTS + ', window_height:' + window_height );
}

$.subscribe('page-init', { catchUp:true }, function() {
    $('body')
        .on('click', 'button.btnAdd',     fnBtnAdd)
        .on('click', 'a.deleteIcon.coll', fnBtnDelete)
        .on('click', 'a.linkDelete',      fnBtnDelete)
        .on('keydown', 'input.addInput',  inputCR)
    ;
    $.subscribe('page_bottom_detected', page_bottom_detected);
    $.publish('page_bottom_detection');

    window.onerror = function(error, url, line, stack, extra) {
        debug.error(error, url, line, stack, extra);
        return true;
    };
});
