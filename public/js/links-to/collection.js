
function fetchNorReadyLinks( ){
    var IDs = []
        , $notReady = $('.row.notReady').each( function(i,o){
            IDs.push($(this).data('id'));
        })
        ;

    socket.emit('collection:fetchNotReadyLinks', {
        id          : pageParam.coll_id,
        notReadyID : IDs
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

head.ready(function() {
    fetchNorReadyLinks();
});