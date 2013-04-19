
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
};


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
};

function collectionList( req, res, next, filter ){
    filter = filter || {};
    box.parallel('collections.list', filter, 0, [], function( err, result ){
        var collections =  _.first(result, function(element, pos, all){ return element.type == 'collections-list';  })[0];
        debug( "Collections list: \n", box.utils.inspect( result ));
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
};



exports.init = function( App, Config ){
    app = App;
    config = Config;

    this.favorite  = function(req, res, next ){
        if( !app.locals.user || app.locals.user._id ){
            next();
        }else{
            next();
        }
    };

    this.mine = function(req, res, next ){
        if( !app.locals.user || !app.locals.user._id ){
            next();
        }else{
            collectionList(  req, res, next, {owner: '' + app.locals.user._id || 0});
        }
    };

    this.all = function( req, res, next  ){
        collectionList(  req, res, next );
    };


    this.add = function(req, res) {
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
    };

    this.delete = function(req, res) {
        var referer = req.headers.referer;
        var coll_id = req.params.id;
        box.parallel('collection.delete', coll_id, function(err, aResult){
            res.redirect( req.query.back );
        });
        // todo: get the id of current collection to return back after deletion
    };


    this.get = function(req, res) {
        var referer = req.headers.referer,
            collID = req.params.id;

        box.waterfall( 'collection.get', {coll_id: collID}, function( err, waterfall ){
                if ( err ){
                    context.notFound(res);
                }else{

                    if( !waterfall.collection ){
                        res.redirect( '/coll' );
                    }

                    var collection =  waterfall.collection || {}; //_.first(result, function(element, pos, all){ return element.type == 'collection';  })[0] || {};
                    var links      =  waterfall.links || []; //_.first(result, function(element, pos, all){ return element.type == 'links-list';  })[0] || [];
                    var owner      =  req.user && req.user._id ==  collection.owner;


/*
                    for(var i=0; results[1] &&  i < results[1].length; i++ ){
                        if( !results[1][i].imagePos ){
                            results[1][i].imagePos = 0;
                        }
                    }
*/
                    debug( "waterfall: \n",  waterfall );
  //                  debug( "user: \n", app.locals.inspect( app.locals.user ));
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


                }
            });
    };


    return this;
};