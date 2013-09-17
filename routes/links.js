
/*
 * GET home page.
 */

var  box = require('../modules/box.js')
   , _ = require('lodash')
   , debug = require('debug')('linksTo:view.links')
   , breadcrumbs = require('./breadcrumbs.js')
   , ShortId  = require('shortid').seed(96715652)
   , request = require('request')
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
   , SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
   , SCRIPT_REGEX2= /<script\b[^>]*>(.*?)<\/script>/ig


    ;


var metaTagsToJoin = [
    'title',
    'author',
    'abstract',
    'description',
//    'keywords',
    'thumbnail',
    'summary',
     'url',
    'tags'
];

function pick_meta_field(groups, tag){
    var content = '';
    for( var g= 0; g < groups.length; g++){
        if( !groups[g] ) continue;
        if( (content = groups[g][ tag ]) ){
            content;
            break;
        }
    }
    return content;
}

function page_display( page, metaTagsToJoin ){

    var groups = [],
        head = page.head || {},
        display = {},
        names = head.names,
        og    = head.og,
        fb    = head.fb,
        twetter = head.twetter,
        pos
        ;
    groups.push( head.names );
    groups.push( head.og);
    groups.push( head.twetter);
    groups.push( head.fb );

    for( var i=0; i< metaTagsToJoin.length; i++){
        var tag = metaTagsToJoin[i],
            value = null;
        if(  display[ tag ] ) continue;
        switch( tag ){
            case 'title':
                value = pick_meta_field(groups, tag);
                if( !value ){
                    value = head.title || (page.body.h1 ? page.body.h1[0] : '' );
                }
                if( (pos = value.indexOf('|')) > -1){
                    value = value.split('|')[0];
                }

                value = box.utils.removeAll( value, SCRIPT_REGEX, SCRIPT_REGEX2);

                // value = value.split('&#8211;').join('-').split('&#8217;').join("'");
                break;

            case 'description':
                value = pick_meta_field(groups, tag);
                if( value ){
                    if( page.body && page.body.summary ){
                        delete page.body.summary;
                    }
                }else{
                    if( page.body && page.body.summary ){
                        value = page.body.summary;
                    }
                }
                value = box.utils.removeAll( value, SCRIPT_REGEX, SCRIPT_REGEX2);
                break;

            case 'url':
                if( head.links && head.links.canonical ){
                     value = head.links.canonical.href;
                     display.canonicalURL = true;
                }else{
                    value = pick_meta_field(groups, 'url');
                }
                if( !value ){
                    value = page.url;
                }
                break;

            case 'thumbnail':
                display.imagePos = '';
                value = head.names && head.names.thumbnail ? head.names.thumbnail : pick_meta_field(groups, 'thumbnail');
                if( !value && head.og.image && head.og.image.length){
                    value = head.og.image[0].url;
                }else if( !value && page.body.image && page.body.image.length){
                    value = page.body.image[0].src;
                    display.imagePos = 0;
                }
                break;

            case 'author':
                if( head.links.author ){
                    var author =  head.links.author;
                    if( typeof author == 'string' ){
                         if( head.links.author.indexOf('@') > -1  ){
                            value = {
                                type:'email',
                                value: author
                            }
                         }else{
                             value = {
                                 type:'text',
                                 value: author
                             }
                         }
                    }else if( author.href ){
                        value = {
                            value:author.href,
                            type:'url'
                        }
                    }
                }
                break;

            case 'tags':
                value = _.first(page.tags || [], 5);
                break;

            case 'abstract':
            case 'summary':
        }
        if( value ){
            display[ tag ]  = value;
        }

    }
    if ( !display.title ){
        display.title = display.url;
    }
    // display.collection = page.collection;
    // display.shortID    = page.shortID;
    return { display: display};
}




function ShorterID(){
    return  ShortId.generate().substr(0, config.db.short_id_length);
};


function ping_a_link( request_options, callback ){
    request.head(request_options, function (err, response, body) {
        var h,
            found = {
                url:request_options.uri,
                token:request_options.token,
                headers:{},
                state: 'found'
            },
            oURL = url.parse( request_options.uri )
            ;
        if( response ){
            found.headers = response.headers;
            callback( null, found );
        }else{
            found.state = 'not-found';
            found.title = "Page not found";
            callback( found );
        }

    });
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
};


/**
 *
 * @param owner
 * @param name
 * @param description
 * @returns {{type: string, shortID: *, owner: *, title: *, description: (*|string), linksCount: number, links: Array}}
 */
function newLink (data, collection_id, owner, user_screen_name, token ){
    var link =  {
        collection : collection_id,
        shortID : token || ShorterID(),
        owner: owner,
        updated : new Date(),
        owner_screen_name: user_screen_name
    };
    _.merge( link, data);
    return link;
}

box.on('init', function (App, Config, done) {
    app = App;
    config = Config;
    done(null, 'route links.js initialised');
});

box.on('init.attach', function (app, config,  done) {
    app.use(
        box.middler()
//           .post('/link/new/:coll?',        Add)
           .get('/link/:id/delete/:coll?',  Delete)
           .handler
    );

    app.io.route('link', {

        remove: function(req){
            var id = req.data.id;
            box.db.coll.links.findById(id, function(err, Link ){
                req.io.respond({
                    result:err ? 'error':'ok',
                    error:err,
                    link:Link
                });
                if( !Link ){
                    req.io.emit('link.delete.missing', { param:req.data } );
                }else{
                    box.parallel('link.delete', id, Link.url_id, Link.collection, function(err, aResult){
                        req.io.emit('link.deleted', { param:req.data, error:err } );
                    });
                }
            });
        },

        add:function(req){
            var url = req.data.value.trim(),
                token = ShortId.generate(),
                request_options = _.merge( {}, config.request, {uri:url, token: token })
                ;

            req.data.token = token;

            box.on('pageScrape.part', function(event_token, data ){
                req.io.emit('link.in-progress', {
                    url: url,
                    data:data,
                    token: token
                });
            });



            ping_a_link( request_options, function( err, found ){
                delete found.headers;
                if( err ){
                    err.url    = url;
                    err.result = 'error';
                    req.io.respond( err );
                    req.io.emit( 'link-not-found',  {param:req.data, error:err });
                }else{
                    req.io.respond( found );
                    request_options.token = token;
                    box.invoke( 'pageScrape', request_options, function(err, scrapResult){
                        if (err) {
                            throw err;
                        }else {
                            var  user = JSON.parse(req.session.passport.user)
                                , display = page_display( scrapResult, metaTagsToJoin )
                                , link2add = newLink( display, req.data.coll_id, user._id, user.screen_name, token  )
                                ;


                             // TODO save URL
                            // update url_id

                            box.invoke( 'url.add', scrapResult, function(err, URL ){
                                if( err ){
                                    req.io.emit( 'link-failure', {
                                        result:'error',
                                        param: req.data,
                                        error:err,
                                        explain:'Error saving URL'
                                    });
                                }else{
                                    link2add.url_id = URL._id;
                                    req.io.emit( 'link.ready', {
                                        result:'ok',
                                        param: req.data,
                                        link: link2add
                                    });

                                    box.parallel('link.add', link2add, function(err, result){
                                        var link = result[0];
                                        link.display.id = link._id;
                                        if( err ){
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
                                    });
                                }

                            });
 //                           box.utils.inspect(link2add, { showHidden: true, depth: null, colors:true })
                        }
                    });

                }
            });
        }
    });


    done(null, 'atach-paths: links.js attached'  ); //
});
