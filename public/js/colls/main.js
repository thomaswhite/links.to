/**
 * Created by thomas on 15/12/13.
 */

define([
    'content/pages',
    'jquery',
    'debug',
    'tiny-pubsub'
], function ( pages ) {

    var pagesDefinitions = {
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
    }

    pages.addPageDefintions( pagesDefinitions );
    return { colls: true }
});
