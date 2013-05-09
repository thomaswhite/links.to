
/*
 * GET home page.
 */

var  box = require('../box.js')
   , _ = require('lodash')
   , debug = require('debug')('linksTo:view.links')
   , breadcrumbs = require('./breadcrumbs.js')
   , ShortId  = require('shortid').seed(96715652)
   , request = require('request')
   , pageScraper
   , requestDefaults = {}
   , url = require('url')
// var sanitize = require('validator').sanitize;


   , config
   ,  app
    ;


function ShorterID(){
    return  ShortId.generate().substr(0, config.db.short_id_length);
};




// app.post('/link/new/:coll?', function(req, res)
function Add (req, res) {
    var referer = req.headers.referer;
    var post = req.body.links;
    //post.body = sanitize(post.body).xss().trim();
    var urls = post.replace(/\r/g,'').split(/\n/); // http://beckism.com/2010/09/splitting-lines-javascript/
    var URL = urls[0];
    var request_options = _.merge( {}, config.request, {uri:URL } );

    box.on( 'link.ready', function( newURL, Link ){
       res.redirect( newURL  );
    });

    box.on( 'link.not-found', function( newURL, Link ){
        res.redirect( newURL  );
    });


    pageScraper.on( 'pageScrape.ready', function( resultToken, Results ){
        if( resultToken == token ){
            var Link = newLink( req.user._id, req.user.screen_name, Results );
            box.emit('link.add', Link, req.body.add2coll, function(err, addedLink ) {
                if (err) {
                    throw err;
                }else {
                    box.parallel('link.added',  addedLink, function(err, result){
                        res.redirect( referer  );
                    });
                }
            });
        }
    });

    request.head(request_options, function (err, response, body) {
        var h,
            found = {url:URL},
            oURL = url.parse( URL )
            ;
        if( response ){
            h = response.headers;
            found.headers = {
                server: h.server,
                contentType : h['content-type'],
                modified: h['last-modified'],
                etag: h.etag
            };
            found.state = 'pinged';
        }else{
           found.state = 'not-found';
           found.title = "Page not found";
        };

        // TODO add a temp link for the missing URLs
        var Link = newLink( req.user._id, req.user.screen_name, found );
        box.emit('link.queue', Link, req.body.add2coll, function(err, addedLink ) {
            if (err) {
                throw err;
            }else {
                box.parallel('link.queued',  addedLink, function(err2, result2){
                    // now the link exists and it has been added to its collection
                    if( found.state == 'pinged' ){
                        box.parallel( 'pageScrape', request_options, function(err, Results){
                            if (err) {
                                throw err;
                            }else {
                                var updatedLink = Results[0];
                                box.parallel('link.added',  updatedLink, function(err, result){
                                    // tags has been added
                                    box.emit('link.ready',referer, updatedLink  );
                                });
                            }
                        });
                    }else{
                        box.emit('link.not-found',referer, addedLink  );
                    }
                });
            }
        });

    });


};
function Delete (req, res) {
    var referer = req.headers.referer;
    var link_id = req.params.id;
    var coll_id = req.params.coll;
    box.parallel('link.delete', link_id, coll_id, function(err, aResult){
        if( err ){
            throw err;
        }else{
            res.redirect( req.query.back || ('/coll/' + coll_id ) );
        }
    });
    // todo: get the id of current collection to return back after deletion
};


/**
 *
 * @param owner
 * @param name
 * @param description
 * @returns {{type: string, shortID: *, owner: *, title: *, description: (*|string), linksCount: number, links: Array}}
 */
function newLink (owner, user_screen_name, data ){
    var link =  {
        shortID : ShorterID(),
        owner: owner,
        imagePos:0,
        updated : new Date(),
        owner_screen_name: user_screen_name,
        state: 'pinged'
    };
    _.merge( link, data);
    return link;
};

box.on('init', function (App, Config, done) {
    app = App;
    config = Config;
    _.defaults(requestDefaults, config.request );
    pageScraper = require('../pageSrcaper.js').init(requestDefaults );
    done(null, 'routers links.js initialised');
});

box.on('init.attach', function (app, config,  done) {
    app.use(
        box.middler()
           .post('/link/new/:coll?',        Add)
           .get('/link/:id/delete/:coll?',  Delete)
           .handler
    );
    done(null, 'atach-paths: links.js attached'  ); //
});
