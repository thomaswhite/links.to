/**
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01
 */

function pageAddRoutes(){
    page.base('/');
    page('/', index);
//    page('/coll/mine',  Mine);
    page('/coll',       coll_list);
//    page(['/coll/:id', '/w/c/:id'], Get);
//    page('/coll/:id/delete', Delete);

}

function index(){
    dust.render("main", {}, function(err, out) {
        if( err ) {
            console.error(err)
        }else{
            $('#content').html( err || out );
        }
    });
}

function coll_list(context, next ){

    next();
}

$(document).ready(function() {
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

});

function render(model) {
    if (!model) { return; }
    dust.render(model.template, model, function(err, out) {
        if (err) {
            console.log(err);
        } else {
            $('#collections').append(out);
        }
    });
}
