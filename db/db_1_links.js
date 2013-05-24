/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../box.js')
    , debug = require('debug')('linksTo:db:links')

    ;

box.on('db.init', function( monk, Config, done ){
    var   settings = Config.db
        , common_config = Config.common
        , Links = monk.get('links')
        ;

    // Returns an array of the links for a collection

    box.on('collection.get', function( waterfall, callback){
        if( waterfall.collection && waterfall.collection.links && waterfall.collection.links.length ){
            var options = waterfall.options || { sort:[['updated', -1]]};
            Links.find( { _id :  { $in : waterfall.collection.links} }, options , function(err, found_links) {
                if( found_links ){
                    found_links.type = 'links-list';
                }
                waterfall.links = found_links;
                callback( err, waterfall );
            });
        }else{
            waterfall.links = [];
            waterfall.links.type = 'links-list';
            callback( null, waterfall );
        }
    });


    box.on('collection.get.links', function( collection, options, callback){
        if( collection && collection.links && collection.links.length ){
            options = options || { sort:[['updated', -1]]};
            Links.find( { _id :  { $in : collection.links} }, options , function(err, found_links) {
                callback( err, found_links );
            });
        }else{
            callback( null, [] );
        }
    });

    box.on('link.queue', function( oLink, collection_id, callback){
        oLink.collection = collection_id; //[ Links.id( collection_id ) ];
        Links.insert( oLink,  { safe: true }, callback );
    });

    box.on('link.added', function( oLink, callback){
    // for some reason I can not replace one link with other.
    // untill I fix it it will be replaced with delete the old and insert the new link
        Links.updateById( oLink._id, oLink,  callback );

//        Links.remove( {_id: oLink._id }) ;
//        delete oLink._id;

//        Links.insert( oLink,  { safe: true }, callback );

    });


    box.on('link.delete', function(link_id, coll_id, callback){
        if( !link_id ){
            throw "Link ID expected!";
        }else{
            Links.remove( {_id: link_id }, callback );
        }
    });
    done(null, 'db:links initialised.');
});