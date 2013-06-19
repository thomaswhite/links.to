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

var pagesData = {};

function index(){
    dust.render("main", {}, function(err, out) {
        if( err ) {
            console.error(err)
        }else{
            $('#content').html( err || out );
        }
    });
}

socket.on('data', function( param, data ){
    console.log ('data', param, data);
    socketData[param.path] = data;
    //TODO: add data under [search].data and append rows when paginate
    //TODO: trigger update event to refresh the target Area.
    page.show(param.route); // navigate to the route and now there will be data for it.
});

function getData( context, next){
    var p = context._page,
        savedData = pagesData[ context.pathname ];

    if( savedData ){
        context.data = savedData;
        next();
    }else{
        // TODO refine pagaParam usage
        socket.emit( p.routeIO, pageParam, function(data){
            // save pageParam somehow
            pagesData[ context.pathname ] = data;
            context.data = data;
            console.log ('getData:',  data);
            next();
        });
    }
}

function processRoute(context){
    var p = context._page; //  pages[context.pathname];
    render(p.tempateID, context.data , p.containerID, false);
}

function page_not_found(context){
   $('#content').html( context.pathname + ' not found');
}

function pageAddRoutes(){
    //page.base('/');
    for(var i in pages){
        var pg = pages[i];
        page(i,
            function(context, next){
                context._page = pg;
                getData(context,next);
            },
            processRoute
        );
    }

    page('*', page_not_found);
    page.start({dispatch:false});

    // data for the first loaded page are in socketContext

//    page('/', index);
//    page(['/coll','/coll/mine'], coll_list);
//    page(['/coll/:id', '/w/c/:id'], coll_get);
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
