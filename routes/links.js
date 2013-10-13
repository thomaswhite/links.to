
/*
 * GET home page.
 */

var  box = require('../lib/box')
   , _ = require('lodash')
   , request = require('request')
   ,  util = require('util')
   , ShortId  = require('shortid').seed(96715652)
   , debug = require('debug')('linksTo:view.links')
   , breadcrumbs = require('./../lib/breadcrumbs')
   , linkDisplay = require('../lib/link-make-display')


// , sanitize = require('validator').sanitize

    , headers_to_watch = {
       server: true,
       contentType : true,
       "last-modified": true,
       etag: true
   }

    , config
    , app
    , queue
    , jobs


;


function ShorterID(){
    return  ShortId.generate().substr(0, config.db.short_id_length);
}

function Delete (req, res) {
    var referer = req.headers.referer;
    var link_id = req.params.id;
    var coll_id = req.params.coll;
    box.parallel('link.delete', link_id, url_id, coll_id, function(err, aResult){
        if( err ){
            throw err;
        }else{
            res.redirect( req.query.back || ('/coll/' + coll_id ) );
        }
    });
    // todo: get the id of current collection to return back after deletion
}


// todo: take into account the link can be imported ie do not overwrite the title with the URL if we have the title already.
function make_link_display( oURL, oLink){
    var tags = linkDisplay.tags();
    return oURL
            ? linkDisplay.update( oURL, tags)
            : {  notFound:true,  title:oLink.display.url }
            ;
}

function find_canonical_url(html){
    var regEx = [
           /<link\s+rel=(?:"canonical"|'canonical')\s+href\s*=\s*(\"[^"]*\"|'[^']*')\s*(?:\/>|><\/link>)/gi,
           /<meta[^>]*property\s*=\s*"og:url".*content\s*=\s*"([^"]*)/gi,
           /<meta[^>]*name\s*=\s*"twitter:url".*content\s*=\s*"([^"]*)/gi
        ]
        , match
        , result = null
    ;

    for( var i = 0; i < regEx.length; i++ ){
        match = regEx[i].exec( html );
        if( match ){
            result = match[1];
            break;
        }
    }
    return result;
}


function scrape_page_as_job( url, link_id,  url_id, page_id, HTML, Done ){
    jobs.create('scrap-page', {url:url, url_id: url_id, link_id : link_id, page_id: page_id, HTML: HTML} )
        .on('complete', function(){
            Done(null, this.data.page_parts );
        })
        .on('failed',   function(){
            Done('error');
        })
        .priority('normal')
        .save( function( err, result ){
            process.nextTick(function(){
                if( err ){
                    Done(err);
                }
            });
        });
}

function link_process( url, collectionID, param, oLink, Done ){
    var link2save = oLink || box.invoke('link.new',
            url,
            collectionID,
            {
                title:       param.title || '',
                description: param.description || '',
                owner_id:    param.owner_id,
                owner_screen_name: param.owner_screen_name,
                created:     param.add_date || null,
                updated:     param.last_modified || null
            }
        )
    ;
    box.invoke( 'link.add2', link2save, function(err, savedLink){
        if(err){
            err.result = 'error';
            err.state = 'add-link';
            Done( err, link2save );
        }
        // TODO do not create oURL before the checking if URL exists
        /**
         * check if the URL exists as canonical or original_URL
         * if yes
         *  then: create .display out of the oURL, save link and Done
         *  else:
         *       save the Link
         *
         * 2. request
         *      if canonical
         *          then exists use it
         *          else save page, create oURL, scrap page, update .display
         *
         *
         */

        box.invoke( 'url.add-link', url, savedLink, function(err, oURL, this_is_existing_url  ){
            if(err){
                Done( err, 'url.add-link' );
            }
            if( this_is_existing_url || oURL.state == 'ready'  ){
                box.emit('link.update-display', savedLink._id, make_link_display( oURL, savedLink), Done ); // reuse existing oURL with the same URL
            }else{
                var request_options = _.merge( {}, config.request, {uri:url, jar:request.jar()  });
                request(request_options, function (err, response, page_HTML) {
                    if( !err && response.statusCode == 200 ){
                        var canonicalURL = find_canonical_url('' + page_HTML);
                        box.emit('url.find-url', canonicalURL, function(err, found_same_url_oURL ){
                            found_same_url_oURL = found_same_url_oURL && found_same_url_oURL.length ? found_same_url_oURL[0]:null;

                            if( found_same_url_oURL ){
                                url =  canonicalURL;
                                if( found_same_url_oURL._id != oURL._id){
                                   box.emit('url.delete', oURL._id );
                                }
                            }
                            if( found_same_url_oURL && found_same_url_oURL.state == 'ready' ){
                               // URL should be updated to the URL found in the oURL if it is canonical, when .display is updated
                               box.emit('link.update-display', savedLink._id, make_link_display( found_same_url_oURL, savedLink), Done );
                            }else{
                                if( param.no_pageScrap ){
                                    Done(null, savedLink, oURL, found_same_url_oURL );
                                }else{
                                    box.emit( 'page.save', page_HTML, url, oURL._id, function(err, added_page ){
                                       if( err ){
                                           Done(err, 'page.save');
                                       }else{
                                           scrape_page_as_job( oURL.url, savedLink._id, oURL._id, added_page._id, page_HTML, function(err, xxx){
                                               box.invoke('url.add-link-id', oURL._id, savedLink._id, true, function(err2, updated_oURL){
                                                   box.emit('link.update-display', savedLink._id, make_link_display( updated_oURL, savedLink), Done );
                                               });
                                           });
                                       }
                                    });
                                }
                            }
                        });
                    }else{
                        var notFound = {
                                statusCode: response ? response.statusCode : -1 ,
                                result: 'error',
                                state: 'url-ping'
                            };
                        box.emit('url.delete', oURL._id );
                        box.emit('link.update-display', savedLink._id, make_link_display( null, savedLink), function(err2, updated_Link){
                            Done(  err2 || notFound, updated_Link);
                        });
                    }
                });
            }
        });
    });
}


function link_add( url, collectionID, oLink, param, extra, Done ){

    var link2save = oLink || box.invoke('link.new',
            url,
            collectionID,
            {
                title:       param.title || '',
                description: param.description || '',
                owner_id:    param.owner_id,
                owner_screen_name: param.owner_screen_name,
                created:     param.add_date || null,
                updated:     param.last_modified || null
            }
        )
    ;
    link2save = _.merge( link2save, extra || {} );
    box.invoke( 'link.add2', link2save, function(err, oAdded_Link ){
        if( err ){
            Done( err, 'url.add2');
        }else{
            box.invoke('url.check-url-and-original_url', url, function(err, oExisting_URL ){
                if( err ){
                    Done(err, 'url.find-url');
                }else if( exisitng_URL ){
                    box.invoke('url.add-link-id', oExisting_URL._id, savedLink._id, false, function( err, number_of_updated ){
                        if( err ){
                            Done( err );
                        }else{
                            var oUpdate = {
                                url_id  : exisitng_URL._id,
                                state   : 'queued'
                            };
                            if(  oExisting_URL.state == 'ready' ){
                                oUpdate.state   = 'ready';
                                oUpdate.display = oExisting_URL.display;
                            }
                            box.invoke('link.update', oAdded_Link._id, oUpdate, true, function( err, updated_Link ){
                                    Done(err, updated_Link, oExisting_URL, true ); // true indicates it is an existing URL
                                }
                            );
                        }
                    });
                }else{
                    box.on('url.add', url, oAdded_Link, {}, function(err, oURL ){
                        Done(err, oAdded_Link, oURL, false );
                    });
                }
            });
        }
    });
}



box.on('init', function (App, Config, done) {
    app = App;
    config = Config;

    queue = box.Queue;
    jobs = box.Jobs;

    process.nextTick(function() {
        done(null, 'route links.js initialised');
    });
});


box.on('init.attach', function (app, config,  done) {
    app.use(
        box.middler()
//           .post('/link/new/:coll?',        Add)
           .get('/link/:id/delete/:coll?',  Delete)
           .handler
    );

    box.on('link_process', link_process);

    app.io.route('link', {

        remove: function(req){
            box.invoke('link.delete2', req.data.id, function(err, found ){
                req.io.emit('link.deleted', { param:req.data, error:err, found:found } );
            });
        },

        add:function(req){
            var url = req.data.value.trim()
                , token = ShortId.generate()
                , User = req.session && req.session.User ?  req.session.User : null
            ;
            req.data.token = token;

            if( !User ){
                req.io.respond( { result:'timeout' } );
                return;
            }
            req.io.respond( {
                url: url,
                state: 'url-ping',
                result:'ok',
                param: req.data,
                token:token
            } );

            link_process(
                url,
                req.data.coll_id,
                {
                    owner_id: User._id,
                    owner_screen_name: User.screen_name
                },
                null,
                function(err,link){
                    if( err ){
                        console.error( err );
                        req.io.emit( 'link-failure', {
                            result:'error',
                            param: req.data,
                            error:err,
                            explain:'Error saving link'
                        });
                    }else{
                        req.io.emit( 'link.saved', {
                            result:'ok',
                            param: req.data,
                            link: link
                        });
                    }
                }
            );
        }
    });

    process.nextTick(function() {
        done(null, 'route links.js attached'  ); //
    });
});
