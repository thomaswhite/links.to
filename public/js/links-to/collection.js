
function fetchNorReadyLinks( event, selector, refresh  ){
    if( event){
        selector = event.data.selector;
        refresh  = event.data.refresh;
    }
    selector =  selector || '.row'; // refresh the whole collection
    var IDs = []
        , $notReady = $(selector).each( function(i,o){
            var id = $(this).data('id');
            if( id ){
                IDs.push(id);
            }
        })
        ;

    if( IDs.length ){
        socket.emit('collection:fetchNotReadyLinks', {
                emitted:'collection:fetchNotReadyLinks',
                coll_id    : pageParam.coll_id,
                notReadyID : IDs,
                refresh : !!refresh, //'hard',
                route:'/link/updated'
            },
            socketResponseCommon
        );
    }
}

head.ready(function() {
    fetchNorReadyLinks(null, '.row.notReady');
    $('.refresh-coll').click({selector:'.row', refresh:true}, fetchNorReadyLinks );
});