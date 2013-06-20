
/*
 * GET home page.
 */

var box = require('../box.js')
    , _ = require('lodash')
    , debug = require('debug')('linksTo:view.collections')
    , breadcrumbs = require('./breadcrumbs.js')
    , ShortId  = require('shortid').seed(96715)

    , config
    , app
    ;


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
function newCollection  (owner, name, description){
    return {
        type:'collection',
        shortID : ShorterID(),
        owner: owner,
        title: name.trim(),
        description: description || 'Description...',
        linksCount:0,
        created : new Date(),
        updated:  new Date(),
        links:[]
    }
}

function collectionList_data( filter, param, user, callBack ){
    box.parallel('collections.list', filter, param.limit, param.sort, function( err, result ){
        callBack( err, {
            button_action:{action:'collection:add'},
            title: 'All collection',
            grid: box.utils.pickUpFromAsyncResult( result, 'collections-list' ),
            user: user,
            canEdit:true,
            crumbs : breadcrumbs.make({ }),
            addButton:{
                link: '/coll/new',
                name: 'collectionName',
                placeholder:'New collection name',
                buttonText:'Add'
            }
        });
    });
}

function collectionList( req, res, next, filter, param ){
    filter = filter || {};
    param = param || {page:1};
    param.limit = param.limit || 48;
    param.sort = param.sort || {updated:-1, created:-1};

    var user  =  req.session && req.session.passport && req.session.passport.user ? JSON.parse(req.session.passport.user):'';
    var base = box.dust.makeBase({
        user:user,
        pageParam:{
            filter:filter,
            param:param,
            route:'collection:list'
        }
    });

    collectionList_data( filter, param, user, function(err, displayBlock ){
        console.log( displayBlock );
        box.dust.render(res, 'collections/collections-list', base.push(displayBlock));
    });
}



function Favorite  (req, res, next ){
    if( !app.locals.user || app.locals.user._id ){
        next();
    }else{
        next();
    }
}

function Mine (req, res, next ){
    if( !app.locals.user || !app.locals.user._id ){
        next();
    }else{
        collectionList(  req, res, next, {owner: '' + app.locals.user._id || 0});
    }
}

function All ( req, res, next  ){
    collectionList(  req, res, next );
}

function Add(req, res) {
    var referer = req.headers.referer;
    var coll_name = req.body.collectionName || 'New collection';
    if( !req.user ){
        context.Page2(req, res, 'add-button', {
            add_link: '/coll/new'
        });
    }else{
        var coll = newCollection(req.user._id, coll_name.trim());
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

function Delete (req, res) {
    var referer = req.headers.referer;
    var coll_id = req.params.id;
    box.parallel('collection.delete', coll_id, function(err, aResult){
        res.redirect( req.query.back );
    });
    // todo: get the id of current collection to return back after deletion
}


function Get_One_data (collID, user, callBack) {
    box.emit( 'collection.get.one', collID, function( err, collection ){
        var isOwner =  user._id ==  collection.owner ? true : '';
        callBack(err, {
            button_action:{action:'link:add', coll_id: collID },
            title: (collection && collection.title ? collection.title : 'Collection not found' ) + '"',
            user: user,
            canEdit: isOwner,
            canDelete: isOwner,
            collection: collection,
            crumbs : breadcrumbs.make({
                owner:isOwner,
                coll:{id:collection._id, title:collection.title }
            }),
            addButton:{
                link: '/link/new/' + collID,
                name: 'links',
                placeholder:'Paste links',
                type:'input',
                buttonText:'Add Link',
                hidden:[
                    {name:"add2coll", value : collID }
                ]
            }
        });
    });
};

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
                , isOwner =  user._id ==  collection.owner ? true : ''
                base = box.dust.makeBase({
                    user:user,
                    pageParam:{
                        route:'collection:get',
                        coll_id : collection._id
                    }
                })
                ;

            Get_One_data( collID, user, function(err, displayBlock ){
                console.log( displayBlock );
                box.dust.render(res, 'collections/collection_page', base.push(displayBlock));
            });
        }
    });
}


box.on('init', function (App, Config, done) {
    app = App;
    config = Config;
    done(null, 'routers collections.js initialised');
});

box.on('init.attach', function (app, config,  done) {
    app.use(
        box.middler()
            .get('/coll/mine',       Mine)
            .get('/coll',            All)
            .post('/coll/new',       Add)
            .get(['/coll/:id', '/w/c/:id'], Get_One)
            .get('/coll/:id/delete', Delete)
            .handler
    );

    app.io.route('collection', {
       get:  function(req) {
           box.emit( 'collection.get.one', req.data.coll_id, function( err, collection ){
                req.io.respond({
                   route:'collection:get',
                   collection: collection
               });
           });
       },
       list: function(req){
           var User = req.session && req.session.passport && req.session.passport.user ?  JSON.parse( req.session.passport.user ):null;
           collectionList_data( req.data.filter, req.data.param, User, function(err, displayBlock){
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
               , coll = newCollection( user._id, name )
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
           box.parallel('collection.delete', req.data.coll_id, function(err, aResult){
               req.io.respond({
                   result:err ? 'error':'ok',
                   error:err
               })
           });
       }
    });


//    app.get('/favorites',        routes.collections.favorites);
//    app.get('/favorites/mine',   routes.collections.favorites_mine);

    //    app.get('/favorites',        routes.collections.favorites);
    //    app.get('/favorites/mine',   routes.collections.favorites_mine);

    //    app.get('/tags',        routes.collections.tags);
    //    app.get('/tags/mine',   routes.collections.tags_mine);

    done(null, 'route collections attached'  );
});
