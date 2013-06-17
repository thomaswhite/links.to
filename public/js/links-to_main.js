/**
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01
 */

var pages = {
    '/coll':{
        routeIO: 'collection:list',
        tempateID:'collections/collections-list',
        containerID:'',
        contentID:''
    },
    '/coll/mine': {
        routeIO:'collection:mine',
        tempateID:'collections/collections-list',
        containerID:'',
        contentID:''
    },
    '/coll/new':{
        routeIO:'collection:add',
        tempateID:'collections/collection-list',
        containerID:'',
        contentID:''
    },
    '/coll/:id':{
        routeIO:'collection:get',
        tempateID:'collections/collection',
        containerID:'',
        contentID:''
    },
    '/coll/:id/delete': {
        routeIO:'collection:delete',
        tempateID:'collections/collections-list',
        containerID:'',
        contentID:''
    }
};


function index(){
    dust.render("main", {}, function(err, out) {
        if( err ) {
            console.error(err)
        }else{
            $('#content').html( err || out );
        }
    });
}


function getData( context, next){

    next();
}

function coll_list(context ){
}

function coll_get(context ){

}


function pageAddRoutes(){
    page({dispatch:false});
    page.base('/');
    page('/', index);
    page(['/coll','/coll/mine'], coll_list);
    page(['/coll/:id', '/w/c/:id'], coll_get);
}


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

function render(model, data, target, append) {
    if (!model) { return; }
    dust.render(model, data, function(err, out) {
        if (err) {
            console.log(err);
        }else if( !target ){
            console.log( out );
        } else {
            if( append ){
                $(target).append(out);
            }else{
                $(target).html(out);
            }
        }
    });
}
