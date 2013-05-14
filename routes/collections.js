
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
        links:[]
    }
}

function collectionList( req, res, next, filter ){
    filter = filter || {};
    box.parallel('collections.list', filter, 0, [], function( err, result ){
        var collections =  _.first(result, function(element, pos, all){ return element.type == 'collections-list';  })[0];
 //       debug( "Collections list: \n", box.utils.inspect( result ));
//            debug( "user: \n", app.locals.inspect( app.locals.user ));
        res.render('collections-list', {
            title: 'All collection',
            grid: collections,
            user: app.locals.user,
            canEdit:true,
            crumbs : breadcrumbs.make(req, {  }),
            addButton:{
                link: '/coll/new',
                name: 'collectionName',
                placeholder:'New collection name',
                buttonText:'Add'
            }
        });
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



function Get (req, res) {
    var referer = req.headers.referer,
        collID = req.params.id;

    box.emit( 'collection.get.one', collID, function( err, collection ){
        if ( err ){
            context.notFound(res);
        }else{
            if( !collection ){
                res.redirect( '/coll' );
            }
            var owner      =  req.user && req.user._id ==  collection.owner;
            box.emit( 'collection.get.links', collection, {}, function(err2, links){
                //                  debug( "user: \n", app.locals.inspect( app.locals.user ));
                //box.req.io.emit

                res.render('collection', {
                    title: 'Collection "' + (collection && collection.title ? collection.title : ' not found' ) + '"',
                    user: req.user,
                    grid: links,
                    canEdit: owner,
                    canDelete: owner,
                    linkUnderEdit :  req.query.editLink,
                    collection: collection || {},
                    referer: referer,
                    crumbs : breadcrumbs.make(req, {
                        owner:owner,
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
            /*
             for(var i=0; results[1] &&  i < results[1].length; i++ ){
             if( !results[1][i].imagePos ){
             results[1][i].imagePos = 0;
             }
             }
             */
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
            .get(['/coll/:id', '/w/c/:id'], Get)
            .get('/coll/:id/delete', Delete)
            .handler
    );


    app.io.route('collection', {
       get:  function(req) {
           box.emit( 'collection.get.one', req.data.coll_id, function( err, collection ){
               if ( err ){
                   context.notFound(res);
               }else{
                   if( !collection ){
                       req.io.respond({
                           route:'collection:get',
                           notFound: true,
                           collection: { coll_id:  req.data.coll_id }
                       });
                   }
                   box.emit( 'collection.get.links', collection, {}, function(err2, links){
                       collection.links = links;
                       req.io.respond({
                           route:'collection:get',
                           collection: collection
                       });
                   });
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

    done(null, 'route collections attached'  );
});
