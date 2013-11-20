
/*
 * GET home page.
 */

var  box = require('../lib/box')
   , _ = require('lodash')
   ,  util = require('util')
   , ShortId  = require('shortid').seed(96715652)
   , debug = require('debug')('linksTo:view.links')
   , breadcrumbs = require('./../lib/breadcrumbs')


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
            res.redirect( req.query.back || ('/colls/' + coll_id ) );
        }
    });
    // todo: get the id of current collection to return back after deletion
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
                created:     param.add_date,
                updated:     param.last_modified,
                origin:      param.origin || 'interactive'
            },
            extra
        )
    ;
    box.invoke( 'link.add2', link2save, function(err, oAdded_Link ){
        if( err ){
            Done( err, 'url.add2');
        }else{
            box.invoke('url.check-url-and-original_url', url, function(err, oExisting_URL ){
                if( err ){
                    Done(err, 'url.find-url');
                }else if( oExisting_URL ){
                    // todo: change the state to queued
                    box.invoke('url.add-link-id', oExisting_URL._id, oAdded_Link._id, function( err ){
                        if( err ){
                            Done( err );
                        }else{
                            if( oExisting_URL.state == 'ready' ){
                                box.invoke('url.update-display-queued_and_new-links', oExisting_URL._id, null, function(err){
                                    box.on('link.get',  oAdded_Link._id, Done );
                                });
                            }else{
                                Done(err, oAdded_Link );
                            }
                        }
                    });
                }else{
                    Done(err, oAdded_Link );
                }
            });
        }
    });
}

function job_fetch_link( param, Done ){
//    param.default_request_settings = config.request;
    jobs.create('link-fetch', param )
        .on('complete', Done )
        .on('failed',   function(err) {
            Done('job-error', err );
        })
        .priority('normal')
        .attempts(100)
        .save( function( err, result ){
            box.utils.later( Done, err);
        });
}

/**
 *
 * @param url
 * @param collectionID
 * @param param
 * @param oLink if we have prepared oLink object somewhere else
 * @param extra extra fieleds to be added to the oLink
 * @param Done
 */
function link_process( url, collectionID, param, oLink, extra, Done ){
    param = param || {};
    link_add( url, collectionID, param, oLink, extra, function(err, oLink ){
        if( err ){
            Done(err);
        }else if( oLink.state == 'ready' || param.do_not_fetch ){
            Done( null, oLink );
        }else{
            job_fetch_link(_.merge(param, { url:url, link_id : oLink._id, url_id: oLink.url_id || 0 } ), function(err){
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
    var ts = new Date().getTime();
    app = App;
    config = Config;
    queue = box.Queue;
    jobs = box.Jobs;
    box.utils.later( done, null, '+' + ( new Date().getTime() - ts) + 'ms route "links.js" initialised.');
});

function link_delete( req, id, done ){
    id = id || req.data.id;
    box.invoke('link.delete2',id, function(err, found ){
        param:req.data.id = id;
        req.io.emit('link.deleted', { param:req.data, error:err, found:found } );
        if( done && typeof done == 'function'){
            done();
        }
    });
}


box.on('init.attach', function (app, config,  done) {
    var ts = new Date().getTime();
    app.use(
        box.middler()
           .get('/link/:id/delete/:coll?',  Delete)
           .handler
    );

    box.on('Link__Process',  link_process);
    box.on('Link__Add',      link_add );
    box.on('Link__Fetch',    job_fetch_link);
    box.on('Link__Delete',   link_delete);


    app.io.route('link', {

        remove: link_delete,

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
                        req.data.emitted = 'link.saved';
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
    box.utils.later( done, null, '+' + ( new Date().getTime() - ts) + 'ms route "links.js" attached.');
});
