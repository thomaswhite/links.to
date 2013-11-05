/**
 * Created with JetBrains WebStorm.
 * User: Thomas White
 * Date: 09/10/13
 * Time: 21:48

 */

var job_id = 'link-fetch'
    ,  box = require('../lib/box')
    , debug = require('debug')('jobs:' + job_id )
    , async = require('async')
    , request = require('request')
    , _ = require('lodash')
    , linkDisplay = require('../lib/link-make-display')
    , config
;


function make_link_display( oURL, oURL2){
    //var tags = linkDisplay.tags();
    if( oURL ){
        return linkDisplay.update( oURL /*, tags*/);
    }else{
        return {
            statusCode: oURL2.statusCode,
            title : oURL2.url,
            description: 'This URL can not be found',
            summary:'',
            notFound : true
        };
    }
}

function update_link_display( oLink, oURL, done ){
    var oUpdate = {
        state : 'ready',
        url_id : oURL._id,
        display : oURL.display
    };
    box.invoke( 'link.update',  oLink._id, oUpdate, false, done);
}


    module.exports = {
    id : job_id,

    init: function(Config){
        config = Config;
    },

    /**
     * At this moment we have oLink and oURL.
     * We have the following cases:
     * 1. state == queued
     *      1.1 the oURL ia ready - copy .display and Done
     *      1.2 the oURL is still fetching - add an event listener for the oURL ready event
     *
     * 2. state == new
     *      2.1 existing oURL, created while the job was waiting
     *          2.1.1 oURL is ready
     *      2.2 fetch
     *          2.2.1 canonical URL exists
     *          2.2.2 parse, save, Done
     *
     * @param job: link_id, url_id, url
     * @param Done
     *
     */

    processor : function (job, Done){
        var sURL = job.data.url
            , request_options = _.merge( {}, box.config.request.default_request_settings, {uri:sURL, jar:request.jar()  })
            , hard_refresh
        ;
        if( !sURL ){
            dummy = 1;
        }
        async.parallel({
                Link: function(cb){
                        box.invoke('link.get', job.data.link_id, cb );
                      },
                URL : function(cb){
                       box.invoke('url.get', job.data.url_id, cb );
                },
                Page: function(cb){
                    box.invoke('page.find', sURL, null, cb );
                }
            },
            function(err, o){
                hard_refresh = o.Link.state == 'hard-refresh';
                if( err || o.Link.state == 'ready' ){ // queued and the URL become ready before this job was called
                    Done( err );
                    return;
                }
                if(o.Link.state == 'queued' && o.URL.state != 'timeout' ){
                    if(o.URL.state == 'ready' ){ // 1.1
                        box.invoke('url.update-links', o.URL._id, false, Done);
                    }else {
                        // 1.2 this event will be fired when the URL is ready. It will update the .display section of all links that are in state "queued"
                        //box.once( '' + o.URL._id, Done );
                        if(!o.URL.start_fetching || !(o.URL.start_fetching instanceof Date) || (new Date - o.URL.start_fetching > 180000) ){
                            box.invoke('url.set-state',  o.URL._id, 'timeout', function(err, u){
                                 Done( err || 'timeout' );
                            });
                        }else{
                            Done( 'still not ready' ); // fail the job so it will check later if the oURL is ready
                        }
                    }
                }else{ // 2 o.Link.state == 'new'
                    if(!o.URL ){
                        throw 'oURL is missing!';
                    }
                    if(o.URL.state == 'ready' && o.Link.state != 'refresh' && !hard_refresh && !o.Link.notFound ){
                        box.invoke('url.update-links', o.URL._id, false, Done);
                    }else if( o.Page && !hard_refresh ){ //&& !o.Link.notFound
                            box.invoke('url.set-page-id', o.URL._id, o.Page._id, function(err, updated ){
                               if( err ){ Done(err); }else{
                                   box.invoke( 'pageScrape', sURL, o.Page.html, function(err, page_Parts ){
                                       if( err ){ Done(err); }else{
                                           box.invoke('url.update-display-queued_and_new-links', o.URL._id, {display:linkDisplay.update( page_Parts )}, function(err, oUpdated_URL, number_of_updated_links){
                                               Done( err );
                                           });
                                       }
                                   });
                               }
                            });
                    }else {
                         // 2.2 fetching

                        if( job.data.do_not_fetch ){
                            Done();
                        }
                        box.invoke('url.set-state', o.URL._id, 'fetching');
                        request(request_options, function (err, response, page_HTML) {
                            if( err || response.statusCode != 200 ){
                                if( err ){
                                   job.log( err.message);
                                   debug(err.message);
                                }
                                var notFound = {
                                    statusCode: response ? response.statusCode : -1 ,
                                    url: o.URL.url
                                };
                                box.invoke('url.update-display-queued_and_new-links', o.URL._id, {display:make_link_display( null, notFound  ),err:err,  notFound : true}, function(err2, oUpdated_URL, number_of_updated_links){
                                    Done( err2 );
                                });
                            }else{
                                var canonicalURL = linkDisplay.find_canonical_url('' + page_HTML);
                                box.emit('url.check-url', canonicalURL, o.URL._id, function(err, found_same_url_oURL ){
                                    // TODO clear the case when found_same_url_oURL is not ready
                                    if( found_same_url_oURL && !hard_refresh && found_same_url_oURL.state == 'ready'){
                                        box.invoke('url.add-link-ids', found_same_url_oURL._id, [o.Link._id].concat(o.URL.links ), false, function(err, how_many_were_updated ){
                                            box.emit('url.delete', o.URL._id );
                                            box.invoke('url.update-display-queued_and_new-links', found_same_url_oURL._id, null, function( err, oURL_updated, updated_links_number){
                                                Done(err );
                                            });
                                        });
                                    }else{
                                        box.invoke('page.find', null, canonicalURL, function(err, Page ){
                                            if( err ){
                                                Done(err, 'page.find');
                                            }else if( Page && !hard_refresh ){
                                                    box.invoke('url.set-page-id', o.URL._id, Page._id);
                                                    // TODO: use body and head from the page
                                                    box.invoke( 'pageScrape', Page.url, page_HTML /*Page.html*/, function(err, page_Parts ){
                                                        var page2update = page_Parts.xhtml;
                                                        page2update.html = page_HTML;
                                                        delete page_Parts.xhtml;
                                                        page_Parts.display = linkDisplay.update( page_Parts );
                                                        box.invoke( 'page.update', Page._id, page2update, canonicalURL, canonicalURL, function(err){
                                                            if( err ){ Done(err )}else{
                                                                box.invoke('url.update-display-queued_and_new-links', o.URL._id, page_Parts, Done );
                                                            }
                                                        });
                                                    });
                                            }else{
                                                box.invoke( 'pageScrape', sURL, page_HTML, function(err, page_Parts ){
                                                    var page2save = page_Parts.xhtml;
                                                    page2save.html = page_HTML;
                                                    delete page_Parts.xhtml;
                                                    page_Parts.display = linkDisplay.update( page_Parts );
                                                    box.invoke('url.update-display-queued_and_new-links', o.URL._id, page_Parts, function(err, oUpdated_URL, number_of_updated_links){
                                                        if( hard_refresh && o.URL && o.URL.page_id){
                                                            box.invoke( 'page.update', o.URL.page_id, page2save, sURL, canonicalURL, Done);
                                                        }else{
                                                            box.invoke( 'page.save', page2save, sURL, canonicalURL, o.URL._id, Done);
                                                        }
                                                    });
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                }
            }
        );
    }
};
