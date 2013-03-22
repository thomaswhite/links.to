
/*
 * GET home page.
 */

var  _ = require('lodash');
var debug = require('debug')('linksTo:view.collections');
var breadcrumbs = require('./breadcrumbs.js');
var ShortId  = require('shortid').seed(96715);

var config,
    emitter,
    app
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


exports.init = function( App, Config, Emitter ){
    app = App;
    config = Config;
    emitter = Emitter;

    this.all = function(req, res ){
        var filter = app.locals.user ? {owner: app.locals.user._id} : {};
        emitter.parallel('collections.list', {}, 0, [], function( err, result ){
            var collections =  _.first(result, function(element, pos, all){ return element.type == 'collections-list';  })[0];
            debug( "Collections list: \n", app.locals.inspect( collections ));
            debug( "user: \n", app.locals.inspect( app.locals.user ));
            res.render('collections-list', {
                title: 'All collection',
                grid: collections,
                user: app.locals.user,
                canEdit:true,
                crumbs : breadcrumbs.make(req, { owner:true }),
                addButton:{
                    link: '/coll/new',
                    name: 'collectionName',
                    placeholder:'New collection name',
                    buttonText:'Add'
                }
            });

        });
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
            emitter.emit('collection.add', coll, function(err, collection ) {
                if (err) {
                    context.notFound(res, 'db error while creating new collection.');
                }else {
                    emitter.parallel('collection.added',  collection, function(err, result){
                        res.redirect( referer  );
                    });
                }
            });
        }
    };

    this.delete = function(req, res) {
        var referer = req.headers.referer;
        var coll_id = req.params.id;
        emitter.parallel('collection.delete', function(coll_id, callback){
            res.redirect( req.query.back );
        });
        // todo: get the id of current collection to return back after deletion
    };


    this.get = function(req, res) {
        var referer = req.headers.referer,
            collID = req.params.id;

        emitter.waterfall( 'collection.get', {coll_id: collID}, function( err, waterfall ){
                if ( err ){
                    context.notFound(res);
                }else{
                    var collection =  waterfall.collection || {}; //_.first(result, function(element, pos, all){ return element.type == 'collection';  })[0] || {};
                    var links      =  waterfall.links || []; //_.first(result, function(element, pos, all){ return element.type == 'links-list';  })[0] || [];
                    var owner      =  true ; //req.user && req.user._id ==  collection.owner;
/*
                    for(var i=0; results[1] &&  i < results[1].length; i++ ){
                        if( !results[1][i].imagePos ){
                            results[1][i].imagePos = 0;
                        }
                    }
*/
                    debug( "Collection: \n", app.locals.inspect( collection ));
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