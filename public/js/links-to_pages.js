/**
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01
 */

var pages = {
    '/coll':{
        routeIO: 'collection:list',
        tempateID:'collections/collections-list',
        containerID:'#content',
        contentID:''
    },
    '/coll/mine': {
        routeIO:'collection:mine',
        tempateID:'collections/collections-list',
        containerID:'#content',
        contentID:''
    },
    '/coll/new':{
        routeIO:'collection:add',
        tempateID:'collections/collection-list',
        containerID:'#content',
        contentID:''
    },
    '/coll/:id':{
        routeIO:'collection:get',
        tempateID:'collections/collection',
        containerID:'#content',
        contentID:''
    },
    '/coll/:id/delete': {
        routeIO:'collection:delete',
        tempateID:'collections/collections-list',
        containerID:'#content',
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
    var p = context.pageDef;

    if( context.pageData ){
        next();
    }else{
        socket.emit( p.routeIO, context.pageParam, function(data){
            // TODO: when there are pages append the data, not replace
            context.pageData = data.result;
            context.save();
            console.log ('getData:',  data);
            next();
        });
    }
}

function processRoute(context){
    var p = context.pageDef;
    render(p.tempateID, context.pageData , p.containerID, false);
}

function page_not_found(context){
   $('#content').html( context.pathname + ' not found');
}

function pageAddRoutes(){
    //page.base('/');
    page('/coll',
        function(context, next){
            context.pageDef = context.pageDef || pages['/coll'];
            context.pageParam = {
                filter:{},
                param:{ page:1 }
            };
            context.save();
            next();
        },
        getData,
        processRoute
    );
    page('/coll/:id',
        function(context, next){
            context.pageDef = context.pageDef || pages['/coll/:id'];
            context.pageParam = {
                coll_id: context.params.id
            };
            next();
        },
        getData,
        processRoute
    );

    page('*', page_not_found);
    page.start({dispatch:false});
}

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
