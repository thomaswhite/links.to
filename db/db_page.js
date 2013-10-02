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

    box.on('page.save', function( sBody, uri, callback){
        Pages.insert(  {
                body : sBody,
                uri: uri,
                updated : new Date(),
                state:'none'
            },
            callback
        );
    });
    process.nextTick(function() {
        done(null, 'db:page initialised.');
    });
});