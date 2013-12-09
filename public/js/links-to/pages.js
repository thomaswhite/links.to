/**
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01

    externals: $, $.publish, $.subscribe, page

 */

var pages = {
    '/imports':{
        routeIO: 'imports',
        tempateID:'collections/collection_list_container',
        containerID:'#container',
        contentID:'#coll-list-rows'
    },
    '/colls':{
        routeIO: 'collection:list',
        tempateID:'collections/collection_list_container',
        containerID:'#container',
        contentID:'#coll-list-rows'
    },
    '/colls/mine': {
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

    '/colls/new':{
        routeIO:'collection:add',
        tempateID:'collections/collection_list_add_line',
        containerID:'#coll-list-rows',
        contentAction:'prepend',
        value: '.addInput',
        eventDone:'renderContent'
    },
    '/colls/delete':{
        routeIO:'collection:remove',
        closest:'.row',
        id_prefix:'coll_',
        eventDone:'slideUpDeleted'
    },

    '/link/delete':{
        routeIO:'link:remove',
        closest:'.blocked-link',
        id_prefix:'link_',
        eventDone:'slideUpDeleted'
    },
    '/link/new':{
        routeIO:'link:add',
        value: '.addInput',
        tempateID:'links/link_add_one',
        containerID:'#grid',
        contentAction:'prepend',

        eventDone:'insertLink',
        adding:{
            tempateID:'links/link_adding',
            containerID:'#grid',
            contentAction:'prepend'
        }
    },
    '/link/updated':{
        interactive:false,  // used in fetchNorReadyLinks 
        routeIO:'link:add',
        tempateID:'links/link',
        //containerID:'!_id',
        contentAction:'$replace',
        eventDone:'linkUpdated'
    }
};

// =========================================

function page_context(that, event, context, route ){
    var o,
        page,
        $this = that ? $(that) : null;

    context = context || ($this ? $this.data('context'): null);
    route   = route   || (context ? context.route : 'missing');
    if( !context ){      context = {route:route};    }

    page    = pages[route];

    if( !page ){
        throw 'Missing route:' + route;
    }
    o =  {
        page       : page,
        data       : context,
        param      : event && event.data ? event.data : null,
        $this      : $this,
        $closest   : page.closest && $this ? $this.closest(page.closest) : null,
        $container : page.containerID      ? $(page.containerID)         : null
    };

    if(page.value) {
        var $input = o.$input = $(page.value);
        o.data.value = $input.val();
    }
    return o;
}

/*
function index(){
    dust.render("main", {}, function(err, out) {
        if( err ) {
            debug.error(err);
        }else{
            $('#content').html( err || out );
        }
    });
}
*/

function getData( context, next){
    var p = context.state.pageDef;

    if( context.state.pageData ){
        next();
    }else{
        socket.emit( p.routeIO, context.state.pageParam, function(data){
            // TODO: when there are pages append the data, not replace
            context.state.pageData = data.result;
            context.save();
            debug.log ('getData:',  data);
            next();
        });
    }
}

function processRoute(context){
    var p = context.state.pageDef;
    $.publish('renderContent', [p.tempateID, context.state.pageData , $(p.containerID), 0, function(err, html){
        if( err ){
            throw err;
        }
    }]);
}

function page_not_found(context){
    debug.log( 'page.js: missing path - ' + context.pathname );
    location.href = context.pathname;
    // $('#content').html( context.pathname + ' not found');
}


function pageAddRoutes(){
   // return;

    //page.base('/');
    page('/colls',
        function(context, next){
            context.state.pageDef = context.pageDef || pages['/colls'];
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
$.subscribe('page-init', { catchUp:true }, pageAddRoutes);

