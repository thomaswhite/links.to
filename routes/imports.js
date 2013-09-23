/*jshint bitwise:true, curly:true, forin:true, immed:true, noarg:true, noempty:true, nonew:true, trailing:true, lastsemic:true, laxbreak:true, laxcomma:true, browser:true, jquery:true, node:true, onevar:true, maxerr:100 */

/*
 * GET home page.
 */

var box = require('../modules/box.js')
    , _ = require('lodash')
    ,  util = require('util')
    , debug = require('debug')('linksTo:view.import')
    , breadcrumbs = require('./breadcrumbs.js')
    , ShortId  = require('shortid').seed(96715)
    , moment = require('moment')
    , favorites = require('../modules/parse-favorites')

    , kue = require('kue')
    , jobs = kue.createQueue()
    , async = require('async')
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

    if( req.files.uploaded_file.type != "text/html" ||
        req.files.uploaded_file.mime != "text/html" ){
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

                        box.parallel('import.added',  allNodes, function(err, result){
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
    box.emit( 'import.get.one', id, function( err, Import ){
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


jobs.active(function(err,aJobs){
    var dummy = 1;
});
jobs.inactive(removeJobs);
jobs.complete( removeJobs );
jobs.failed( removeJobs );


jobs.process('import-folder', function(job, done){
    var links = []; //job.data.links;

    box.emit('add_collection', job.data.user, job.data.folder.title, job.data.folder.description, function(err, collection ) {
        if( err ){
            done(err);
        }else{
            // add tags ( full_path )
            // Fetch the list of children in this folder as array: links and folders
            // create new folder task for folders
            // add task for link
        done( null, collection);
        return;

            async.map(job.links, function(link, cb){
                    // save existing link data
                    // check if page exists then use the page
                    // else task for link
                    //  how to get the page data

                    // links.push(link.url)
                    //job.progress(links.url, job.links.length );
                    var result;
                    cb( null, result );
                },
                function(err, results){
                    // job.progress(links.url, job.links.length );

                    done(null, result);
                }
            );
        }
    });
});


function import_folder( oFolder, User, done ){
    var Job = jobs.create('import-folder', {folder:oFolder, user: User })
        .on('complete', function(job){
            job.log("Folder '" + oFolder.folder.full_path + "' imported");
            req.io.emit('import.collection.added', oFolder );
            cb( null, oFolder );
        })
        .on('failed', function(){
            job.log(" Job failed");
            cb( 'error', oFolder );
        })
        .on('progress', function(progress){
            process.stdout.write('\r  job #' + job.id + ' ' + progress + '% complete');
            req.io.emit('import.collection.process', oFolder );
        })
        .priority('high')
        .save( function( err, result ){
            done(err, oFolder);
        });
}


function removeJobs( err, aJobs){
    if( err ){
        console( err );
    }else if( aJobs ){
        aJobs.forEach(function(id){
            kue.Job.remove(id, function(err,r){
                var dummy = 1;
            });
        });
    }
}

jobs.on('job complete', function(id){
    Job.get(id, function(err, job){
        if (err) return;
        job.remove(function(err){
            if (err) throw err;
            console.log('removed completed job #%d', job.id, job );
        });
    });
});






box.on('init', function (App, Config, done) {
    app = App;
    config = Config;
    done(null, 'route imports.js initialised');
});

box.on('init.attach', function (app, config,  done) {
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
               box.emit('folders-in.list', '/', function(err, folders){
                   async.map( folders,
                       function(folder, cb ){
                           import_folder(folder, User, cb);
                       },
                       function(err, result){
                           if( err ){
                               console( err );
                               req.io.respond({
                                   result: result,
                                   success: false,
                                   error: err
                               });

                           }else{
                               req.io.respond({
                                   result: result,
                                   success: true
                               });
                           }
                       }
                   );
               });
           }
       }
    });

    kue.app.listen(3001);
    done(null, 'route "imports.js" attached'  );
});
