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

    box.on('import.added', function( importNodes, callback){
        Imports.insert( importNodes,  { safe: false }, callback );
    });

    box.on('import.get.one', function( id, callback){
        Imports.findById(id, function(err, import_found ){
            Imports.find({importID: import_found._id, parent:'/'},  { sort:{ created:-1}}, function(err, result){
                import_found.root_nodes =  result;
                callback(err, import_found);
            });
        });
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


    box.on('import.delete', function(id, callback){
        if( !id ){
            throw "Import ID expected!";
        }else{
            Imports.findById(id, function(err, import_found ){
                Imports.remove( {importID: import_found._id });
                Imports.remove( {_id: id }, callback );
            });
        }
    });

    box.on('import.folder_content', function(id, callback){
        if( !id ){
            throw "Import ID expected!";
        }else{
            Imports.findById(id, function(err, found ){
                if( err ){
                    callback(err);
                }else{
                    if( found.folder.this_folders || found.folder.this_links ){
                        Imports.find( {importID: found.importID, parent: found.folder.full_path }, function(err2, nodes ){
                            if( err2 ){
                                callback(err2);
                            }else{
                                callback(null,{ nodes:nodes || [] });
                            }
                        });
                    }else{
                        callback(null,{ nodes:[] });
                    }
                }
            });
        }
    });



    box.on('_import.eip', function(id, field, value, callback){
        var o = {};
        o[field] = value;
        Imports.updateById( coll_id, {$set: o }, callback );
    });

    box.on('imports.list', function( filter, limit, sort, callback){
        Imports.find( filter , {limit:limit || 64, sort:sort || {created:-1}}, function(err, result){
            if( result ){
                result.type = 'imports-list';
            }
            callback(err, result);
        });
    });




    done(null, 'db:Imports initialised.');
});

