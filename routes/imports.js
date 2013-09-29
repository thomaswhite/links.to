/*jshint bitwise:true, curly:true, forin:true, immed:true, noarg:true, noempty:true, nonew:true, trailing:true, lastsemic:true, laxbreak:true, laxcomma:true, browser:true, jquery:true, node:true, onevar:true, maxerr:100 */

/*
 * GET home page.
 */

var box = require('../lib/box.js')
    , _ = require('lodash')
    ,  util = require('util')
    , async = require('async')
    , moment = require('moment')
    , debug = require('debug')('linksTo:import')
    , ShortId  = require('shortid').seed(96715)

    , kue // = require('kue')
    , jobs //= kue.createQueue()

    , breadcrumbs = require('./breadcrumbs.js')
    , favorites = require('../lib/parse-favorites')
    , ping_url = require('../lib/ping-url')

    , config
    , app

 ;



function newImport ( name, size, owner ){
    return {
        owner: owner,
        title: name,
        size: size,
        created : new Date(),
        links:0,
        folders:0
    };
}

function import_defaultParam(filter, param){
    return {
        filter : _.merge( {}, filter),
        param  : _.merge(  {page:1, limit:40, sort:{updated:-1, created:-1} }, param)
    };
}

function importLists_data( filter, param, user, callBack ){
    var Parameters =  import_defaultParam(filter, param);
    box.parallel('imports.list', Parameters.filter, Parameters.param.limit, Parameters.param.sort, function( err, result ){
        callBack( err, {
            button_action:{route:'/import/new'},
            title: 'Imports',
            grid: box.utils.pickUpFromAsyncResult( result, 'imports-list' ),
            user: user,
            canEdit:true,
            crumbs : breadcrumbs.make({ imports:true }),
            addButton:{
                type:'file',
                placeholder:'Select a bookmark file',
                buttonText:'Import',
                action:'/imports/new',
                form_id:'upload'
            }
        });
    });
}

function importLists( req, res, next, filter, param ){
    var helpers = box.kleiDust.getDust().helpers
        , Parameters =  import_defaultParam(filter, param)
        , user  =  req.session && req.session.passport && req.session.passport.user ? JSON.parse(req.session.passport.user):''
        , base = box.dust.makeBase({
                user:user,
                pageParam:{
                    filter: Parameters.filter,
                    param: Parameters.param,
                    route:'imports:list'
                }
          })
        ;

    importLists_data( Parameters.filter, Parameters.param, user, function(err, displayBlock ){
        console.log('importsLists: ---------------------');
        console.log( displayBlock );
        box.dust.render(res, 'imports/page_imports-list', base.push(displayBlock));
    });
}

function All (req, res, next ){
    var session = req.session,
        user  = session && session.passport && session.passport.user ? JSON.parse(session.passport.user):null;
    //            , isOwner =  user._id ==  collection.owner ? true : ''
    if( user && user._id ){
        importLists(  req, res, next, {owner:  user._id });
    }else{
        res.redirect( '/coll'  );  // not logged in
    }
}


function responseJSON(res, obj){
    res.writeHead(200, {"Content-Type": "application/json"});
    res.write( JSON.stringify( obj ) );
    res.end();
}

function Add(req, res) {
    var user = req.user;
    if( !user ){
        res.redirect( '/coll' );
    }
    //req.io.route('imports:add');

    if( req.files.uploaded_file.headers['content-type'] != "text/html" ){
//        req.files.uploaded_file.mime != "text/html"
        responseJSON( res,{
            success:false,
            upload:'error',
            error:'File is not HTML file. It is type:"' + req.files.uploaded_file.type + '"',
            file: req.files.uploaded_file.name,
            size: req.files.uploaded_file.size
        });
    }else{
        favorites.parse( req.files.uploaded_file.path, false, function(err, root, allNodes ){
            if( err ){
                responseJSON( res,{
                    success:false,
                    upload:'error',
                    error: err,
                    file: req.files.uploaded_file.name
                });
            }else{

                console.log("\nRoot:\n" + util.inspect( root, false, 7, true ));
                console.log("\nallNodes:\n" + util.inspect( allNodes, false, 7, true ));

                var Import = newImport (  req.files.uploaded_file.name, req.files.uploaded_file.size, user._id );
                Import = favorites.countFoldersAndLinks( root, Import );

                box.emit('import.add', Import, function(err, saved_import ) {
                    if (err) {
                        responseJSON( res,{
                            success:false,
                            file: req.files.uploaded_file.name,
                            msg:'Error when adding an import',
                            error:err
                        });
                    }else {
                        responseJSON( res,{
                            success:true,
                            upload:'ok',
                            id:saved_import._id,
                            import: saved_import,
                            root:root,
                            go_to:'/imports/' + saved_import._id
                        });

                        var ID = saved_import._id;
                        for(var n=0; n < allNodes.length; n++){
                            allNodes[n].importID = ID;
                        }

                        box.invoke('add-nodes',  allNodes, function(err, result){
                            if( err ){
                                console.error('Error saving import nodes for file ' + saved_import.title, err );
                            }else{
                                console.info('Import nodes for file "' +  + saved_import.title + '" saved OK', saved_import );
                            }
                        });
                    }
                });
            }
        });
    }

}

function Delete (req, res) {
    var referer = req.headers.referer
        , id = req.params.id
        ;
    box.parallel('import.delete', id, function(err, aResult){
        res.redirect( req.query.back );
    });
    // todo: get the id of current collection to return back after deletion
}

function Get_One_data (id, callBack) {
    box.emit( 'import.get-with-root-level-folders', id, function( err, Import ){
        callBack(err, {
            title: (Import && Import.title ? Import.title: 'Import not found' ),
            import: Import,
            crumbs : breadcrumbs.make({
                  import:{id:Import._id, title:Import.title }
            })
        });
    });
}

function Get_One (req, res) {
    var id = req.params.id,
        User = req.session && req.session.passport && req.session.passport.user ?  JSON.parse( req.session.passport.user ):null;

    if( !User ){
        res.redirect( '/coll' );
    }else{
        Get_One_data( id, function(err, displayBlock ){
            if ( err ){
                console.error(  'import.get.one', err);
            }
            if( err || !displayBlock.import ){
                 res.redirect( '/imports' );
            }else{
                  var user  =  req.session && req.session.passport && req.session.passport.user ? JSON.parse(req.session.passport.user):''
                    , base = box.dust.makeBase({
                        user:user,
                        pageParam:{
                            route:'import:get',
                            id : id
                        }
                    })
                ;
                console.log(  util.inspect( displayBlock, false, 7, true ) );
                box.dust.render(res, 'imports/page_import', base.push(displayBlock));
            }
        });
    }
}



// link:link, user:oData.user, collectionID: collection._id

/*
IMPORTERD link
  {
        "parent":"/",
    "title":"Get Bookmark Add-ons",
    "description"
    "href":"https://addons.mozilla.org/en-US/firefox/bookmarks/",
    "add_date":
    "last_modified":

    "icon_uri":"http://www.mozilla.org/2005/made-up-favicon/0-1357573349534",
    "icon":
        "importID":
  }
 Saved Link
  {
        "collection":"51f7d3086cda2f4413000001",
        "owner_screen_name":"Dummy User",
        "owner":1,
        "updated":
        "display":{
            "title":"The Hathors &#8211; Lion&#8217;s Gate Portal August 8th &amp; 25th &#8211; THEME MAGIC &#8211; EXPANSION OF&nbsp;CONSCIOUSNESS | Sacred Ascension - Key of Life -                                          Secrets of the Universe on WordPress.com",
            "description":"We are the Hathors, and we come to bring you a message. A message that a new MAGICAL wave of light is about to sweep your planet and YOU are NEEDED yet again. For the theme of the portal that is about to sweep your planet is MAGIC. On August 8th of your earthly time,&hellip;",
            "imagePos":"",
            "thumbnail":"http://i2.wp.com/sacredascensionmerkaba.files.wordpress.com/2013/08/thehathorslionsgate.jpg?fit=1000%2C1000",
            "canonicalURL":true,
            "url":"http://sacredascensionmerkaba.wordpress.com/2013/08/07/lions-gate-portal-august-8th-25th-theme-magic-expansion-of-conscience/",
            "tags":[ {  "word":"light",   "count":21  }]
        },
        "url_id":
        "_id":
    }

// processed saved page

*/



function job_process_import_link (job, Done){
    var   user = job.data.user
        , link = job.data.link
        , link2save = box.envoke('link.new',
            link.href,
            job.data.collectionID,
            {
                title: link.title,
                description: link.description,
                owner_id: user._id,
                owner_screen_name: user.screen_name,
                created: link.add_date,
                updated: link.last_modified
            }
        )
    ;

    box.invoke( 'link.add2', link2save, function(err, savedLink){
        if(err){
            debug( err );
        }
        box.invoke( 'url.add-link', link.href, savedLink, function(err, oURL, existing_URL  ){
            if(err){
              debug( err );
            }


            if( !existing_URL || !existing_URL.ready  ){
                //   job to ping URL
                //   job to fetch and process page then update .display
                //   job to update oURL
                //   job to create tags

                Done(null);
            }else{
                // generate .display for the link from the oURL

                Done(null);
            }
        });
    });
}


function job_process_import_folder(job, Done){
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
                        jobs.create('import-link', {link:link, user:oData.user, collectionID: collection._id })
                            .on('complete', function(){
                                aLinks.push( {
                                    link_id: this.data.link._id
                                });

                                // add additional jobs:
                                //    1. fetch page
                                //    2. make page tags

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
                            .save( done )
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


function perform_import( Import_id, user, req ){
    var aReady = [],
        aFolders,
        oImport;

    function import_folder( oFolder, done ){
        if( oFolder.folder.this_links ){
            req.io.emit('import.collection-start', { status:'start', folder:oFolder } );
            jobs.create('import-folder', {folder:oFolder, user:user })
                .on('complete', function(){
                    req.io.emit('import.collection-end', { status:'end', folder:oFolder }  );
                    aReady.push(this.data.folder._id );
                    if( aFolders.length == aReady.length ){
                        req.io.emit('import.process-end', { status:'end', import:oImport }  );
                        aFolders = aReady = oImport = null;
                    }
                })
                .on('failed', function(){
                    req.io.emit('import.collection-error', { status:'error', folder:oFolder }  );
                })
                .on('progress', function(progress){
                    req.io.emit('import.collection-process', { status:'progress', progress: progress, folder:oFolder} );
                })
                .priority('high')
                .save( function( err, result ){
                    process.nextTick(done);
                    // go back to the async queue even if the folder is not processed.
                });
        }else{
            process.nextTick( done );
        }
    }
    box.emit('import.get', Import_id, function(err, Import){
        oImport = Import;
        req.io.emit('import.process-start', Import );

        box.emit('import.folders', Import_id, function(err, folders){
            aFolders = folders;
            async.mapLimit( folders, 10,
                import_folder,
                function(err, result){
                    if( err ){
                        console( err );
                    }
                    req.io.emit('import.process-queued', { status:'queued', import:Import, err:err }  );
                }
            );
        });
    });
}


box.on('init', function (App, Config, done) {
    app = App;
    config = Config;
    kue = box.Queue;
    jobs = box.Jobs;

    process.nextTick(function() {
        done(null, 'route imports.js initialised');
    });

});

box.on('init.attach', function (app, config,  done) {

    jobs.process('import-link', job_process_import_link);
    jobs.process('import-folder', job_process_import_folder);

    app.use(
        box.middler()
            .get('/imports',            All)
            .post('/imports/new',       Add)
            .get('/imports/:id',        Get_One)
            .get('/imports/:id/delete', Delete)
            .handler
    );

    app.io.route('imports', {
       get:  function(req) {
           Get_One_data( req.data.coll_id, function(err, displayBlock ){
               req.io.respond({
                   result:displayBlock,
                   error:err
               });
           });

       },
       list: function(req){
           var User = req.session && req.session.passport && req.session.passport.user ?  JSON.parse( req.session.passport.user ):null
               , Parameters =  import_defaultParam(req.data.filter, req.data.param)
               ;
           importLists_data( Parameters.filter, Parameters.param, User, function(err, displayBlock){
               req.io.respond({
                   req:req.data,
                   result: displayBlock,
                   error:err
               });
           });
       },
       'folder_content': function(req){
           box.emit( 'import.folder_content', req.data.id, function( err, Import ){
               req.io.respond({
                   req:req.data,
                   result: Import,
                   error:err
               });
           });
       },
       'folder_exclude': function(req){
            box.emit( 'import.folder_exclude', req.data.id, req.data.excluded, function( err, Import ){
                req.io.respond({
                    req:req.data,
                    result: Import,
                    error:err
                });
            });
        },

       remove:function(req){
           box.parallel('collection.delete', req.data.id, function(err, result){
               req.io.respond({
                   result:err ? 'error':'ok',
                   error:err
               });
               req.io.emit('collection.deleted', {param:req.data, result:result} );
           });
       },

       process:function(req){
           var User = req.session && req.session.passport && req.session.passport.user ?  JSON.parse( req.session.passport.user ):null
           ;
           if( !User || !User._id ){
               req.io.respond({
                   error:'session-timeout',
                   go_to:'/coll'
               });
           }else{
               perform_import( req.data.id, User, req );
           }
       }
    });

   // kue.app.listen(3001);
    process.nextTick(function() {
        done(null, 'route "imports.js" attached'  );
    });

});
