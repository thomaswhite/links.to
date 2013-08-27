/**
 * Created with JetBrains WebStorm.
 * User: twhite
 * Date: 20/08/13
 * To change this template use File | Settings | File Templates.
 */


$(document).ready(function() {
    $('body')
        .on('change', '.fakeFileCont input:file', function(){
            var $this = $(this);
            $this.closest('.fakeFileCont').find('input:text').val($this.val());
        })
        .on('click', '.fakeFileCont input:button, .fakeFileCont button', function(event){
          $(this).closest('.fakeFileCont').find('input:file').trigger('click');
        });

    $('.fakeFileCont input:file')
        .css('position','absolute')
        .css('top','-10000px')
    ;


    $('form#upload').iframePostForm({
        json : true,
        post : function ()	{
            console.info('Uploading..');
        },
        error:  function (response,desc){
           console.error('Bad upload', response, desc);
        },
        complete : function (response){
            if (!response.success){
                console.error('Bad upload');
                console.info(response);
            }else{
                console.info('Upload OK', response);
            }
        }
    });

    socket.on('import.processing', function(data){
        console.log ( 'import.processing, data:', data );
    });
    socket.on('import.root', function(data){
        console.log ( 'import.root, data:', data );
    });

});