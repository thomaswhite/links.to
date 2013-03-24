/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 19/07/12
 * Time: 21:16
 * To change this template use File | Settings | File Templates.
 */

var URL = require('url');
var logger  = require('nlogger').logger(module);
// var sanitize = require('validator').sanitize;
var scraper  = require('scraper');
var async = require('async');
var utils    = require('./tw-utils');
var _ = require('underscore');
var util = require('util');
var keyWords = require('./keyWords');

var context;


function scrapIt(url, callback, callBackParam ){
    var tip = {
        meta:{},
        url:url,
        title:'',
        description:'',
        summary:'',
        h1:'',
        img:[],
        tags:{},
        keyword:{},
        imagePos:0
      };

    scraper( url, function(err, $) {
        if (err) {
            err.url = url;
            err.bad = true;
            callback( null, err );
            return;
        }
        var oURL = URL.parse(url),
            baseURL = URL.format(_.pick(oURL, 'protocol', 'host', 'port')),
            head = $('head'),
            body = $('body');

        tip.title = $(head.find('title')).text() || $(body.find('h1').text());

        // images
        $('img').each(function(i, elem) {
            var a, src = elem.attribs.src,
                h   = elem.attribs.height ? parseInt( elem.attribs.height, 10) : 0;
            src = typeof src === 'string' ? URL.resolve( baseURL, src): null;

            if( h > 31 && src && !_.find(tip.img, function(oImg){return oImg.src === src; })  ){
               delete elem.attribs.id;
               delete elem.attribs['class'];
               delete elem.attribs.border;
               for( a in elem.attribs){
                 if( !elem.attribs[a] ){
                   delete elem.attribs[a];
                 }
               }

               tip.img.push( elem.attribs );
          }

        });

        $( 'link[rel*="icon"]').each( function(i,elem){
            tip.favicon = URL.resolve( baseURL, elem.attribs.href );
        });

        var currentType = '';
        head.find('meta[property^="og:"]').each(function(i, item ){
             var value = item.attribs.content.trim(),
                 aP = item.attribs.property.split(':'),
                 dimmy = aP.shift(),
                 type = aP.shift(),
                 isMain = 0 === aP.length,
                 sameMainPart = currentType === type,
                 cenBeSequence =  type === 'image' || type === 'video' || type === 'audio' || type === 'music' || type === 'article' || type === 'book' || type === 'profile';

          if( type === 'keywords' ){
            value = value.split(',');
            type = 'tags';
          }

          if( type.indexOf('.') !== -1 ){
                 console.error("Type can not contain '.' - ", item.attribs.property );
             }else if( isMain ){
                 if( currentType === type){ currentType = type;  }

                 if( !tip.meta[ type ] ){
                     // new
                     if( cenBeSequence ){
                         tip.meta[ type ] = [{url:value}];
                     }else{
                        tip.meta[ type ] = value;
                     }
                 }else if (tip.meta[type].push){
                     // array
                     tip.meta[type].push( {url:value });
                 }else{
                     // string. convert into an array
                     tip.meta[type] = [tip.meta[type], value ];
                 }
             }else{
                // this is a structured property og:image:type
                if(  type === currentType ){ // check just in case
                    if( cenBeSequence ){
                        // add a property og:image:TYPE to the last element in the array
                        tip.meta[ type ][ tip.meta[ type ].length -1 ][aP[0]] = value;
                    }else {
                        tip.meta[ type ][ aP[0] ] = value;
                    }
                }else{
                    // error.
                    // og:image:type without og:image before
                        console.log('Metatag out of order:', item.attribs.property );
                    }
             }
       });

 //       $('meta[property^=fb]').each(function(i, item ){
 //       });

        var lastPropertyName = '';
        head.find('meta[name]').each(function(i, elem) {
            var i, name = elem.attribs.name;
            if( name.indexOf('.') === -1 && elem.attribs && elem.attribs.content ){
                switch( elem.attribs.name ){
                    case 'google-site-verification':
                    case 'robots':
                    case 'generator':
                    case 'http-equiv':
                        break;

                    case 'keywords':
                      var tags = unescape(elem.attribs.content.trim()).split(',');
                      for(  i=0; i < tags.length; i++){
                         tip.keyword[tags[i].trim()] = 0;
                      }

                    case 'author':
                    case 'description':
                        tip[name] = unescape(elem.attribs.content.trim());
                        break;

                    default:
                        tip.meta[name] = unescape(elem.attribs.content.trim());
                }
            }
        });

        tip.h1 = $('h1').eq(0).text();
//        tip.summary = $('p').text().substr(0,750).replace(/(\s)+/,' ').trim();
//        tip.summary = tip.summary.substr(0, tip.summary.lastIndexOf('.')+1);

        var i, buffer = '', Ps = body.find('p'), aP = Ps.toArray();
        for( i=0; i< aP.length; i++ ){
            buffer += $(aP[i]).text().replace(/(\n+|\t+|\s\s+)/g, ' ').trim();
            if( buffer.length > 500 ){
              break;
            }
        }
        buffer = buffer.substr(0,500);
        tip.summary = buffer.substr(0, buffer.lastIndexOf('.')+1);
        tip.tags = keyWords.makeList( body.find('p, ul, h1').text(), tip.keyword, 8, 5 );
        console.log( '\tip:%j\n', tip );
        callback(null, tip, callBackParam );
    });
}

function wrapURL_for_scraping( url ){
    return function(callback){
        scrapIt( url, callback);
    };
}




module.exports = {
    init: function ( Context, init_callback  ){
        context = Context;
        var app = Context.app;



        app.get('/link/probe', function(req,res){
            var url =  req.query.url;
            scraper( url, function(err, $) {
                if (err) {
                    res.send('<p>Page not foun:'+ url +  '</p>', 404);
                }
                var p = url.split('/');
                if( p[p.length-1].indexOf('.htm') > -1 ){
                    p[p.length-1] = null;
                }

                $('html').prepend('<base href="' + p.join('/')  + '">');
                res.writeHead(200, {"Content-Type": "text/html"});
                res.write( $.html().split('nobreakage').join('script') );
                res.end();


            });
        });


        app.get('/link/delete/:id/:coll?', function(req, res) {
            //var referer = req.headers.referer;
            // TODO: check permission to delete
            context.db.links.deleteOne(req.params.id, req.params.coll);
            res.redirect(  '/coll/' + req.params.coll );
        });

        app.get('/link/:id/edit/:coll?', function(req, res) {
            //var owner = req.user && req.user._id ==  results[0].userID;
            context.db.links.findOne(req.params.id, function(err, link) {
                if (err || (!link)){
                    context.notFound(res);
                    return;
                }
                logger.info( link );
                context.Page2(req, res, 'link-edit', {
                    coll_id: req.params.coll || req.query.coll,
                    canEdit: true, //owner,
                    link: link
                });
            });
        });
        app.post('/link/:id/edit/:coll?', function(req, res) {
            var param =  _.pick(req.body, 'title', 'description', 'p', 'meta', 'url', 'author');
            var prm  = utils.parseParam( req.body );
            var referer = req.headers.referer;

            prm.description = prm.description ? prm.description.replace(/(\s)+/,' ').trim() : '';
            prm.summary = prm.summary ? prm.summary.replace(/(\s)+/,' ').trim() : '';

            context.db.links.update( req.params.id, prm, function(err, data){
                if(err){
                    throw err;
                }else{
                    res.redirect( '/coll/' + req.params.coll );
                }
            });
        });
/*
        app.get('/link/:id/:coll?', function(req, res) {
            context.db.links.findOne(req.params.id, function(err, tip) {
                if (err || (!tip)){
                    context.notFound(res);
                    return;
                }
                context.Page2(req, res, 'web-link', {slots:{
                    coll_id: req.params.coll || req.query.coll,
                    title: 'Link "' + tip.title + '"',
                    tips: [tip]
                }});
            });
        });

*/
        app.post('/link/new/:coll?', function(req, res) {
          var referer = req.headers.referer;
          var post = req.body.links;
            //post.body = sanitize(post.body).xss().trim();
          var urls = post.replace(/\r/g,'').split(/\n/); // http://beckism.com/2010/09/splitting-lines-javascript/

          scrapIt( req.body.links, function(error, tip ){
            tip.userID = req.user._id;
            tip.user_screen_name =  req.user.screen_name;

            console.log( '\n================================  New Link:\n',  util.inspect(tip,true, 5, true)  );
            context.db.links.addOne( tip, req.body.add2coll, function(error, data){
              res.redirect(  referer );
            });
          });
        });


      app.get('/link/refresh/:id', function(req, res) {
        var referer = req.headers.referer;
        context.db.links.findOne(req.params.id, function(err, link) {
          if (err || (!link)){
            context.notFound(res);
            return;
          }
          scrapIt( link.url, function(error, tip, orginalLink ){
            tip.userID = req.user._id;
            tip.user_screen_name =  req.user.screen_name;

            console.log( '\n================================ Refreshed link:\n',  util.inspect(tip,true, 5, true)  );
            for( var i in tip ){
              var type = typeof tip[i];
              if( type != 'string' || !tip[i] ) continue;
              if( tip[i] ===  orginalLink[i] ){
                delete tip[i];
              }
            }
            context.db.links.update( '' + orginalLink._id, tip, function(err, Link){
              res.redirect(  referer );
            });
          }, link);
        } );

      });

      app.post('/link/:id/eip', function(req, res) {
        var referer = req.headers.referer,
            value = req.param('value'),
            name  = req.param('name');

        // TODO: verify parameters - name, value, security token
        if( true ){
          context.db.links.eip( req.params.id, name, value, function ( error, data){
              var dummy = 1;
          });
          res.writeHead(200, {"Content-Type": "application/json"});
          res.write( JSON.stringify({ok:true, value: value, name:name }) );
          res.end();
        }
      });


        init_callback (null);
    }
};