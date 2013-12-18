/**
 * Created with JetBrains WebStorm.
 * User: twhite
 * Date: 20/08/13
 * To change this template use File | Settings | File Templates.
 */


head.ready(function() {
    $('body')
        .on('change', '.fakeFileCont input:file', function(){
            var $this = $(this);
            $this.closest('.fakeFileCont').find('input:text').val($this.val());
        })
        .on('click', '.fakeFileCont input:button, .fakeFileCont button', function(event){
          $(this).closest('.fakeFileCont').find('input:file').trigger('click');
        })
    ;


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
    socket.on('import.processing', function(data){
        debug.log ( 'import.processing, data:', data );
    });
    socket.on('import.root', function(data){
        debug.log ( 'import.root, data:', data );
    });

});