/**
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01

 */

define([
    'jquery',
    'socket-io',
    'debug',
    'tiny-pubsub',
    './page',
    './page-definitions',
    './render-content'
], function ($, socket, debug, tiny, page, pages ) {
    "use strict";

    function pageContext(that, event, context, route ){
        var o,
            this_page,
            $this = that ? $(that) : null;

        context = context || ($this ? $this.data('context'): null);
        route   = route   || (context ? context.route : 'missing');
        if( !context ){      context = {route:route};    }

        this_page    = pages[route];

        if( !this_page ){
            throw 'Missing route:' + route;
        }
        o =  {
            page       : this_page,
            data       : context,
            param      : event && event.data ? event.data : null,
            $this      : $this,
            $closest   : this_page.closest && $this ? $this.closest(this_page.closest) : null,
            $container : this_page.containerID      ? $(this_page.containerID)         : null
        };

        if(this_page.value) {
            var $input = o.$input = $(this_page.value);
            o.data.value = $input.val();
        }
        return o;
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
                debug.log ('getData:',  data);
                next();
            });
        }
    }

    function processRoute(context){
        var p = context.state.pageDef;
        tiny.pub('renderContent', [p.tempateID, context.state.pageData , $(p.containerID), 0, function(err, html){
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

    function socketResponse( response, on, noLog, done ){
        var exception = false;
        if( !on && response.param && response.param.emitted ){
            on =  response.param.emitted;
        }
        if( !on && response.request && response.request.emitted ){
            on =  response.request.emitted;
        }
        on = on || '?socketResponse?';

        if( !noLog ){
            debug.log ( on, response );
        }
        if( !response ){
            debug.warn('Missing response for "' + on + '"!');
        }else if( response.go_to ){
            page(  response.go_to  );
            exception = true;
        }else if( response.refresh || response.timeout  ){
            location.reload(true);
            exception = true;
        }
        if( typeof done === 'function'){
            if( !exception ){
                done( response );
            }
        }else{
            return exception ? false : response;
        }
    }

    /**
     * Prepares the context needed for the event related to this route
     * @param data
     */
    function socketEvent(data){
        data = socketResponse(data);
        var Context = pages.pageContext( null,null, null, data.param.route );
        tiny.pub(Context.page.eventDone, [ data, Context, data.param.route ] );
    }

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

    // TODO when adding a collection if the current page is /collections/mine, just replace the waiting sign with the new collection name else go to /collections/mine
    socket.on('collection.added',   socketEvent);
    socket.on('collection.deleted', socketEvent);
    socket.on('link.deleted',       socketEvent);
    socket.on('link.saved',         socketEvent);
    socket.on('link.updated',       socketEvent);

    return {
        pageContext     : pageContext,
        page            : page,
        socketEvent     : socketEvent,
        socketResponse  : socketResponse
    };

});
