
function fetchNorReadyLinks( ){
    var IDs = []
        , $notReady = $('.row.notReady').each( function(i,o){
            IDs.push($(this).data('id'));
        })
        ;

    if( IDs.length ){
        socket.emit('collection:fetchNotReadyLinks', {
                coll_id    : pageParam.coll_id,
                notReadyID : IDs,
                route:'/link/updated'
            },
            function( response ){
                debug.log ( 'collection:fetchNotReadyLinks:', response );
                return;

            if (!response.success){
                debug.error('Bad import', response);
            }else{
                debug.info('Import started', response);
                if( response.go_to ){
                    page(  response.go_to  );
                }
            }
        });
    }
}

head.ready(function() {
    fetchNorReadyLinks();
});