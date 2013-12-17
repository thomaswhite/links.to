/**
 * Created with JetBrains WebStorm.
 * User: twhite
 * Date: 20/08/13
 * To change this template use File | Settings | File Templates.
 */

define([
    'jquery',
    'socket-io',
    'debug',
    'tiny-pubsub',
    'content/pages',
    './jquery.iframe-post-form'
], function ($, socket, debug, tiny, pages ) {
    "use strict";


    function initFileUpload(){
        $('.fakeFileCont input:file').css({position:'absolute', top:'-10000px'});
        $('body')
            .on('change', '.fakeFileCont input:file', function(){
                var $this = $(this);
                $this.closest('.fakeFileCont').find('input:text').val($this.val());
            })
            .on('click', '.fakeFileCont input:button, .fakeFileCont button', function(event){
                $(this).closest('.fakeFileCont').find('input:file').trigger('click');
            })
        ;

    }
    function page_ready(event){

        initFileUpload();
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
                    pages.socketResponse( response, 'Upload OK');
                }
            }
        });
    }

    socket
        .on('import.processing', function(data){
            debug.log ( 'import.processing, data:', data );
        })
        .on('import.root', function(data){
            debug.log ( 'import.root, data:', data );
        });


    tiny.sub('page-ready', {catchUp:true}, page_ready );
});