/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../lib/box')
    , debug = require('debug')('linksTo:db:page')

    ;

box.on('db.init', function( monk, Config, done ){
    var   settings = Config.db
        , common_config = Config.common
        , Pages = box.db.coll.pages = monk.get('pages')
        ;

    Pages.index('url'); // ,  { unique: true }


    box.on('page.save', function( HTML, URL, canonicalURL, url_id,  callback){
        var page =          {
                url_id: url_id,
                updated : new Date(),
                html : HTML,
                urls:[],
                url : URL
            };
        if( canonicalURL ){
            page.url = canonicalURL;
            page.canonical = true;
            page.urls = [URL]
        }

        Pages.insert( page,  function( err, added_page){
                if( err ){
                    callback(err);
                }else{
                    box.db.coll.urls.updateById(
                        url_id,
                        { $set:{ page_id: added_page._id, state:'saved'}},
                        { safe: true },
                        function(err2, r ){
                           callback(err2, added_page);
                        }
                    );
                }
            }
        );
    });

    box.on('page.get', function( id,  callback){
        Pages.findById(id, callback);
    });

    box.on('page.find', function( url, canonicalURL, callback){
        var condition = null;
        if( url && canonicalURL ){
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

    box.utils.later( done, null, 'db:page initialised.');
});