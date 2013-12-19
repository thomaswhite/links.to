/**
 * Created by thomas on 15/12/13.
 */

define(['./imports',  'content/pages'], function ( imports, pages ) {

    var pagesDefinitions = {
      '/imports':{
            routeIO: 'imports',
            tempateID:'collections/collection_list_container',
            containerID:'#container',
            contentID:'#coll-list-rows'
      }
    };

    pages.addPageDefintions( pagesDefinitions );

    return { import:true}
});
