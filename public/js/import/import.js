/**
 * Created with JetBrains WebStorm.
 * User: twhite
 * Date: 20/08/13
 * To change this template use File | Settings | File Templates.
 *
 * Depends on $, socket
 */
define([
    'jquery',
    'socket-io',
    'debug',
    'tiny-pubsub',
    'content/pages'
], function ($, socket, debug, tiny, pages ) {
    "use strict";

    function disableSelection( $o ){
        $o.attr('unselectable','on')
            .css({
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
        if( data.progress > 99 ){
            $bar.slideUp(500);
        }
    }


    function get_import_parts(dom){
        var $this = $(dom)
            , $row = $this.closest('.folder')
            , $i = $row.find('> div > span > i')
            , $excluded =  $row.find('> div > input:checkbox.excluded')
            ;

        return {
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
    }

    function import_btn(event){
        $(this).attr('disabled', true );

        $('#importBtn').hide();
        $('#processBtn').show();
        $('#content').empty();

        socket.emit('imports:process', {
            id   : pageParam.id,
            fetch_links: $('#fetch_links').is(':checked')
        }, function( response ){
            if( false !== pages.socketResponse(response, 'imports:process') ){
                if (!response.success){
                    debug.log('Bad import', response);
                }
            }
        });
        event.preventDefault();
    }


    function coll_title (event){
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
                        tiny.pub("renderContent", ['imports/import_folder_content', data.result, o.$linkCont, '$replace'])
                    );
                });
            }
        }else{
            o.$i.removeClass( 'icon-collapse-alt').addClass('icon-expand-alt');
            o.$linkCont.stop(true,true).slideUp(300);
        }
    }

    function input_excluded(event){
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
            tiny.pub("renderContent", ['imports/import_summary', data.result, $('#beforeContent'), 'replace-content']);
        });
    }


    $('body')
        .on('click', '.coll-title', coll_title )
        .on('select', '.coll-title', function(event){  event.preventDefault();   })
        .on('change', 'input.excluded', input_excluded)
        .on('click', '.import-btn', import_btn )

        ;
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


    socket.on('import.process-start', function(data){
        pages.socketResponse(data, 'import.process-start', false, function(data){
            $('#tab-imported').trigger('click');
        });
    });
    socket.on('import.process-progress', function(data){
        pages.socketResponse(data, 'import.process-progress');
    });
    socket.on('import.process-end', function(data){
        pages.socketResponse(data, 'import.process-end', false, function(data){
           tiny.pub("renderContent",['imports/import_summary', {import:data}, $('#beforeContent'), 'replace-content']);
        });
    });
    socket.on('import.process-error', function(data){
        pages.socketResponse(data, 'import.process-error');
    });
    socket.on('import.process-queued', function(data){
        pages.socketResponse(data, 'import.process-queued');
    });


    socket.on('import.collection-start', function(data){
        pages.socketResponse(data, 'import.collection-start', false, function(data){
            $('#tab-imported').trigger('click');
            tiny.pub("renderContent", ['imports/import_imported_line', data, $('#imported'), 'append']);
        });
    });

    socket.on('import.collection-progress', function(data){
        pages.socketResponse(data, 'import.collection-progress', false, function(data){
            import_folder_progress( data );
        });
    });

    socket.on('import.collection-end', function(data){
        pages.socketResponse(data, 'import.collection-end', false, function(data){
            tiny.pub("renderContent", ['imports/import_imported_line', data, $('#folder_' + data._id ), '$replace']);
        });
    });
    socket.on('import.collection-error', function(data){
        pages.socketResponse(data, 'import.collection-error');
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

    // TODO refactor this for Single page Application
    tiny.sub('page-loaded', {catchUp:true}, function(event){
        disableSelection( $('.coll-title'));
    });

});