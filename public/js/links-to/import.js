/**
 * Created with JetBrains WebStorm.
 * User: twhite
 * Date: 20/08/13
 * To change this template use File | Settings | File Templates.
 */

function disableSelection( $o ){
    $o.attr('unselectable','on')
        .css({'-moz-user-select':'-moz-none',
            '-moz-user-select':'none',
            '-o-user-select':'none',
            '-khtml-user-select':'none', /* you could also put this in a class */
            '-webkit-user-select':'none',/* and add the CSS class here instead */
            '-ms-user-select':'none',
            'user-select':'none'
        }).bind('selectstart', function(){ return false; });
}

$(document).ready(function() {
    $('body')
        .on('click', '.coll-title', function(){
            var $this = $(this)
                , $i = $this.find('i')
                , state = $i.hasClass( 'icon-expand-alt' ) ? 'closed' : 'expanded'
                , $row  =  $this.parent()
                , rowID = $row.attr('id')
                , $linkCont = $row.find('>div.links-cont')
                , id
             ;

            if( state == 'closed'){
                $i.removeClass( 'icon-expand-alt').addClass('icon-collapse-alt');
                folderId = rowID.split('_')[1];
                if( $linkCont.find('div').length ){
                    $linkCont.stop(true,true).slideDown(400);
                }else{
                    socket.emit('imports:folder_content', {
                        id   : folderId,
                        rowID : $row.attr('id')
                    }, function(data){
                        console.log ('import.folder_content:',  data);
                        $linkCont.stop(true,true).slideDown(400);
                        console.info( 'rendered HTML',
                            myRender('imports/import_folder_content', data.result, $linkCont, '$replace')
                        );

                    });
                }
            }else{
                $i.removeClass( 'icon-collapse-alt').addClass('icon-expand-alt');
                $linkCont.stop(true,true).slideUp(400);
            }
        })
        .on('select', '.coll-title', function(){
            return false;
        })
    ;

    disableSelection( $('.coll-title'));

    socket.on('import.processing', function(data){
        console.log ( 'import.processing, data:', data );
    });
    socket.on('import.root', function(data){
        console.log ( 'import.root, data:', data );
    });

});