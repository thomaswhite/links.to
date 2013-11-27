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
        }).bind('selectstart', function(event ){ event.preventDefault(); });
}

function import_folder_progress_3( data ){
    var $bar = $('#folder_' + data._id + ' .progress-bar');
    $bar.attr('aria-valuenow',data.progress).width(data.progress + '%');
    $bar.find('.sr-only').text( data.progress + '% Complete');
}
function import_folder_progress( data ){
    var $bar = $('#folder_' + data._id + ' .bar');
    $bar.width(data.progress + '%');
    $bar.find('span').text( data.progress + '%');
}


function get_import_parts(dom){
    var $this = $(dom)
        , $row = $this.closest('.folder')
        , $i = $row.find('> div > span > i')
        , $excluded =  $row.find('> div > input:checkbox.excluded')
        , o = {
            $this   : $this,
            $row    : $row,
            $i      : $i,
            $linkCont : $row.find('>div.links-cont'),
            $excluded : $excluded,
            excluded : $excluded.length && !$excluded.is(':checked'),
            id      : $row.data('id'),
            state   : $i.hasClass( 'icon-expand-alt' ) ? 'closed' : 'expanded'
        }
    ;
    return o;
}


head.ready(function() {
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
                        debug.info ('import.folder_content:',  data);
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
            event.preventDefault();
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
                debug.log ('import.folder_excluded:',  data);
                o.$this.removeAttr('disabled');
                if(o.excluded ){
                    o.$row.addClass('excluded');
                    o.$i.removeClass( 'icon-collapse-alt icon-expand-alt').addClass('icon-ban-circle text-error');
                }else{
                    o.$row.removeClass('excluded');
                    o.$i.removeClass( 'icon-ban-circle text-error').addClass('icon-expand-alt');
                }
                myRender('imports/import_summary', data.result, $('#beforeContent'), 'replace-content');
            });
        })
        .on('click', '.import-btn', function(event){
            $(this).attr('disabled', true );

            $('#importBtn').hide();
            $('#processBtn').show();
            $('#content').empty();

            socket.emit('imports:process', {
                id   : pageParam.id,
                fetch_links: $('#fetch_links').is(':checked')
            }, function( response ){
                if (!response.success){
                    debug.log('Bad import', response);
                }else{
                    debug.log('Import started', response);
                    if( response.go_to ){
                        page(  response.go_to  );
                    }
                }
            });
            event.preventDefault();
        });
/*
        .on('click', '.nav .nav-tabs a#tab-imported', function(event){
            var $this = $(this)
                , contentID = $this.attr('href')
                , $ul = $this.closest('ul')
                , $content
            ;
            $ul.find('li').removeClass('active');
            $this.addClass('active');
        })
*/



    disableSelection( $('.coll-title'));

    socket.on('import.process-start', function(data){
        debug.log ( 'import.process-start:', data );
        $('#tab-imported').trigger('click');
    });
    socket.on('import.process-progress', function(data){
        debug.log ( 'import.process-progress:', data );
    });
    socket.on('import.process-end', function(data){
        debug.log ( 'import.process-end:', data );
        myRender('imports/import_summary', {import:data}, $('#beforeContent'), 'replace-content');
    });
    socket.on('import.process-error', function(data){
        debug.log ( 'import.process-end:', data );
    });
    socket.on('import.process-queued', function(data){
        debug.log ( 'import.process-queued:', data );
    });


    socket.on('import.collection-start', function(data){
        debug.log ( 'import.collection-start:', data );
        $('#tab-imported').trigger('click');
        myRender('imports/import_imported_line', data, $('#imported'), 'append');
    });

    socket.on('import.collection-progress', function(data){
        debug.log ( 'import.collection-progress:', data );
        import_folder_progress( data );
    });

    socket.on('import.collection-end', function(data){
        debug.log ( 'import.collection-end:', data );
        myRender('imports/import_imported_line', data, $('#folder_' + data._id ), '$replace');
    });
    socket.on('import.collection-error', function(data){
        debug.log ( 'import.collection-error:', data );
    });


    socket.on('import.link-start', function(data){
        debug.log ( 'import.link-start:', data );
    });
    socket.on('import.link-end', function(data){
        debug.log ( 'import.link-end:', data );
    });
    socket.on('import.link-error', function(data){
        debug.log ( 'import.link-error:', data );
    });


    socket.on('import.processing', function(data){
        debug.log ( 'import.processing:', data );
    });
    socket.on('import.root', function(data){
        debug.log ( 'import.root:', data );
    });



});