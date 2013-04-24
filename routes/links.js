
/*
 * GET home page.
 */

var  box = require('../box.js')
   , _ = require('lodash')
   , debug = require('debug')('linksTo:view.links')
   , breadcrumbs = require('./breadcrumbs.js')
   ,  ShortId  = require('shortid').seed(96715652)
   , request = require('request')
   , cheerio = require('cheerio')
   , pageScraper
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
    var token =  ShorterID();

    pageScraper.on( 'pageScrape.error', function(err, resultToken ){
        if( resultToken == token ){
            console.error( err );
        }
    });
    pageScraper.on( 'pageScrape.notOK', function(err, resultToken, response ){
        if( resultToken == token ){
            console.error( err );
        }
        //response.statusCode;
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

    pageScraper.emit( 'pageScrape', urls[0], token, function(err){

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
        owner_screen_name: user_screen_name
    };
    _.merge( link, data);
    return link;
};


box.on('init', function (App, Config, done) {
    app = App;
    config = Config;
    pageScraper = require('../pageSrcaper.js').init({proxy: config.PROXY}, box );
    done(null, 'routers links.js initialised');
});

box.on('atach-paths', function (app, config,  done) {
    app.use(
        box.middler()
           .post('/link/new/:coll?',        Add)
           .get('/link/:id/delete/:coll?',  Delete)
           .handler
    );
    done(null, 'atach-paths: links.js attached'  ); //
});
