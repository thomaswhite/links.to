/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../lib/box')
    , debug = require('debug')('linksTo:db:page')
    , _ = require('lodash')
    ;

box.on('db.init', function(  Config, done ){
    var   settings = Config.db
        , common_config = Config.common
        , Pages = box.db.coll.pages = box.db.monk.get('pages')
        ;

    Pages.index('url'); // ,  { unique: true }

    box.on('page.save', function( o, URL, canonicalURL, url_id ){
        var page = _.merge( {
                url_id: url_id,
                updated : new Date(),
                urls:[],
                url : URL
              },
              o
           )
        ;

        if( canonicalURL ){
            page.url = canonicalURL;
            page.canonical = true;
            page.urls = [URL]
        }

        Pages.insert( page,  function( err, added_page){
                if( err ){
                    debug( 'page:save', err );
                }else{
                    box.db.coll.urls.updateById(
                        url_id,
                        { $set:{ page_id: added_page._id }},
                        { safe: true }
                    );
                }
            }
        );
    });

    box.on('page.update', function( page_id, o, URL, canonicalURL, callback){
        var page = _.merge( { updated : new Date(),  url : URL }, o );
        if( canonicalURL ){
            page.url = canonicalURL;
            page.canonical = true;
            page.urls = [URL];
        }
        Pages.updateById( page_id, {$set:page}, callback );
    });

    box.on('page.get', function( id,  callback){
        Pages.findById(id, callback);
    });

    box.on('page.find', function( url, canonicalURL, callback){
        var condition = null;
        if( !url && !canonicalURL){
            box.utils.later( callback );
            return;
        }else if( url && canonicalURL ){
            condition =  {$or : [
                {url: url },
                {url:canonicalURL}
            ]};
        }else if( url ){
            condition =  { url: url };
        }else if( canonicalURL ){
            condition =  { url: canonicalURL };
        }
        Pages.findOne( condition,  callback  ); //  { fields:{url:false} },
    });

    box.utils.later( done, null, 'db:page');
});