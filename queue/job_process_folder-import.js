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
                job.progress(0, Links.length );
                var oData = job.data
                    , req = job.req
                    , aLinks = []
                    , Error = null
                    ;

                // Add a collection for this folder, event captured in collections.js
                box.emit('add_collection', job.data.user, job.data.folder.title, job.data.folder.description || '', function(err, collection ) {
                    if( err ){
                        done(err);
                    }else{
                        function import_link(link, done){
                            //req.io.emit('import.link-start', { status:'start', link:link }  );
                            box.Jobs.create('import-link', {link:link, user:oData.user, collectionID: collection._id })
                                .on('complete', function(){
                                    aLinks.push( {  link_id: this.data.link._id });
                                    var link = this.data.link;
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
                        async.mapLimit(Links, 5, import_link,
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
        });
    }

};