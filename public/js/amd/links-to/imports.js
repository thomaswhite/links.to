/**
 * Created with JetBrains WebStorm.
 * User: twhite
 * Date: 20/08/13
 * To change this template use File | Settings | File Templates.
 */

define([
    'jquery',
    'links-to/socket-io',
    'links-to/debug',
    'links-to/tiny-pubsub',
    'page'
    , 'amd/jquery.iframe-post-form'
], function ($, socket, debug, tiny, page ) {
    "use strict";


    $('body')
        .on('change', '.fakeFileCont input:file', function(){
            var $this = $(this);
            $this.closest('.fakeFileCont').find('input:text').val($this.val());
        })
        .on('click', '.fakeFileCont input:button, .fakeFileCont button', function(event){
          $(this).closest('.fakeFileCont').find('input:file').trigger('click');
        })
    ;

    socket.on('import.processing', function(data){
                debug.log ( 'import.processing, data:', data );
            })
          .on('import.root', function(data){
                debug.log ( 'import.root, data:', data );
           });

    tiny.sub('page-ready', function(event){
        $('.fakeFileCont input:file')
            .css('position','absolute')
            .css('top','-10000px')
        ;

        if($.isFunction( $.fn.iframePostForm) ){
            $('form#upload').iframePostForm({
                json : true,
                post : function ()	{
                    debug.info('Uploading..');
                },
                error:  function (response,desc){
                   debug.error('Bad upload', response, desc);
                },
                complete : function (response){
                    if (!response.success){
                        debug.error('Bad upload');
                        debug.info(response);
                    }else{
                        debug.info('Upload OK', response);
                        if( response.go_to ){
                            page( response.go_to  );
                        }
                    }
                }
            });
        }
    });
});