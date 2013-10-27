/**
 * User: Thomas White
 * Date: 09/10/13
 * Time: 21:56
 */

var   box = require('../lib/box')
    , debug = require('debug')('jobs:import-folder')
    , async = require('async')
    ;

module.exports = {
    id : 'import-folder',
    processor : function (job, Done){
        box.invoke('improt.links-in-folder', job.data.folder.importID, job.data.folder.folder.full_path, function(err, Links) {
            if( err ){
                done(err);
            }else{
                //job.progress(0, Links.length );
                var oData = job.data
                    , collection = oData.coll
                    , req = job.req
                    , aLinksQueued = []
                    , aLinks = []
                    , Error = null
                    , progressTotal = Links.length * 2
                    ;

                function import_link(link, done){
                    //req.io.emit('import.link-start', { status:'start', link:link }  );
                    aLinksQueued.push(1);
                    job.progress(aLinksQueued.length, progressTotal );
                    box.Jobs.create('import-link', { import_id: oData.import_id, link:link, user:oData.user, collectionID: collection._id, do_not_fetch:oData.do_not_fetch })
                        .on('complete', function(){
                            aLinks.push( {  link_id: this.data.link._id });
                            var link = this.data.link;
                            job.collection_id = collection._id;
                            job.progress(aLinksQueued.length + aLinks.length, progressTotal);
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
                            box.utils.later( done, err);
                        })
                    ;
                }
                async.mapLimit(Links, 50, import_link,
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