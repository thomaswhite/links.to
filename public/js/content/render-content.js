/**

 */

define([
    'jquery',
    'debug',
    'socket-io',
    'tiny-pubsub',
    'dustjs-linkedin',
    'dustjs-templates',
    './add-dust-helpers'
], function ($, debug, socket, tiny, dust ) {
    "use strict";

    var socketContext = {};

    function myRender(tempateID, data, $target, contentAction, done ) {
        if (!tempateID) { return; }
        var base = dust.makeBase({
            user:socketContext.user,
            pageParam:pageParam
        });
        if( !$target ){
            throw  'myRender: missing target';
        }
        data.user =   socketContext.user;
        try{
            dust.render(tempateID,  base.push(data), function(err, out) {
                out = $.trim(out) || '--empty--';
                if (err) {
                    err.where = 'myRender';
                    if($.isFunction(done)){
                        done(err);
                    }else{
                        throw err;
                    }
                } else {
                    var $out = $(out);
                    switch( contentAction ){
                        case 'append' :
                        case 1 :
                            $out.appendTo($target).hide().slideDown(400);
                            break;

                        case 'prepend' :
                        case -1:
                            $out.prependTo($target).hide().slideDown(400);
                            break;

                        case 'replace-slide':
                            $target.html(out).hide().slideDown(250);
                            break;

                        case '$replace':
                            $target.replaceWith( $out );
                            break;

                        case 'replace':
                        case 'replace-content':
                        default:
                            $target.html(out);
                            break;
                    }
                    if($.isFunction(done)){
                        done(err, out );
                    }
                }
            });
        }catch(e){
            throw e;
        }
    }

    tiny.sub("renderContent", function(event, tempateID, data, $container, contentAction, done){
        myRender( tempateID, data, $container, contentAction, done );
    });

    tiny.sub("slideUpDeleted", function(event, data, Context, routeIO){
        $('#' + Context.page.id_prefix + data.param.id ).slideUp(500, function(){
            $(this).remove();
        });
    });

    tiny.sub("insertLink", function(event, data, Context, routeIO){
        myRender( Context.page.tempateID, data, $("#token_" + data.param.token  ) , 'replace-slide', function(err, out){
            var dummy = 1;
        }); // Context.page.contentAction
    });

    tiny.sub("linkUpdated", function(event, data, Context, routeIO){
        myRender( Context.page.tempateID, data.link, $("#link_" + data.link._id  ) , Context.page.contentAction); // Context.page.contentAction
    });

    socket.on('user', function( data ){
        socketContext.user = data;
    });

    return {
        render: myRender
    };
});


