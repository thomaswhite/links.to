
/*
 * GET home page.
 */

var  _ = require('lodash');

var config = 1,
    emitter;

exports.init = function( app, Config, Emitter ){
    config = Config;
    emitter = Emitter;

    this.top = function( req, res ){
        res.render('layout', { title: 'Express' });
    };


    this.collections = function(req, res ){
            var filter = app.locals.user ? {owner: app.locals.user._id} : {};
            emitter.parallel('collections.list', {}, 0, [], function( err, result ){
                var collections = _.first(result, { 'type': 'collections-list' });

                res.render('collections-list', {
                    title: 'All collection',
                    grid: collections
                });

            });

/*
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
  */
    };


    return this;
};