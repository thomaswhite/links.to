/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 21/07/12
 * Time: 13:30
 * To change this template use File | Settings | File Templates.
 */

var async   = require('async');
var logger  = require('nlogger').logger(module);
var breadcrumbs = require('./../routes/breadcrumbs.js');
var context;

module.exports = {
    init: function(Context, callback) {

        context = Context;
        var app = Context.app;

        // TODO: this is a shortcut to a more generic /coll/xxxxxx
        app.get('/coll/mine', function(req, res) {
            if( !req.user ){
                res.redirect('/coll');
            }else{
                context.db.collections.all( req.user._id, {title: 1}, 1, 20,  function(err, collections ) {
                    if (err) {
                        context.notFound(res, 'db error while getting your collections.');
                    }else {
                        context.Page2(req, res, 'collections-list', {
                            title: 'My collections',
                            title2: 'My collections',
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
                    }
                });
            }
        });

    app.get('/coll', function(req, res) {
        context.db.collections.all( null, {title: 1}, 1, 20,  function(err, collections ) {
            if (err) {
                context.notFound(res, 'db error while getting your collections.');
            }else {
                console.log( '\napp.get(/coll)', collections );
                context.Page2(req, res, 'collections-list', {
                    title:'All collections',
                    title2:'All collections',
                    crumbs : breadcrumbs.make(req, { }),
                    grid: collections,
                    canEdit:false,
                    addButton:{}
                });
            }
        });
    });

        app.post('/coll/new', function(req, res) {
            var referer = req.headers.referer;
            if( !req.user ){
                context.Page2(req, res, 'add-button', {
                    add_link: '/coll/new'
                });
            }else{
                var newCollection = {
                    userID: req.user._id,
                    title: req.body.collectionName.trim(),
                    description:'Description...',
                    linksCount:0,
                    links:[]
                };
                context.db.collections.addOne( req.user._id, newCollection,  function(err, collection ) {
                    if (err) {
                        context.notFound(res, 'db error while creating new collection.');
                    }else {
                        res.redirect( referer  );
                    }
                });
            }
        });
        app.get('/coll/:id', function(req, res) {
            var referer = req.headers.referer,
                collID = req.params.id;
            async.parallel(
                [
                    function(callback){  context.db.collections.findOne(collID, callback); },
                    function(callback){  context.db.links.inCollection( collID, {updated: -1},  callback );  }
                ],
                function( err, results ){
                    if ( err ){
                        context.notFound(res);
                    }else{
                        var owner = req.user && req.user._id ==  results[0].userID;

                        for(var i=0; results[1] &&  i < results[1].length; i++ ){
                           if( !results[1][i].imagePos ){
                             results[1][i].imagePos = 0;
                           }
                        }
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
        });

        app.post('/coll/:id/eip', function(req, res) {
            var referer = req.headers.referer,
                new_value = req.param('update_value'),
                element_id = req.param('element_id'),
                original_html = req.param('original_html'),
                original_value = req.param('original_value')
                ;

            // TODO: verify parameters - name, value, security token
            if( new_value == original_value){
                res.send(new_value, 304);
            }else{
                context.db.collections.eip( req.params.id, element_id, new_value);
                res.writeHead(200, {"Content-Type": "application/json"});
                res.write( new_value );   //JSON.stringify({ another: "item"  })
                res.end();
            }
        });

        app.get('/coll/:id/delete', function(req, res) {
            var referer = req.headers.referer;
            // todo: get the id of current collection to return back after deletion
            context.db.collections.removeOne(req.params.id, function(err, post) {
                if (err ) {
                    context.notFound(res);
                    return;
                }
                res.redirect( req.query.back );
            });
        });






        // We didn't have to delegate to anything time-consuming, so
        // just invoke our callback now
        callback();

    }
};