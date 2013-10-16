/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 19/04/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../lib/box')
    , debug = require('debug')('linksTo:db:Imports')
    ;



box.on('db.init', function( monk, Config, done ){
    var   settings = Config.db
        , common_config = Config.common
        , Imports = box.db.coll.Imports = monk.get('Imports')
        ;
    Imports.options.multi = true;
    Imports.ensureIndex( { excluded:1, importID: 1, parent:1 } ); // , {background:true}, {sparse:1}
    Imports.ensureIndex( { folder: 1,  importID: 1, parent:1 }, {sparse:1} ); // , {background:true}


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
                        Imports.find(
                          {importID: found.importID, parent: found.folder.full_path },
                          { sort:{ folder:-1, add_date:-1,  last_modified:-1 }},
                          function(err2, nodes ){
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

    box.on('import.folder-content', function( import_id,  parent_path, callback){
        Imports.find(
            {importID: Imports.col.ObjectID(import_id), parent:parent_path,  excluded: false},
            { sort:{ add_date:-1,  last_modified:-1 }},
            callback
        );
    });

// --------------------------------------------------------------------- used ---


    box.on('import.add', function( oColl, callback){
        Imports.insert( oColl,  { safe: true }, callback);
    });

    box.on('import.add-nodes', function( importNodes, callback){
        Imports.insert( importNodes,  { safe: false }, callback );
    });

    box.on('import.get-with-root-level-folders', function( id, callback){
        Imports.findById(id, function(err, import_found ){
            Imports.find({importID: import_found._id, parent:'/'},  { sort:{ folder:-1, add_date:-1,  last_modified:-1 }}, function(err, result){
                import_found.root_nodes =  result;
                callback(err, import_found);
            });
        });
    });

    box.on('import.get', function( id, callback){
        Imports.findById(id, callback );
    });

    box.on('import.mark-as-imported', function( oFolder, callback){
        Imports.updateById(oFolder._id, {$set:{imported:true}}, {safe:false} );
        Imports.updateById(oFolder.importID, {$inc:{foldersImported:1}}, {safe:false} );
    });


    box.on('import.folder_exclude', function(id, excluded, callback){
        if( !id ){
            throw "Import ID expected!";
        }else{
            Imports.updateById( id, {$set: { excluded:excluded} }, function(err, updated ){
                if( err ){
                    callback(err);
                }else{
                    Imports.findById( id, function(err, folder ){
                        Imports.update(
                            { importID:folder.importID,  parent: new RegExp('^' + folder.folder.full_path, 'i')},
                            {$set: { excluded:excluded} },
                            {multi:true},
                            function(err2, excluded_updated){
                                Imports.count({ importID:folder.importID, excluded:true, folder: { $exists: true} }, function (err3, folders_excluded) {
                                    Imports.count({ importID:folder.importID, excluded:true, folder: { $exists: false} }, function (err4, links_excluded) {
                                        Imports.updateById(folder.importID, {$set:{foldersExcluded:folders_excluded, linksExcluded:links_excluded}}, function(err5, resutl){
                                            Imports.findById(folder.importID, function(err6, import_updated ){
                                                callback(err2, import_updated, folder );
                                            });
                                        });
                                    });
                                });
                            }
                        );
                    });
                }
            });
        }
    });

    box.on('import.folders', function( import_id,  callback){
        Imports.find(
            {importID: Imports.col.ObjectID(import_id), excluded: false, folder: { $exists: true} },
            { sort:{ parent:1, add_date:-1,  last_modified:-1 }},
            callback
        );
    });


    box.on('improt.links-in-folder', function( import_id, parent, callback){
        Imports.find(
            {importID: Imports.col.ObjectID(import_id), parent: parent,  folder: { $exists: false} },
            { sort:{ last_modified:-1, add_date:-1}},
            callback
        );
    });

    process.nextTick(function() {
        done(null, 'db:Imports initialised.');
    });
});

