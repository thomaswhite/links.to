/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 02/08/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../box.js')
    , debug = require('debug')('linksTo:db:urls')
    ;

box.on('db.init', function( monk, Config, done ){
    var URLs = box.db.coll.urls = monk.get('urls');

    box.on('url.add', function( oURL, callback){
        URLs.insert( oURL,  { safe: true }, callback);
    });

    // TODO: DO not delete URL thst is used in any active link
    box.on('url.delete', function( url_id, callback){
         URLs.remove( {_id: url_id || 'missing' }, callback );
    });

    box.on('link.added', function( newLink, callback){
        var link_id =  newLink._id;
        URLs.update(
            { _id: newLink.url_id, "links" :{ $ne : link_id }},
            {  $push: {  "links" : link_id } },
            callback
        );
    });

    box.on('link.delete', function(link_id, url_id, coll_id, callback){
        URLs.updateById(
            url_id,
            {  $pull: {  "links" : URLs.id(link_id) } },
            callback
        );
    });

    done(null, 'db:URLs initialised.');
});