/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../lib/box')
    , debug = require('debug')('linksTo:db:links')
    , _ = require('lodash')
    , ObjectID = null
    ;

/**
 *
 * @param url
 * @param collection_id
 * @param  param { title, description, owner_id, owner_screen_name, add_date, last_modified }
 * @returns {{collection_id: *, short_id: (box.utils.ShorterID|*), url_id: number, owner_id: *, updated: (*|Date), created: (*|Date), owner_screen_name: *, display: {title: (HTMLElement|*), title_type: string, description: (HTMLElement|*|string), summary: string, summary_style: string, imagePos: number, thumbnail: string, url: *, tags: Array}}}
 */
function new_link( url, collection_id, param, extra  ){

    var L =  {
        collection_id: collection_id,
        short_id: box.utils.ShorterID(),
        url_id: param.url_id || null,
        owner_id: param.owner_id,
        owner_screen_name: param.owner_screen_name || '',
        updated: param.last_modified || param.add_date || new Date(),
        created: param.add_date || new Date(),
        origin: param.origin || 'interactive',
        state:'new',
        url:url,
        display:{
            title: param.title || url,
            title_type:'imported',
            description: param.description || '',
            summary:'',
            summary_style:'',
            imagePos:-1,
            thumbnail:"",
            url: url,
            tags:[]
        }
    };
    return _.merge( L, extra );
}

//
box.on('db.init', function(  Config, done ){
    var   settings = Config.db
        , common_config = Config.common
        , Links = box.db.coll.links = box.db.monk.get('links')
        ;
    Links.options.multi = true;
    Links.ensureIndex( { updated: -1, created: -1 }, {background:true} ); // coll_id ?
    ObjectID = Links.col.ObjectID;
    // Returns an array of the links for a collection

    box.on('link.new', new_link); // to be invoked

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
/*
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
*/
    box.on('link.delete', function(link_id, url_id, coll_id, callback){
        if( !link_id ){
            throw "Link ID expected!";
        }else{
            Links.remove( {_id: link_id }, callback );
        }
    });

    // ================================== updated  =======================================

    box.on('link.get', function( id,  callback){
        Links.findById(id, callback);
    });

    box.on('link.update-display', function( link_id, display, callback){
        Links.updateById(link_id,  { $set:{ display: display } }, {safe:true}, function(err, a){
            if( err ){
                callback(err);
            }else{
                Links.findById(link_id, callback );
            }
        });
    });

    box.on('link.update', function( link_id, oUpdated, get_updated, callback){
        Links.updateById(link_id,  { $set:oUpdated }, {safe:true}, function(err, a){
            if( err ){
                callback(err);
            }else{
                if( get_updated ){
                    Links.findById(link_id, callback );
                }else{
                    callback(null);
                }
            }
        });
    });

    box.on('link.add2', function( oLink, callback){
        var cb = callback;
        oLink.collection_id = Links.col.ObjectID( oLink.collection_id );
        oLink.url_id = oLink.collection_id; // reserve space in the db for an ID

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
                         { safe: true },
                         function(err){
                             if( err){
                                 callback(err, 'updating url');
                             }else{
                                 box.db.coll.urls.findById(Link.url_id, function(err, oURL){
                                     if( oURL && !oURL.links.length && !settings.collections.urls.orphan_urls ){
                                        box.db.coll.pages.remove({_id:oURL.page_id}, {safe:false});
                                        box.db.coll.urls.remove( {_id:oURL._id},     {safe:false});
                                    }
                                    Links.remove( {_id: link_id },  { safe: false } );
                                    callback( null, true  );
                                 });
                             }
                         }
                     );
                 }
            });
        }
    });


    function sID_2_oID(aIDs){
        for(var id, i=0; i < aIDs.length; i++){
            id = aIDs[i];
            if( 'string' == typeof id && (id.length == 12 || id.length == 24) ){
                aIDs[i] = ObjectID( id );
            }
        }
        return aIDs;
    }

    box.on('link.ids-for-fetch', function( aIDs, callback){
        aIDs = sID_2_oID(aIDs);
        Links.find( { _id :  { $in :aIDs } },
            { fields:{_id:true, url_id:true, state:true, url:true }},
            callback
        );
    });

    box.on('link.mark-for-refresh', function( aIDs, refresh, callback){
        aIDs = sID_2_oID(aIDs);
        Links.update( { _id :  { $in :aIDs } },
            {$set:{ state: refresh == 'hard' ? 'hard-refresh' : 'refresh'}},
            callback
        );
    });

    box.on('link.set-state', function( id, state, callback ){
        if( callback ){
            Links.updateById( id, { $set:{state:state }}, callback);
        }else{
            Links.updateById( id, { $set:{state:state }}, { safe: false });
        }
    });

    box.on('link.update-fast', function( id, o ){
        Links.updateById( id, { $set:o }, { safe: false } );
    });


    box.utils.later( done, null, 'db:links');
});