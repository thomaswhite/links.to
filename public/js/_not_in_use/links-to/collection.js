
function rowIDs($rows){
   var IDs = [], id;
    $rows.each( function(i,o){
        if( (id = $(this).data('id'))){
            IDs.push(id);
        }
    });
    return IDs;
}

function fetchNorReadyLinks( event, selector, refresh  ){
    if( event){
        selector = event.data.selector;
        refresh  = event.data.refresh;
    }
    selector =  selector || '.row'; // refresh the whole collection
    var IDs = rowIDs( $(selector) );
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

function deleteNoFoundLinks(event ){
    var IDs = rowIDs($('#grid div.link-content a.notFound').closest('.row')),
        btn = event.target,
        $btn = $(btn);

    if( IDs.length ){
        socket.emit('collection:deleteMissingLinks', {
                emitted:'collection:deleteMissingLinks',
                coll_id    : pageParam.coll_id,
                missingID : IDs,
                route:'/link/delete' // to be used when individual delete events come back
            },
            function( response ){
                 socketResponseCommon(response);
                 $btn.hide(400);
            }
        );
    }
    return false;
}

function display_deleteNoFoundLinks(){
    var notFound = $('#grid div.link-content a.notFound');
    if( notFound.length ){
        $('#delete404').css('display', 'inline-block');
    }
}

head.ready(function() {
    fetchNorReadyLinks(null, '.row.notReady');
    $('.refresh-coll').click({selector:'.row', refresh:true}, fetchNorReadyLinks );
    $('body').on('click', '#delete404',     deleteNoFoundLinks);

    $.subscribe('insertLink', display_deleteNoFoundLinks);
    display_deleteNoFoundLinks();
});