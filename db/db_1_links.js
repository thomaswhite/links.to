/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../modules/box.js')
    , debug = require('debug')('linksTo:db:links')

    ;

box.on('db.init', function( monk, Config, done ){
    var   settings = Config.db
        , common_config = Config.common
        , Links = box.db.coll.links = monk.get('links')
        ;

    Links.ensureIndex( { updated: -1, created: -1 }, {background:true} ); // coll_id ?

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
            options = { sort:{'updated': -1, created:-1}, fields:{head:false, type:false, body:false, tags:false} };
            Links.find( { _id :  { $in : collection.links} }, options, callback);
//          Links.find( { _id :  { $in : collection.links}, fields:{head:false, type:false, body:false,  tags:false}  }, options , callback);
        }else{
            callback( null, [] );
        }
    });

    box.on('link.add', function( oLink, callback){
        var cb = callback;
        Links.insert( oLink,  { safe: true }, function( err, addedLink){
            if( err ){
                callback(err);
            }else{
                box.parallel('link.added',  addedLink, function(err, result){
                    callback(err, addedLink);
                });
            }
        });
    });

    box.on('link.delete', function(link_id, url_id, coll_id, callback){
        if( !link_id ){
            throw "Link ID expected!";
        }else{
            Links.remove( {_id: link_id }, callback );
        }
    });

    // ================================== updated  =======================================

    box.on('link.add2', function( oLink, callback){
        var cb = callback;
        oLink.collection_id =  Links.col.ObjectID( oLink.collection_id );

        Links.insert( oLink,  { safe: true }, function( err, addedLink){
            if( err ){
                callback(err);
            }else{
                box.db.coll.collections.update(
                    { _id: addedLink.collection_id, "links" :{ $ne : addedLink._id  }},
                    {  $push: {  "links" : addedLink._id },  $set:{updated: new Date()} },
                    function(err2, result){
                        callback(err2, addedLink);
                    }
                );
            }
        });
    });

    box.on('link.delete2', function(link_id, callback){
        if( !link_id ){
            throw "Link ID expected!";
        }else{
            Links.findById( link_id, function(err, Link){
                 if(err){
                     callback(err);
                 }else if( !Link ){
                     callback(null, false );
                 }else {
                     box.db.coll.collections.updateById(
                         Link.collection_id,
                         {  $pull: {  "links" : Link._id },  $set:{updated: new Date()}},
                         { safe: false }
                     );
                     box.db.coll.urls.updateById(
                         Link.url_id,
                         {  $pull: {  links : Link._id }  },
                         { safe: false }
                     );
                     Links.remove( {_id: link_id },  { safe: false } );
                     callback( null, true  );
                 }
            });
        }
    });


    process.nextTick(function() {
        done(null, 'db:links initialised.');
    });
});