
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

/**
 * Create a oLink and oURL (if it does not exists)
 * @param url
 * @param collectionID
 * @param oLink  - ready link object to be saved
 * @param param  - link parameters
 * @param extra  - hash with additional parameters to be added to link object just before creating
 * @param Done fn( err, oAdded_Link, oURL )
 */
function link_add( url, collectionID, param, oLink, extra, Done ){

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
                }else if( oExisting_URL ){
                    box.invoke('url.add-link-ids', oExisting_URL._id, [oAdded_Link._id], true, function( err, oUpdated_URL ){
                        if( err ){
                            Done( err );
                        }else{
                            var oUpdate = {
                                url_id  : oExisting_URL._id,
                                state   : 'queued'
                            };
                            if(  oExisting_URL.state == 'ready' ){
                                oUpdate.state   = 'ready';
                                oUpdate.display = oExisting_URL.display;
                            }
                            box.invoke('link.update', oAdded_Link._id, oUpdate, true, function( err, updated_Link ){
                                    Done(err, updated_Link, oExisting_URL );
                                }
                            );
                        }
                    });
                }else{
                    box.invoke('url.add', url, oAdded_Link, {}, function(err, oURL ){
                        Done(err, oAdded_Link, oURL );
                    });
                }
            });
        }
    });
}


function job_fetch_link( url, link_id,  url_id, Done ){
    jobs.create('link-fetch', {
        url:url,
        url_id: url_id,
        link_id : link_id,
        default_request_settings: config.request
       })
        .on('complete', Done )
        .on('failed',   function(err) {
            Done('job-error' );
        })
        .priority('normal')
        .attempts(100)
        .save( function( err, result ){
            process.nextTick(function(){
                if( err ){
                    Done(err);
                }
            });
        });
}


function link_process( url, collectionID, param, oLink, extra, Done ){
    link_add( url, collectionID, param, oLink, extra, function(err, oLink, oURL){
        if( err ){
            Done(err);
        }else if( oLink.state == 'ready'){
            Done( null, oLink );
        }else{
            job_fetch_link( url, oLink._id,  oURL._id, function(err){
                if( err ){
                    Done(err);
                }else{
                    box.invoke( 'link.get', oLink._id, Done );
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
    box.on('link_add', link_add );

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
                {},
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
