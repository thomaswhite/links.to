
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
                grid: collections,
                addButton:{
                    link: '/coll/new',
                    name: 'collectionName',
                    placeholder:'New collection name',
                    buttonText:'Add'
                }
            });

        });
    };

    this.newColl = function(req, res) {
        var referer = req.headers.referer;
        if( !req.user ){
            context.Page2(req, res, 'add-button', {
                add_link: '/coll/new'
            });
        }else{
            var coll = newCollection(req.user._id, req.body.collectionName.trim());
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

    this.oneColl = function(req, res) {
        var referer = req.headers.referer,
            collID = req.params.id;

        emitter.parallel( 'collection.get', collID, function( err, results ){
                if ( err ){
                    context.notFound(res);
                }else{
                    var owner = req.user && req.user._id ==  results[0].userID;

                    for(var i=0; results[1] &&  i < results[1].length; i++ ){
                        if( !results[1][i].imagePos ){
                            results[1][i].imagePos = 0;
                        }
                    }

                    // res.render('collections-list', { });

                    // console.log( '\napp.get(/coll/:id)', results );
                    context.Page2(req, res, 'collection', {
                        user: req.user,
                        linkUnderEdit :  req.query.editLink,
                        title: 'Collection "' + (results.length ? results[0].title : 'Missing' ) + '"',
                        collection: results[0] || [],
                        grid: results[1] || [],
                        canEdit: owner,
                        canDelete: owner,
                        referer: referer,
                        crumbs : breadcrumbs.make(req, {
                            owner:owner,
                            coll:{id:results[0]._id, title:results[0].title }
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
            }
        );
    };


    return this;
};