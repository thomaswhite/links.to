/**
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01
 */

function page_init() {
    $('body').on('click', 'button.btnAdd', function(event){
        var $this = $(this).attr('disabled', true ),
            context = $this.data('context'),
            $addInput = $('input.addInput')
            ;

        context.value =  $addInput.val();
        socket.emit(context.action, context, function(dataDone){
            $this.removeAttr('disabled');
            console.log ('button.btnAdd', dataDone);
        });
    });


    socket.on('collection-adding', function( param, data ){
        // display waiting sign
    });
    socket.on('collection-added', function( param, data ){
        // if the current page is /collections/mine, just replace the waiting sign with the new collection name
        // else go to /collections/mine
    });

    socket.on('link-failure', function( param, data ){
        // display error message about the link
    });
    socket.on('link-adding', function( param, data ){
        // display waiting sign
    });
    socket.on('link-added', function( param, data ){
        // replace the waiting sign with the new link content
    });

}
