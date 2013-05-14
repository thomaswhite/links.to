/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../box.js')
    , debug = require('debug')('linksTo:db:collections')
    ;


box.on('db.init', function( monk, Config, done ){
    var   settings = Config.db
        , common_config = Config.common
        , Collections = monk.get('collections')
        ;

    box.on('collection.add', function( oColl, callback){
        Collections.insert( oColl,  { safe: true }, callback);
    });

    box.on('collection.get', function( waterfall, callback){
        Collections.findById(waterfall.coll_id, function(err, found_coll ){
            if( found_coll) {
                found_coll.type = "collection";
            }
            waterfall.collection  = found_coll;
            callback(err, waterfall);
        });
    });

    box.on('collection.get.one', function( coll_id, callback){
        Collections.findById(coll_id, function(err, found_coll ){
            if( found_coll) {
                found_coll.type = "collection";
            }
            callback(err, found_coll);
        });
    });


    box.on('collection.delete', function(coll_id, callback){
        if( !coll_id ){
            throw "Collection ID expected!";
        }else{
            // TODO move existing links into _unassigned_links collection that every user has
            Collections.remove( {_id: coll_id }, callback );
        }
    });


    box.on('collection.update', function(coll_id, toUpdate, callback){
        Collections.updateById( coll_id, {$set: toUpdate }, callback );
    });

    box.on('collection.eip', function(id, field, value, callback){
        var o = {};
        o[field] = value;
        Collections.updateById( coll_id, {$set: o }, callback );
    });

    box.on('collections.list', function( filter, limit, sort, callback){
        Collections.find( filter || {}, {limit:limit || 64, sort:sort || []}, function(err, result){
            if( result ){
                result.type = 'collections-list';
            }
            callback(err, result);
        });
    });

    box.on('link.queued', function( newLink, callback){
        var link_id =  newLink._id;
        Collections.update(
            { _id: newLink.collection, "links" :{ $ne : link_id }},
            {  $push: {  "links" : link_id } },
            function(err, result){
                callback(err, result);
            }

        );
    });
    box.on('link.delete', function(link_id, coll_id, callback){
        Collections.updateById(
            coll_id,
            {  $pull: {  "links" : Collections.id(link_id) } },
            callback
        );
    });
    box.on('link.tag.updated', function( Tag, link_id, callback){

    });

/*
    this.not_in_use_collections ={

        update: function( collectionID, updated, callback ){
            collections_collection.update( {_id: ObjectID(collectionID) }, updated,  function(err, collection) {
                callback(err, err ? null : collection[0] );
            });
        },

        eip: function( collectionID, field_name, new_value ){
            var updated = {$set:{ updated : new Date()}};
            updated.$set[ field_name ] = new_value;
            collections_collection.update( {_id: ObjectID(collectionID) }, updated );
        },
        eip2: function( collectionShortID, field_name, new_value ){
            var updated = {$set:{ updated : new Date()}};
            updated.$set[ field_name ] = new_value;
            collections_collection.update( { shortID: collectionShortID  }, updated );
        }
    };
 */

    done(null, 'db:collections initialised.');
});
