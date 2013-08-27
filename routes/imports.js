/*jshint bitwise:true, curly:true, forin:true, immed:true, noarg:true, noempty:true, nonew:true, trailing:true, lastsemic:true, laxbreak:true, laxcomma:true, browser:true, jquery:true, node:true, onevar:true, maxerr:100 */

/*
 * GET home page.
 */

var box = require('../box.js')
    , _ = require('lodash')
    ,  util = require('util')
    , debug = require('debug')('linksTo:view.import')
    , breadcrumbs = require('./breadcrumbs.js')
    , ShortId  = require('shortid').seed(96715)
    , moment = require('moment')
    , favorites = require('../lib/parse-favorites')
    , config
    , app

 ;





function newImport  (user, name, json_data){
    var now_ms = box.moment(),
        now = box.moment(now_ms, "YYYY-MM-DD HH:mm")
        ;
    return {
        type:'import',
        owner: user._id,
        title: 'Import made on ' + now,
        linksCount:0,
        foldersCount:0,
        created : now_ms,
        updated:  now_ms,
        data: json_data
    };
}

function import_defaultParam(filter, param){
    return {
        filter : _.merge( {}, filter),
        param  :  _.merge(  {page:1, limit:40, sort:{updated:-1, created:-1} }, param)
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

function Add(req, res) {
    var User = req.session && req.session.passport && req.session.passport.user ?  JSON.parse( req.session.passport.user ):null;

    req.io.route('imports:add');
}

function Delete (req, res) {
    var referer = req.headers.referer
        , coll_id = req.params.id
        ;
    box.parallel('collection.delete', coll_id, function(err, aResult){
        res.redirect( req.query.back );
    });
    // todo: get the id of current collection to return back after deletion
}


function Get_One_data (collID, callBack) {
    box.emit( 'collection.get.one', collID, function( err, collection ){
//        var isOwner = collection.owner == user._id ? true : '';
        callBack(err, {
            button_action:{route:'/link/new', coll_id: collID },
            title: (collection && collection.title ? collection.title: 'Collection not found' ),
//            canEdit: isOwner,
//            canDelete: isOwner,
            collection: collection,
            crumbs : breadcrumbs.make({
//                owner:isOwner,
                coll:{id:collection._id, title:collection.title }
            }),
            addButton:{
                placeholder:'Paste links',
                type:'input',
                buttonText:'Add Link',
                hidden:[
                    {name:"add2coll", value : collID }
                ]
            }
        });
    });
}

function Get_One (req, res) {
    var referer = req.headers.referer,
        collID = req.params.id;

    box.emit( 'collection.get.one', collID, function( err, collection ){
        if ( err ){
            console.error(  'collection.get.one', err);
        }
        if( err || !collection ){
            res.redirect( '/coll' );
        }else{
            var user  =  req.session && req.session.passport && req.session.passport.user ? JSON.parse(req.session.passport.user):''
    //            , isOwner =  user._id ==  collection.owner ? true : ''
                , base = box.dust.makeBase({
                    user:user,
                    pageParam:{
                        route:'collection:get',
                        coll_id : collection._id
                    }
                })
                ;
            Get_One_data( collID, function(err, displayBlock ){
                console.log( displayBlock );

//        var isOwner = collection.owner == user._id ? true : '';
//            canEdit: isOwner,
//            canDelete: isOwner,

                box.dust.render(res, 'collections/page_collection', base.push(displayBlock));
            });
        }
    });
}


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
       add:function(req){
           var user = JSON.parse(req.session.passport.user)
//               , name = req.data.value.trim()
//               , coll = newCollection( user, name )
               ;
           // TODO: verify the name
           req.io.respond({
               success:true,
               upload:'OK',
               file: req.files.uploaded_file.name,
               size: req.files.uploaded_file.size
           });
           favorites.parse( req.files.uploaded_file.path, false, function(err, result, flatOutput ){
               console.log("\nresult:\n" + util.inspect( result, false, 7, true ));
               console.log("\nflatOutput:\n" + util.inspect( flatOutput, false, 7, true ));

           });



           return;

           box.emit('collection.add', coll, function(err, collection ) {
               if (err) {
                   req.io.respond({
                       result:'error',
                       value: name,
                       msg:'Error when creating collection'
                   });
               }else {
                   req.io.emit('collection.added', {param:req.data, collection:collection} );
                   box.parallel('collection.added',  collection, function(err, result){
                       req.io.respond({
                           result:'ok',
                           collection: collection,
                           extra: result
                       });
                   });
               }
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
       }
    });


    done(null, 'route "imports.js" attached'  );
});
