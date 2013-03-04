/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 03/03/13
 * Time: 23:25
 * To change this template use File | Settings | File Templates.
 */

var ShortId  = require('shortid').seed(96715)
    , async = require('async')
    , mongo = require('mongodb')
    , connectMongoDb = require('connect-mongodb')
    , _ = require('underscore')

    , db
    , connection
    , settings
    ;



function ShorterID(){
    return  ShortId.generate().substr(0, settings.db.short_id_length);
}

exports.init = function( configDB ){
    settings = configDB;

    this.objectID = mongo.ObjectID;
    this.connection = connection = new mongo.Db(
        settings.name,
        new mongo.Server( settings.host, settings.port, {j:false, w:'majority', fsync:0}),
        {} // native_parser:false
    );
    this.mongoStore     = new connectMongoDb({ db: connection });
    this.shorterID =  function ShorterID(){
        return  ShortId.generate().substr(0, settings.db.short_id_length);
    };
    this.find = function(name, query, limit, callback) {
        db.collection(name).find(query).sort({_id: -1}).limit(limit).toArray(callback);
    };
    this.findOne = function(name, query, callback) {
        db.collection(name).findOne(query, callback);
    };
    this.insert = function(name, items, callback) {
        db.collection(name).insert(items, callback);
    };
    this.insertOne = function(name, item, callback) {
        module.exports.insert(name, item, function(err, items) {
            callback(err, items[0]);
        });
    };
    this.open = function(callback) {
        db.open(callback);
    };

    return this;
}
