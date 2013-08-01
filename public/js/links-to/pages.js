/**
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01
 */

var pages = {
    '/coll':{
        routeIO: 'collection:list',
        tempateID:'collections/collection_list_container',
        containerID:'#container',
        contentID:'#coll-list-rows'
    },
    '/coll/mine': {
        routeIO:'collection:mine',
        tempateID:'collections/collection_list_container',
        containerID:'#container',
        contentID:''
    },
    '/coll/:id':{
        routeIO:'collection:get',
        tempateID:'collections/collection_container',
        containerID:'#container',
        contentID:''
    },
    '/coll/:id/delete': {
        routeIO:'collection:delete',
        tempateID:'collections/collections-list',
        containerID:'#container',
        contentID:''
    },

    '/coll/new':{
        routeIO:'collection:add',
        tempateID:'collections/collection_list_add_line',
        containerID:'#coll-list-rows',
        contentAction:'prepend',
        value: '.addInput'
    },
    '/coll/delete':{
        routeIO:'collection:remove',
        closest:'.row',
        id_prefix:'coll_'
    },

    '/link/delete':{
        routeIO:'link:remove',
        closest:'.blocked-link',
        id_prefix:'link_'
    },
    '/link/new':{
        routeIO:'link:add',
        tempateID:'collections/collection_list_add_line',
        containerID:'#grid',
        // contentAction:'prepend',
        value: '.addInput'
    }
};

// =========================================

function page_context(that, event, context, route ){
    var o,
        page,
        $this = that ? $(that) : null;

    context = context || ($this ? $this.data('context'): null);
    route   = route   || (context ? context.route : 'missing');
    if( !context ){
        context = {route:route};
    }
    page    = pages[route];
    o =  {
        $this      : $this,
        $closest   : page.closest && $this ? $this.closest(page.closest) : null,
        $container : page.containerID      ? $(page.containerID)         : null,
        data       : context,
        page       : page,
        param      : event && event.data ? event.data : null
    };

    if(page.value) {
        var $input = o.$input = $(page.value);
        o.data.value = $input.val();
    }
    return o;
}

function index(){
    dust.render("main", {}, function(err, out) {
        if( err ) {
            console.error(err);
        }else{
            $('#content').html( err || out );
        }
    });
}

function getData( context, next){
    var p = context.state.pageDef;

    if( context.state.pageData ){
        next();
    }else{
        socket.emit( p.routeIO, context.state.pageParam, function(data){
            // TODO: when there are pages append the data, not replace
            context.state.pageData = data.result;
            context.save();
            console.log ('getData:',  data);
            next();
        });
    }
}

function processRoute(context){
    var p = context.state.pageDef;
    myRender(p.tempateID, context.state.pageData , p.containerID, 0);
}

function page_not_found(context){
    console.log( 'page.js: missing path - ' + context.pathname );
    location.href = context.pathname;
    // $('#content').html( context.pathname + ' not found');
}

function pageAddRoutes(){
    return;

    //page.base('/');
    page('/coll',
        function(context, next){
            context.state.pageDef = context.pageDef || pages['/coll'];
            context.state.pageParam = {
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
            context.state.pageDef = context.pageDef || pages['/coll/:id'];
            context.state.pageParam = {
                coll_id: context.params.id
            };
            context.save();
            next();
        },
        getData,
        processRoute
    );

    page('*', page_not_found);
    page.start({dispatch:false});
}
