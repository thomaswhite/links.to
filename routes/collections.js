/*jshint bitwise:true, curly:true, forin:true, immed:true, noarg:true, noempty:true, nonew:true, trailing:true, lastsemic:true, laxbreak:true, laxcomma:true, browser:true, jquery:true, node:true, onevar:true, maxerr:100 */

/*
 * GET home page.
 */

var box = require('../lib/box')
    , _ = require('lodash')
    ,  util = require('util')
    , async = require('async')
    , debug = require('debug')('linksTo:view.collections')
    , breadcrumbs = require('./../lib/breadcrumbs.js')
    , ShortId  = require('shortid').seed(96715)
    , moment = require('moment')
    , config
    , app

 ;


/**
 * @return {string}
 */
function ShorterID(){
    return  ShortId.generate().substr(0, config.db.short_id_length);
}

/**
 *
 * @param owner
 * @param name
 * @param description
 * @returns {{type: string, shortID: *, owner: *, title: *, description: (*|string), linksCount: number, links: Array}}
 */
function newCollection  (user, name, description){
    return {
        type:'collection',
        shortID : ShorterID(),
        owner: user._id,
        author_screen_name: user.screen_name,
        title: name.trim(),
        description: description || '',
        linksCount:0,
        created : new Date(),
        updated:  new Date(),
        links:[]
    };
}

function collectionList_defaultParam(filter, param){
    return {
        filter : _.merge( {}, filter),
        param  :  _.merge(  {page:1, limit:40, sort:{updated:-1, created:-1} }, param)
    };
}

function collectionList_data( filter, param, user, callBack ){
    var Parameters =  collectionList_defaultParam(filter, param);
    box.parallel('collections.list', Parameters.filter, Parameters.param.limit, Parameters.param.sort, function( err, result ){
        callBack( err, {
            button_action:{route:'/coll/new'},
            title: 'All collection',
            grid: box.utils.pickUpFromAsyncResult( result, 'collections-list' ),
            user: user,
            canEdit:true,
            crumbs : breadcrumbs.make({ }),
            addButton:{
                type:'input',
                placeholder:'New collection name',
                buttonText:'Add'
            }
        });
    });
}

function collectionList( req, res, next, filter, param ){
    var helpers = box.kleiDust.getDust().helpers

        , Parameters =  collectionList_defaultParam(filter, param)
        , user  =  req.session && req.session.passport && req.session.passport.user ? JSON.parse(req.session.passport.user):''
        , base = box.dust.makeBase({
                user:user,
                pageParam:{
                    filter: Parameters.filter,
                    param: Parameters.param,
                    route:'collection:list'
                }
/*                , timeFromNow: function(chunk, ctx, bodies, params) {
                    var value = helpers.tap(params.time, chunk, ctx);
                    if( value ){
                        return chunk.write( moment(value).fromNow() );
                    }else{
                        return chunk;
                    }
                    //chunk.write( value );
                    //chunk.write(':' + ctx.current().value );
                }
*/
          })
        ;

    collectionList_data( Parameters.filter, Parameters.param, user, function(err, displayBlock ){
        console.log( displayBlock );
        box.dust.render(res, 'collections/page_collections-list', base.push(displayBlock));
    });
}


/*
function Favorite  (req, res, next ){
    if( !app.locals.user || app.locals.user._id ){
        next();
    }else{
        next();
    }
}
*/
function Mine (req, res, next ){
    var session = req.session,
        user  = session && session.passport && session.passport.user ? JSON.parse(session.passport.user):null;
    //            , isOwner =  user._id ==  collection.owner ? true : ''
    if( user && user._id ){
        collectionList(  req, res, next, {owner:  user._id });
    }else{
        next();
    }
}

function All ( req, res, next  ){
    collectionList(  req, res, next );
}

/*
function Add(req, res) {
    var referer = req.headers.referer
        , coll_name = req.body.collectionName || 'New collection'
        , coll;
    if( !req.user ){
        context.Page2(req, res, 'add-button', {
            add_link: '/coll/new'
        });
    }else{
        coll = newCollection(req.user, coll_name.trim());
        box.emit('collection.add', coll, function(err, collection ) {
            if (err) {
                context.notFound(res, 'db error while creating new collection.');
            }else {
                box.parallel('collection.added',  collection, function(err, result){
                    res.redirect( referer  );
                });
            }
        });
    }
}
*/

function Delete (req, res) {
    var referer = req.headers.referer
        , coll_id = req.params.id
        , User = req.session.User
        ;
    if( !User ){
        res.redirect( '/coll');
    }else{
        box.emit('collection.delete', coll_id, function(err, aResult){
            res.redirect( req.query.back || '/coll/mine');
        });
    }

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
        collID = req.params.id,
        User = req.session.User;

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
                console.log(  util.inspect( displayBlock, false, 7, true ) );

//        var isOwner = collection.owner == user._id ? true : '';
//            canEdit: isOwner,
//            canDelete: isOwner,

                box.dust.render(res, 'collections/page_collection', base.push(displayBlock));
            });
        }
    });
}

box.on( 'add_collection', function( user, name, description, done ){
    box.emit('collection.add', newCollection( user, name, description  ), done );
});

box.on('init', function (App, Config, done) {
    app = App;
    config = Config;
    box.utils.later( done, null, 'route collections.js initialised');
});

box.on('init.attach', function (app, config,  done) {
    app.use(
        box.middler()
            .get('/coll/mine',       Mine)
            .get('/coll',            All)
//            .post('/coll/new',       Add)
            .get(['/coll/:id', '/w/c/:id'], Get_One)
            .get('/coll/:id/delete', Delete)
            .handler
    );

    app.io.route('collection', {
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
               , Parameters =  collectionList_defaultParam(req.data.filter, req.data.param)
               ;
           collectionList_data( Parameters.filter, Parameters.param, User, function(err, displayBlock){
               req.io.respond({
                   req:req.data,
                   result: displayBlock,
                   error:err
               });
           });
       },
       add:function(req){
           var user = JSON.parse(req.session.passport.user)
               , name = req.data.value.trim()
               , coll = newCollection( user, name )
               ;
           // TODO: verify the name
           box.emit('collection.add', coll, function(err, collection ) {
               if (err) {
                   req.io.respond({
                       result:'error',
                       value: name,
                       msg:'Error when creating collection'
                   });
               }else {
                   req.io.emit('collection.added', {param:req.data, collection:collection} );
                   req.io.respond({
                       result:'ok',
                       collection: collection,
                       param: req.data
                   });
               }
           });
       },
       remove:function(req){
           var User = req.session.User;

           if( !User ){
               req.io.respond({
                   result:'timeout'
               });
           }else{
               box.emit('collection.delete', req.data.id, function(err, result){
                   req.io.respond({
                       result:err ? 'error':'ok',
                       error:err
                   });
                   req.io.emit('collection.deleted', {param:req.data, result:result} );
               });
           }
       },

       fetchNotReadyLinks: function(req){

           var resp_param = _.merge({}, req.data);
           delete resp_param.notReadyID;
           box.invoke('link.ids-for-fetch', req.data.notReadyID || [], function(err, aLinks) {
               if( err ){
                   done(err);
               }else{
                   async.mapLimit(aLinks, 10,
                       function(link, done){
                           link.link_id = link._id;
                           delete link._id;
                           box.invoke('link.fetch',  link, function(err, o){
                                if(err){
                                    done(err);
                                }else{
                                    box.invoke('link.get', link.link_id, function(err, oLink){
                                        req.io.emit( 'link.updated', {
                                            result:'ok',
                                            param: resp_param,
                                            link: oLink
                                        });
                                        done(null, oLink  );
                                    });
                                }
                           });
                       },
                       function(err, links_results){
                           // links_results contain list of links_id
                           if( err ){
                               console.warn( err );
                               Error = err;
                           }else{
                               req.io.respond({
                                   result:'ok',
                                   request:req.data,
                                   data: links_results
                               });

                           }
                           // Done( err, collection);
                       }
                   );
               }
           });


       }

    });


//    app.get('/favorites',        routes.collections.favorites);
//    app.get('/favorites/mine',   routes.collections.favorites_mine);

    //    app.get('/favorites',        routes.collections.favorites);
    //    app.get('/favorites/mine',   routes.collections.favorites_mine);

    //    app.get('/tags',        routes.collections.tags);
    //    app.get('/tags/mine',   routes.collections.tags_mine);

    box.utils.later( done, null,  'route collections attached'  );
});
