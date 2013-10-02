
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
   ,  app

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

function scrape_page(HTML, url, link_id, oURL, Done){
    box.invoke( 'pageScrape', url, HTML, function(err, new_oURL ){
        new_oURL.links = oURL.links || [ link_id ];
        box.invoke('url.update', oURL._id, new_oURL, function(err, o){
            if( err ){
                Done(err);
            }else{
                box.emit('link.update-display', savedLink._id, make_link_display( new_oURL, savedLink), Done);
            }
        });
    });
}

function link_process( url, collectionID, param, Done ){
    var link2save = box.invoke('link.new',
            url,
            collectionID,
            {
                title: param.title || '',
                description: param.description || '',
                owner_id: param.owner_id,
                owner_screen_name: param.owner_screen_name,
                created: param.add_date || null,
                updated: param.last_modified || null
            }
        ),
        canonicalRegEx = /<link\s+rel=(?:"canonical"|'canonical')\s+href\s*=\s*(\"[^"]*\"|'[^']*')\s*(?:\/>|><\/link>)/gi
    ;
    box.invoke( 'link.add2', link2save, function(err, savedLink){
        if(err){
            err.result = 'error';
            err.state = 'add-link';
            Done( err, link2save );
        }
        // TODO do not created oURL before the checking if URL exists
        box.invoke( 'url.add-link', url, savedLink, function(err, oURL, this_is_existing_url  ){
            if(err){
                Done( err, 'url.add-link' );
            }
            if( !this_is_existing_url || !oURL.ready  ){
                var request_options = _.merge( {}, config.request, {uri:url, jar:request.jar()  });
                request(request_options, function (err, response, body) {
                    if( !err && response.statusCode == 200 ){
                        var canonical = ('' + body).match(canonicalRegEx),
                            canonicalURL = canonical ? canonical[0]:null;

                        box.emit('url.find-url', canonicalURL || url, function(err, existing_oURL ){
                            existing_oURL = existing_oURL.length ? existing_oURL[0]:null;
                            if( existing_oURL && existing_oURL.ready ){
                               // URL will be updated to the URL found in the oURL if it is canonical, when .display is updated
                               box.emit('link.update-display', savedLink._id, make_link_display( existing_oURL, savedLink), Done );
                            }else{
                                if( param.no_pageScrap ){
                                    Done(null, savedLink, oURL, existing_oURL );
                                }else{
                                    scrape_page(body, url,  savedLink._id, oURL, Done);
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
            }else{
                box.emit('link.update-display', savedLink._id, make_link_display( oURL, savedLink), Done );
            }
        });
    });
}


var cherioParam = {
    ignoreWhitespace: false,
    xmlMode: true,
    lowerCaseTags: true
};
function scrape_tags( $, uri, callback ){
    var Tags = keyWords.makeList( $('body').find('p, ul, h1, h2, h3').text(), null, 4, 'en'),
        result = Tags.words.slice(0, 12);

    result.local = Tags.locale;
    callback( null,{
        tags: result
    });
}



box.on('init', function (App, Config, done) {
    app = App;
    config = Config;
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
                , User = req.session && req.session.User ?  req.session.User : null;
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
