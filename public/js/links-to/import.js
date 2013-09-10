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

function get_import_parts(dom){
    var $this = $(dom)
        , $row = $this.closest('.row')
        , $i = $row.find('> div > span > i')
        , $excluded =  $row.find('> div > input.excluded')
        , o = {
            $this   : $this,
            $row    : $row,
            $i      : $i,
            $linkCont : $row.find('>div.links-cont'),
            $excluded : $excluded,
            excluded : !$excluded.is(':checked'),
            id      : $row.data('id'),
            state   : $i.hasClass( 'icon-expand-alt' ) ? 'closed' : 'expanded'
        }
    ;
    return o;
}


$(document).ready(function() {
    $('body')
        .on('click', '.coll-title', function(event){
            var o = get_import_parts(this);
            if(event.target.tagName == 'INPUT' || o.excluded ){
                return;
            }
            if(o.state == 'closed'){
                o.$i.removeClass( 'icon-expand-alt').addClass('icon-collapse-alt');
                if( o.$linkCont.find('div').length ){
                    o.$linkCont.stop(true,true).slideDown(300);
                }else{
                    socket.emit('imports:folder_content', {
                        id   : o.id,
                        rowID : o.$row.attr('id')
                    }, function(data){
                        debug.log ('import.folder_content:',  data);
                        o.$linkCont.stop(true,true).slideDown(300);
                        debug.info( 'rendered HTML',
                            myRender('imports/import_folder_content', data.result, o.$linkCont, '$replace')
                        );
                    });
                }
            }else{
                o.$i.removeClass( 'icon-collapse-alt').addClass('icon-expand-alt');
                o.$linkCont.stop(true,true).slideUp(300);
            }
        })
        .on('select', '.coll-title', function(event){
            return false;
        })
        .on('change', 'input.excluded', function(event){
            var o = get_import_parts(this);

            o.$this.attr('disabled', true );
            o.$linkCont.stop(true,true).hide();
            o.$i.removeClass( 'icon-collapse-alt').addClass('icon-expand-alt');
            if(o.excluded ){
                o.$row.addClass('excluded');
            }
            socket.emit('imports:folder_exclude', {
                id   : o.id,
                excluded : o.excluded
            }, function(data){
                o.$this.removeAttr('disabled');
                if(o.excluded ){
                    o.$row.addClass('excluded');
                    o.$i.removeClass( 'icon-collapse-alt icon-expand-alt').addClass('icon-ban-circle text-error');
                }else{
                    o.$row.removeClass('excluded');
                    o.$i.removeClass( 'icon-ban-circle text-error').addClass('icon-expand-alt');
                }
                debug.log ('import.folder_excluded:',  data);
            });
        })
        .on('click', '.import-btn', function(event){
            $(this).attr('disabled', true );
            socket.emit('imports:process', {
                id   : pageParam.id
            }, function( response ){
                if (!response.success){
                    debug.error('Bad import', response);
                }else{
                    debug.info('Import started', response);
                    if( response.go_to ){
                        page(  response.go_to  );
                    }
                }
            });


            return false;
        })

    ;

    disableSelection( $('.coll-title'));

    socket.on('import.processing', function(data){
        debug.log ( 'import.processing, data:', data );
    });
    socket.on('import.root', function(data){
        debug.log ( 'import.root, data:', data );
    });

});