/**
 * Created with JetBrains WebStorm.
 * User: Thomas White
 * Date: 09/10/13
 * Time: 21:48

 */

var   box = require('../lib/box')
    , debug = require('debug')('jobs:scrap-page')
    , async = require('async')
;



module.exports = {
    id : 'scrap-page',
    processor : function (job, Done){

        function __scrape_page ( url, url_id, HTML, Done ){
            box.invoke( 'pageScrape', url, HTML, function(err, page_Parts ){
                page_Parts.state = 'ready';
                page_Parts.updated = new Date();
                box.invoke('url.update', url_id, page_Parts, function(err, o){
                    job.data.page_parts = page_Parts; // not working
                    Done( err );
                });
            });
        }

        if( job.data.HTML ){
            __scrape_page ( job.data.url, job.data.url_id, job.data.HTML, Done );
        }else{
            box.invoke('page.get',job.data.page_id, function(err, Page){
                if( err || !Page ){
                    Done(err, 'page.get');
                }else{
                    __scrape_page ( job.data.url, job.data.url_id, Page.html, Done );
                }
            });
        }

    }
};
