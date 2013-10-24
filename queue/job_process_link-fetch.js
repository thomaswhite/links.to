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
            state:'ready',
            notFound : true,
            display:{
                statusCode: oURL2.statusCode,
                title : 'Not found: ' + oURL2.url,
                url:  oURL2.url,
                description: 'This URL can not be found',
                summary:'',
                notFound : true
            }
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
        var sURL = job.data.url, request_options = _.merge( {}, config.request.default_request_settings, {uri:sURL, jar:request.jar()  });
        async.parallel({
//                       Link: async.apply( box.invoke, 'link.get', job.data.link_id ),
//                       Url:  async.apply( box.invoke, 'url.get', job.data.url_id )
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
                if( err ){
                    Done( err );
                }else if(o.Link.state == 'ready' ){ // queued and the URL become ready before this job was called
                    Done( null );
                }else if(o.Link.state == 'queued'){
                    if(o.URL.state == 'ready'){ // 1.1
                        box.invoke('url.update-links', o.URL._id, false, Done);
                    }else {
                        // 1.2 this event will be fired when the URL is ready. It will update the .display section of all links that are in state "queued"
                        //box.once( '' + o.URL._id, Done );
                        Done( 'still not ready' ); // fail the job so it will check later of the oURL is ready
                    }
                }else{ // 2 o.Link.state == 'new'
                    if(!o.URL ){
                        var wtf = true;
                    }
                    if(o.URL.state == 'ready'){
                        box.invoke('url.update-links', o.URL._id, false, Done);
                    }else if(o.Page ){
                            box.invoke('url.set-page-id', o.URL._id, o.Page._id, function(err, page_Parts ){
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

                        if(   job.data.do_not_fetch ){
                            Done();
                        }
                        request(request_options, function (err, response, page_HTML) {
                            if( err || response.statusCode != 200 ){
                                var notFound = {
                                    statusCode: response ? response.statusCode : -1 ,
                                    url: o.URL.url
                                };
                                box.invoke('url.update-display-queued_and_new-links', o.URL._id, make_link_display( null, notFound  ), function(err2, oUpdated_URL, number_of_updated_links){
                                    Done( err2 );
                                });
                            }else{
                                var canonicalURL = linkDisplay.find_canonical_url('' + page_HTML);
                                box.emit('url.check-url', canonicalURL, o.URL._id , function(err, found_same_url_oURL ){
                                    if( found_same_url_oURL ){
                                        box.invoke('url.add-link-ids', found_same_url_oURL._id, [o.Link._id].concat(o.URL.links ), false, function(err, how_many_were_updated ){
                                            box.emit('url.delete', o.URL._id );
                                            box.invoke('url.update-display-queued_and_new-links', found_same_url_oURL._id, null, function( err, oURL_updated, updated_links_number){
                                                Done(err );
                                            });
                                        });
                                    }else{
                                        box.invoke('page.find', null, canonicalURL, function(err, Page ){
                                            if( err ){
                                                Done(err, 'page.save');
                                            }else if( Page ){
                                                    box.invoke('url.set-page-id', o.URL._id, Page._id);
                                                    box.invoke( 'pageScrape', sURL, Page.html, function(err, page_Parts ){
                                                        box.invoke('url.update-display-queued_and_new-links', o.URL._id, {display:linkDisplay.update( page_Parts )}, function(err, oUpdated_URL, number_of_updated_links){
                                                            Done( err );
                                                        });
                                                    });
                                            }else{
                                                box.invoke( 'page.save', page_HTML, sURL, canonicalURL, o.URL._id, function(err, added_page ){
                                                    if( err ){
                                                        Done(err, 'page.save');
                                                    }else{
                                                        box.invoke( 'pageScrape', sURL, page_HTML, function(err, page_Parts ){
                                                            box.invoke('url.update-display-queued_and_new-links', o.URL._id, {display:linkDisplay.update( page_Parts )}, function(err, oUpdated_URL, number_of_updated_links){
                                                                Done( err );
                                                            });
                                                        });
                                                    }
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
