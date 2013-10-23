/**
 * User: Thomas White
 * Date: 09/10/13
 * Time: 21:56
 */

var job_id = 'collection-fetch'
    , box = require('../lib/box')
    , debug = require('debug')('jobs:import-folder')
    , async = require('async')
    ;

module.exports = {
    id : job_id,

    /**
     * This job will fetch a set of links.
     * Effectively only links that are not in state='ready' will be fetch
     * @param job
     *    expected:{
     *        coll_id,
     *        aLinks
     *    }
     * @param Done
     */
    processor : function (job, Done){
        box.invoke('improt.links-in-folder', job.data.folder.importID, job.data.folder.folder.full_path, function(err, Links) {
            if( err ){
                done(err);
            }else{
                //job.progress(0, Links.length );
                var oData = job.data
                    , collection = oData.coll
                    , req = job.req
                    , aLinks = []
                    , Error = null
                    ;

                function import_link(link, done){
                    //req.io.emit('import.link-start', { status:'start', link:link }  );
                    box.Jobs.create('import-link', { import_id: job.data.import_id, link:link, user:oData.user, collectionID: collection._id })
                        .on('complete', function(){
                            aLinks.push( {  link_id: this.data.link._id });
                            var link = this.data.link;
                            job.collection_id = collection._id;
                            job.progress(aLinks.length, Links.length);
                            if( aLinks.length == Links.length ){
                                Done( Error, {
                                    collectionID : this.data.collectionID,
                                    folderID : job.data.folder._id,
                                    links: aLinks
                                });
                            }
                        })
                        .on('failed', function(a){
                            aLinks.push( this.data.link._id );
                        })
                        .priority('medium')
                        //.save( done )
                        .save( function( err, result ){
                            process.nextTick(function(){
                                done(err);
                            });
                        });

                    ;
                }
                async.mapLimit(Links, 10, import_link,
                    function(err, links_results){
                        // links_results contain list of folder/links
                        if( err ){
                            console.warn( err );
                            Error = err;
                        }
                        // Done( err, collection);
                    }
                );
            }
        });
    }

};