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

    box.on('page.save', function( HTML, uri, url_id,  callback){
        Pages.insert(  {
                url_id: url_id,
                uri: uri,
                updated : new Date(),
                html : HTML
            },
            function( err, added_page){
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

    process.nextTick(function() {
        done(null, 'db:page initialised.');
    });
});