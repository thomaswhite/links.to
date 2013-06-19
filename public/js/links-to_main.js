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
    }) ;
};
