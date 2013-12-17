define([
    'jquery',
    'debug',
    'tiny-pubsub',
    'socket-io',
    '../content/pages'
], function ($, debug, tiny, socket, pages ) {

    "use strict";

    function fnBtnAdd(event){
        var Context = pages.pageContext(this, event);
        Context.$this.attr('disabled', true );
        Context.$input.attr('disabled', true );
        socket.emit(Context.page.routeIO, Context.data, function(dataDone){
            Context.$this.removeAttr('disabled');
            Context.$input.removeAttr('disabled').val('');
            debug.log ('btn_Add', dataDone);

            if( Context.page.routeIO == "link:add" ){
                var param = Context.page.adding;
                tiny.pub('renderContent',  [param.tempateID, dataDone, $(param.containerID), param.contentAction ] );
                // myRender( param.tempateID, dataDone, $(param.containerID), param.contentAction  );
            }
        });
        event.preventDefault();
        //return false;
    }

    function fnBtnDelete(event){
        var Context = pages.pageContext(this, event);
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
            event.preventDefault();
        }
        return true;
    }

    $('body')
        .on('click', 'button.btnAdd',     fnBtnAdd)
        .on('click', 'a.deleteIcon.coll', fnBtnDelete)
        .on('click', 'a.linkDelete',      fnBtnDelete)
        .on('keydown', 'input.addInput',  inputCR)
    ;
});
