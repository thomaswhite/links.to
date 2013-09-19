/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../modules/box.js')
    , debug = require('debug')('linksTo:db:tags')

    ;

box.on('db.init', function( monk, Config, done ){
    var   settings = Config.db
        , common_config = Config.common
        , Tags = box.db.coll.tags = monk.get('tags')
        , Dummy = monk.get('dummy')
        ;

    // Returns an array of the links for a collection

    Tags.ensureIndex( { coll_ID:1 }); // , {background:true}

    box.on('link.added', function( newLink, callback){
        var link_id =  newLink._id,
            newTags = [];

        if( newLink.tags ){
            box.utils.async.forEach(newLink.tags, function(tag, cb){
                    Tags.insert(
                        {
                            tag: tag.word,
                            link_ID: newLink._id,
                            coll_ID: Dummy.id(newLink.collection),
                            count: tag.count,
                            url:   newLink.url
                        },
                        function(err, newTag ){
                            //debug("Tag added:\n", app.locals.inspect(newTag) );
                            newTags.push( newTag );
                            cb(null);
                        }
                    );
                },
                function(err){
                    box.parallel('tags.added',  newTags, function(err, result){
                        callback(null);
                    });
                }
            );
        }else{
            callback(null, []);
        }
    });

    box.on('link.delete', function(link_id, url_id, coll_id, callback){
        if( !link_id ){
            throw "Link ID expected!";
        }else{
            Tags.remove( { link_ID: link_id }, callback );
        }
    });

    process.nextTick(function() {
        done(null, 'db:tags initialised.');
    });
});