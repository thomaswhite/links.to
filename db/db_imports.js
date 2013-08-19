/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../box.js')
    , debug = require('debug')('linksTo:db:Imports')
    ;



box.on('db.init', function( monk, Config, done ){
    var   settings = Config.db
        , common_config = Config.common
        , Imports = box.db.coll.Imports = monk.get('Imports')
        ;

    box.on('import.add', function( oColl, callback){
        Imports.insert( oColl,  { safe: true }, callback);
    });

    box.on('import.get', function( waterfall, callback){
        Imports.findById(waterfall.coll_id, function(err, found_coll ){
            if( found_coll) {
                found_coll.type = "collection";
            }
            waterfall.collection  = found_coll;
            callback(err, waterfall);
        });
    });

    box.on('import.get.one', function( coll_id, callback){
        Imports.findById(coll_id, function(err, found_coll ){
            if( err || !found_coll) {
                callback(err, found_coll);
            }else{
                found_coll.type = "collection";
                box.emit( 'import.get.links', found_coll, {}, function(err2, links){
                    box.utils.formatUpdated( links );
                    found_coll.links = links;
                    callback(err2, found_coll);

                });
            }
        });
    });

    box.on('import.delete', function(coll_id, callback){
        if( !coll_id ){
            throw "Collection ID expected!";
        }else{
            // TODO move existing links into _unassigned_links collection that every user has
            Imports.remove( {_id: coll_id }, callback );
        }
    });


    box.on('import.update', function(coll_id, toUpdate, callback){
        Imports.updateById( coll_id, {$set: toUpdate }, callback );
    });

    box.on('_import.eip', function(id, field, value, callback){
        var o = {};
        o[field] = value;
        Imports.updateById( coll_id, {$set: o }, callback );
    });

    box.on('imports.list', function( filter, limit, sort, callback){
        Imports.find( filter , {limit:limit || 64, sort:sort || {updated:-1, created:-1}}, function(err, result){
            if( result ){
                result.type = 'imports-list';
            }
            callback(err, result);
        });
    });

    box.on('_link.added', function( newLink, callback){
        var link_id =  newLink._id;
        Imports.update(
            { _id: newLink.collection, "links" :{ $ne : link_id }},
            {  $push: {  "links" : link_id } },
            // TODO: set new date for .updated
            function(err, result){
                callback(err, result);
            }
        );
    });

    box.on('_link.delete', function(link_id, url_id, coll_id, callback){
        Imports.updateById(
            coll_id,
            {  $pull: {  "links" : Imports.id(link_id) } },
            callback
        );
    });

    box.on('link.tag.updated', function( Tag, link_id, callback){
       callback(null,1);
    });



    done(null, 'db:Imports initialised.');
});

