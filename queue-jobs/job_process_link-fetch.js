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

function saveError(err, oLink, oURL, extra ){
    var upadate =  _.merge( {error:err}, extra );
    if( err ){
        if(oLink){
            box.invoke('link.update-fast', oLink._id, upadate);
        }
        if( oURL ){
            box.invoke('url.update-fast', oURL._id, upadate );
        }
    }
}

function check_if_url_has_timedout_and_fail_the_job( oURL, Done){
    if( !oURL.start_fetching || !(oURL.start_fetching instanceof Date) || (new Date - oURL.start_fetching > 15000) ){
        if( Done ){
            box.invoke('url.set-state',  oURL._id, 'timeout', 0, function(err, u){
                    Done( 'timeout' );
            });
        }else{
            oURL.state = 'timeout';
        }
    }else if( Done ){
        Done( 'still-not-ready' );
    }
}

function page_scrape( sURL, canonicalURL, HTML, oLink, oURL,  Done){
    box.invoke( 'pageScrape', canonicalURL || sURL, HTML, function(err, page_Parts ){
        saveError(err, null, oURL );
        var page2save = page_Parts.xhtml;
        page2save.html = HTML;
        delete page_Parts.xhtml;

        page_Parts.display = linkDisplay.update( page_Parts );
        page_Parts.state = "ready";

        if(  oURL ){
            box.invoke('url.update-display-queued_and_new-links', oURL._id, page_Parts, function(err, oUpdated_URL, number_of_updated_links){
                box.invoke( 'page.save', page2save, sURL, canonicalURL, oURL._id );
                Done();
            });
        }else{
            box.invoke('url.add', canonicalURL || sURL, oLink._id, page_Parts, function(err, oAddedURL){
                // E11000 duplicate key error index: LinksTo.urls.$url_1  dup key
                if( err &&  err.code === 11000){
                    box.emit('url.check-url', canonicalURL || sURL, 0, function(err2, found_same_url_oURL ){
                        if(err2){
                            var dummy = 1;
                        }
                        box.invoke('url.add-link-id', found_same_url_oURL._id,  oLink._id, Done);
                    });
                }else{
                    box.invoke( 'page.save', page2save, sURL, canonicalURL, oAddedURL._id );
                    Done();
                }
            });
        }
    });
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
     *  Asses the situation first and then choose the action
     *   action could be:
     *      error
     *      link-ready
     *      url-ready
     *      html-ready
     *
     */

    processor : function (job, Done){
        var sURL = job.data.url
            , request_options = _.merge( {}, box.config.request.default_request_settings, {uri:sURL, jar:request.jar()  })
            , hard_refresh
            , action = 'none'
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
                URL2 : function(cb){
                        if( !job.data.url_id ){
                            box.invoke('url.check-url', sURL, job.data.url_id,  cb );
                        }
                },
                Page: function(cb){
                        box.invoke('page.find', sURL, null, cb );
                }
            },
            function(err, o){
                // TODO: deal with the error. What about emit the error with the job id and analise it later

                hard_refresh = o.Link.state == 'hard-refresh';
                var state = '', prepare = '', URL = o.URL || o.URL2, ready = false;

                if( o.Link.state == 'ready' ){  // multiple links waiting for the same URL. The URL has been updated by other job
                    Done();
                }else if(o.URL && o.URL.state != 'timeout'){
                    if( o.URL.state == 'ready' ){ //  && (o.Link.state == 'queued' || o.Link.state == 'fetching' )
                        box.invoke('link.set-state', job.data.link_id, 'queued');
                        box.invoke('url.update-links', o.URL._id, false, Done);
                        return;
                    }else{
                        check_if_url_has_timedout_and_fail_the_job( o.URL );
                    }    
                }
                if( !o.URL && o.URL2 ){
                        if(o.URL2.length ){
                            throw {msg:'Only one URL2 expected', oURL: o.URL2};
                        }
                        if( o.URL2.state == 'ready'  ){ // && (o.Link.state == 'queued' || o.Link.state == 'fetching' )
                            box.invoke('url.add-link-id', o.URL2._id,  o.Link._id, true, Done );
                        }else {
                            box.invoke('url.add-link-id', o.URL2._id,  o.Link._id, false, function(err, ok){                            
                                check_if_url_has_timedout_and_fail_the_job( o.URL2, Done);
                            });
                        }
                }else if(!o.URL && !o.URL2 && o.Page){
                    sURL = o.Page.url;

                    box.invoke('url.add', sURL, o.Link._id, {state:'pageScrape', page_id:o.Page._id }, function(err, oAddedURL){
                        box.invoke( 'pageScrape', sURL, o.Page.html, function(err, page_Parts ){
                            saveError(err, null, oAddedURL );
                            delete page_Parts.xhtml;
                            page_Parts.display = linkDisplay.update( page_Parts );
                            box.invoke('url.update-display-queued_and_new-links', o.URL._id, page_Parts, Done);
                        });
                    });
                }else{
                    if( job.data.do_not_fetch ){
                        box.invoke('link.set-state', job.data.link_id, 'postponed', Done);
                    }else{
                        box.invoke('link.set-state', job.data.link_id, 'fetching');
                        request(request_options, function (err, response, page_HTML) {
                            var update = {state:'ready'};
                            if( err && err.code === 'ENOTFOUND' ||
                                err && err.message.match(/invalid/i) ||
                                response && response.statusCode != 200 ){
                                update.notFound = true;
                                update.err = {statusCode:404};
                                if( err && err.message ){
                                    update.error = err;
                                }
                            }
                            if( update.notFound ){
                                update.display = make_link_display( null, {url:sURL } );
                                if(o.URL ){
                                    box.invoke('url.update-display-queued_and_new-links', o.URL._id, update, Done );
                                }else{
                                    box.invoke('url.add', sURL, o.Link._id, update, function(err2, oAddedURL){
                                        if( err2 ){
                                            // E11000 duplicate key error index: LinksTo.urls.$url_1  dup key
                                            if( err2.code === 11000){
                                                box.invoke('url.check-url', sURL, 0, function(err, foundURL ){
                                                    box.invoke('url.add-link-id', foundURL._id,  o.Link._id, true, Done );
                                                });
                                            }else{
                                                throw err2;  // TODO: if this is a duplicate URL then use the existing URL
                                            }
                                        }else{
                                            Done();
                                        }
                                    });
                                }
                            }else{
                                var canonicalURL = linkDisplay.find_canonical_url('' + page_HTML);
                                box.emit('url.check-url', canonicalURL, o.URL ? o.URL._id:0, function(err, found_same_url_oURL ){
                                    // TODO clear the case when found_same_url_oURL is not ready
                                    if( found_same_url_oURL ){
                                        box.invoke('url.add-link-id', found_same_url_oURL._id, o.Link._id, found_same_url_oURL.state == 'ready', Done);
                                    }else {
                                        if(o.URL ){
                                            box.invoke('url.update-fast', o.URL._id, {state:'pageScrape'} );
                                        }
                                        page_scrape( sURL, canonicalURL, page_HTML, o.Link, o.URL, Done);
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
