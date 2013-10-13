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
    , linkDisplay = require('../lib/link-make-display')

;

function make_link_display( oURL, oLink){
    //var tags = linkDisplay.tags();
    if( oURL ){
        return linkDisplay.update( oURL /*, tags*/);
    }else{
        oLink.display.title = oLink.display.url;
        oLink.display.notFound = true;
        return oLink.display;
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

    /**
     * @param job
     * @param Done
     *
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
     */

    processor : function (job, Done){
        var URL = job.data.url, request_options = _.merge( {}, config.request, {uri:URL, jar:request.jar()  });
        async.series({
                Link: async.apply( box.invoke, job,data.link_id ),
                Url:  async.apply( box.invoke, job,data.url_id )
            },
            function(err, o){
                if( err ){
                    Done( err );
                }else if(o.Link.state == 'ready' ){ // queued and the URL become ready before this job was called
                    Done( null );
                }else if(o.Link.state == 'queued'){
                    if(o.Url.state == 'ready'){ // 1.1
                        update_link_display(o.Link, o.Url, Done );
                    }else {
                        // 1.2 this event will be fired when the URL is ready. It will update the .display section of all links that are in state "queued"
                        box.once( '' + o.Url._id, Done );
                    }
                }else{ // 2 o.Link.state == 'new'
                    if(o.Url.state == 'ready'){
                        update_link_display(o.Link, o.Url, Done );
                    }else {
                       // 2.2 fetching
                        request(request_options, function (err, response, page_HTML) {
                            if( err || response.statusCode != 200 ){
                                var notFound = {
                                    statusCode: response ? response.statusCode : -1 ,
                                    result: 'error',
                                    state: 'url-ping'
                                };
                                box.emit('url.delete', oURL._id );
                                box.emit('link.update-display', savedLink._id, make_link_display( null, savedLink), function(err2, updated_Link){
                                    Done(  err2 || notFound, updated_Link);
                                });
                            } else{
                                var canonicalURL = linkDisplay.find_canonical_url('' + page_HTML);
                                box.emit('url.check-url', canonicalURL, function(err, found_same_url_oURL ){
                                    if( found_same_url_oURL ){
                                        box.on('url.add-link-ids', found_same_url_oURL._id, [o.Link._id].concat(o.Url.links ), false, function(err, how_many_were_updated ){
                                                box.emit('url.delete', o.Url._id );
                                                Done(err );
                                        });
                                    }else{
                                        var URL = canonicalURL || url;
                                        box.emit( 'page.save', page_HTML, URL, o.Url._id, function(err, added_page ){
                                            if( err ){
                                                Done(err, 'page.save');
                                            }else{
                                                box.invoke( 'pageScrape', URL, HTML, function(err, page_Parts ){
                                                    box.invoke('url.update-display-and-queued-links', o.Url._id, linkDisplay.update( page_Parts ), function(err, o){
                                                        box.emit( '' + o.Url._id);
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
                }
            }
        );
    }
};
