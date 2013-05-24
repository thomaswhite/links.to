
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

    , headers_to_watch = {
       server: true,
       contentType : true,
       "last-modified": true,
       etag: true
   }

   , config
   ,  app
    ;


function ShorterID(){
    return  ShortId.generate().substr(0, config.db.short_id_length);
};


function ping_a_link( request_options, callback ){
    request.head(request_options, function (err, response, body) {
        var h,
            found = {url:request_options.uri, headers:{}},
            oURL = url.parse( request_options.uri )
            ;
        if( response ){
            h = response.headers;
            for( var i in headers_to_watch ){
                if( h[i] ){
                    found.headers[i] = h[i];
                }
            }
            found.state = 'pinged';
        }else{
            found.state = 'not-found';
            found.title = "Page not found";
        };
        callback( found );
    });
}


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
//           .post('/link/new/:coll?',        Add)
           .get('/link/:id/delete/:coll?',  Delete)
           .handler
    );


    app.io.route('link', {
        add:function(req){
            var url = req.data.value.trim(),
                request_options = _.merge( {}, config.request, {uri:url }),
                token = ShortId.generate();


            box.on('pageScrape.images', function(event_token, image ){
               if( event_token == token ){
                   req.io.emit('pageScrape.image', {url: url, image:image});
               }
            });
            box.on( 'pageScrape.head', function( event_token, head ){
                if( event_token == token ){
                    req.io.emit( 'pageScrape.head', {url: url, head:head});
                }
            });


            ping_a_link( request_options, function( found ){
                if( found.state == 'not-found' ){
                    found.result = 'error';
                    found.value = url;
                    found.msg   = 'URL can not be found';
                    req.io.respond( found );
                }else{
                    req.io.respond( found );
                    request_options.token = token;
                    box.parallel( 'pageScrape', request_options, function(err, Results){
                        if (err) {
                            throw err;
                        }else {
                            var scrapResult = Results[0]
                                , user = JSON.parse(req.session.passport.user)
                                , Link = newLink( user._id, user.screen_name, scrapResult )
                                ;
                            box.parallel('link.added',  Link, function(err, result){
                                // tags has been added
                                if( err ){
                                    throw err;
                                }else{
                                    req.io.emit( 'link.ready', {
                                        addedLink : Link,
                                        result: result
                                    });
                                }
                            });
                        }
                    });

                }
            });
        }
    });


    done(null, 'atach-paths: links.js attached'  ); //
});
