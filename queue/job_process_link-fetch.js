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

function find_canonical_url(html){
    var regEx = [
            /<link\s+rel=(?:"canonical"|'canonical')\s+href\s*=\s*(\"[^"]*\"|'[^']*')\s*(?:\/>|><\/link>)/gi,
            /<meta[^>]*property\s*=\s*"og:url".*content\s*=\s*"([^"]*)/gi,
            /<meta[^>]*name\s*=\s*"twitter:url".*content\s*=\s*"([^"]*)/gi
        ]
        , match
        , result = null
        ;

    for( var i = 0; i < regEx.length; i++ ){
        match = regEx[i].exec( html );
        if( match ){
            result = match[1];
            break;
        }
    }
    return result;
}


module.exports = {
    id : job_id ,
    processor : function (job, Done){
        var oLink = job.data.link
            , URL = job.data.url || oLink.display.url
        ;


        /**
         * 2. request
         *      if canonical
         *          then exists use it
         *          else save page, create oURL, scrap page, update .display
         *
         *
         */


        var request_options = _.merge( {}, config.request, {uri:URL, jar:request.jar()  });
        request(request_options, function (err, response, page_HTML) {
            if( !err && response.statusCode == 200 ){
                var canonicalURL = find_canonical_url('' + page_HTML);
                box.emit('url.find-url', canonicalURL, function(err, found_same_url_oURL ){
                    if( found_same_url_oURL ){
                        box.emit('link.update-display', oLink._id, make_link_display( found_same_url_oURL, oLink), Done );
                    }else{


                        box.emit( 'page.save', page_HTML, url, oURL._id, function(err, added_page ){
                            if( err ){
                                Done(err, 'page.save');
                            }else{
                                scrape_page_as_job( oURL.url, savedLink._id, oURL._id, added_page._id, page_HTML, function(err, xxx){
                                    box.invoke('url.add-link-id', oURL._id, savedLink._id, true, function(err2, updated_oURL){
                                        box.emit('link.update-display', savedLink._id, make_link_display( updated_oURL, savedLink), Done );
                                    });
                                });
                            }
                        });
                    }
                });
            }else{
                var notFound = {
                    statusCode: response ? response.statusCode : -1 ,
                    result: 'error',
                    state: 'url-ping'
                };
                box.emit('url.delete', oURL._id );
                box.emit('link.update-display', savedLink._id, make_link_display( null, savedLink), function(err2, updated_Link){
                    Done(  err2 || notFound, updated_Link);
                });
            }
        });
    }
};
