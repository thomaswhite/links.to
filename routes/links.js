
/*
 * GET home page.
 */

var  _ = require('lodash')
   , debug = require('debug')('linksTo:view.links')
   , breadcrumbs = require('./breadcrumbs.js')
   ,  ShortId  = require('shortid').seed(96715652)
   , request = require('request')
   , cheerio = require('cheerio')
// var sanitize = require('validator').sanitize;


   , config
   ,  emitter
   ,  app
    ;


var cherioParam = {
    ignoreWhitespace: false,
    xmlMode: true,
    lowerCaseTags: false
};

var requestDefaults = {
    'uri': null
    , 'headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22'
    }
};

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
function newLink (owner, coll_id, user_screen_name, data ){
    var link =  {
        shortID : ShorterID(),
        owner: owner,
        created : new Date(),
        collection: coll_id,
        owner_screen_name: user_screen_name
    };
    _.merge( link, data);
    return link;
};

exports.init = function( App, Config, Emitter ){
    app = App;
    config = Config;
    emitter = Emitter;

    var pageScraper = require('../pageSrcaper.js').init(null, Emitter);


    // app.post('/link/new/:coll?', function(req, res)
    this.add =  function(req, res) {
        var referer = req.headers.referer;
        var post = req.body.links;
        //post.body = sanitize(post.body).xss().trim();
        var urls = post.replace(/\r/g,'').split(/\n/); // http://beckism.com/2010/09/splitting-lines-javascript/
        var token =  ShorterID();
        pageScraper.on( 'pageScrape.ready', function( resultToken, Results ){
            if( resultToken == token ){
                var Link = newLink( req.user._id, req.body.add2coll, req.user.screen_name, Results );
                emitter.emit('link.add', Link, req.body.add2coll, function(err, addedLink ) {
                    if (err) {
                        throw err;
                    }else {
                        emitter.parallel('link.added',  addedLink, function(err, result){
                            res.redirect( referer  );
                        });
                    }
                });
            }
        });

        pageScraper.on( 'pageScrape.error', function(err, token ){
            if( resultToken == token ){
               console.error( err );
            }
        });
        pageScraper.on( 'pageScrape.notOK', function(err, token, response ){
            if( resultToken == token ){
                console.error( err );
            }
            //response.statusCode;
        });

        pageScraper.emit( 'pageScrape', urls[0], token, function(err){

        });
    };



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
    this.mine = function(req, res, next ){
        if( !app.locals.user ){
            next();
        }
        emitter.parallel('collections.list', {owner: app.locals.user._id}, 0, [], function( err, result ){
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


    this.delete = function(req, res) {
        var referer = req.headers.referer;
        var coll_id = req.params.id;
        emitter.parallel('collection.delete', coll_id, function(err, aResult){
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
                    var owner      =  req.user && req.user._id ==  collection.owner;
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