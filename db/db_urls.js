/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 02/08/13
 * Time: 15:48
 * To change this template use File | Settings | File Templates.
 */

var   box = require('../lib/box')
    , debug = require('debug')('linksTo:db:urls')
    , _ = require('lodash')
    ;


function new_url( url, link_id, extra ){
    var url2save = {
        state: 'fetching',
        url:  url
    };
    if( link_id ){
        url2save.links = [ link_id ];
    }
    return _.merge( url2save, extra );
}


function update_queued_links( id, display, cb ){

}


box.on('db.init', function( monk, Config, done ){
    var URLs = box.db.coll.urls = monk.get('urls');

    URLs.index('url',  { unique: true });
    URLs.index('original_url', {background:true, sparse:1} );
    URLs.index('links', {background:true});


// ================== updated =================

    box.on('url.add', function( url, newLink, extra, callback){
        URLs.insert( new_url(url, newLink._id, extra), function(err, insertedURL){
            if( err ){
                callback(err);
            }else if( newLink ){
                box.db.coll.links.updateById(
                    newLink._id,
                    { $set: { url_id:insertedURL._id }},
                    function( err, result ){
                        callback( err, insertedURL );
                    }
                );
            }else{
                callback(err, insertedURL);
            }
        });
    });

    // TODO: DO not delete URL thst is used in any active link
    box.on('url.delete', function( url_id, callback){
        URLs.remove( {_id: url_id || -1 }, { safe: false } );
    });

    box.on('url.get', function( id,  callback){
        URLs.findById(id, callback);
    });


    box.on('url.check-url', function( url, callback){
        if( !url ){
            process.nextTick(function() {
                callback(null, null);
            });
        }else{
            URLs.findOne( {url: url }, { fields:{links:false, page_id:false} }, callback  );
        }
    });

    box.on('url.check-url-and-original_url', function( url, callback){
        if( !url ){
            process.nextTick(function() {
                callback(null, null);
            });
        }else{
            URLs.findOne(
                {$or : [
                    {url: url },
                    {original_url:url}
                ]},
                { fields:{links:false, page_id:false} },
                function(err, oFound){
                    callback(err, oFound, url == oFound.url );
                }
            );
        }
    });

    box.on('url.update', function( id, oURL, callback ){
        URLs.updateById( id, { $set:oURL }, { safe: true }, callback );
    });

    box.on('url.update-display-and-queued-links', function( id, display, callback ){

        var oUpdate = {
            state: 'ready',
            display: display,
            updated: new Date()
        };

        URLs.updateById( id, oUpdate, function(err, n){
            if( err ){
                callback(err);
            }else{
                URLs.findById( id, function( err, oURL ){
                    if( err ){
                        callback(err);
                    }else{
                        box.db.coll.links.update(
                            {_id : oURL.links, state: 'queued' },
                            { $set:oUpdate},
                            { multi : true },
                            function( err, updated ){
                                callback(err, updated );
                            }
                        );
                    }
                });
            }
        });
    });




    box.on('url.add-link-ids', function( id, aLinks, returnUpdated, callback){
        URLs.updateById( id,
            {   $addToSet: {  "links" :aLinks } },
            function(err, u){
                if( returnUpdated ){
                    URLs.findById(id, callback );
                }else{
                    callback(err);
                }
            }
        );
    });

    // invoked
    box.on('url.add-link', function( url, newLink, callback){
        var link_id =  newLink._id;

        // fields:{ links:false }
        URLs.findOne(
            {$or : [
                {url: url },
                {original_url:url}
            ]},
            { fields:{links:false, page_id:false} },
            function(err, exisitng_URL ){
                if( exisitng_URL ){
                    URLs.update(
                        { _id: exisitng_URL._id, "links" :{ $ne : link_id }},
                        {  $push: {  "links" : link_id } },
                        function( err, number_of_updated ){
                            if( err ){
                                callback( err );
                            }else{
                                var oUpdate = {
                                    url_id  : exisitng_URL._id,
                                    state   : 'queued'
                                };
                                if(  exisitng_URL.state == 'ready' ){
                                    oUpdate.state   = 'ready';
                                    oUpdate.display = exisitng_URL.display;
                                }
                                box.db.coll.links.updateById(  link_id, { $set:oUpdate},
                                    function( err, result ){
                                        callback(err, exisitng_URL, true ); // true indicates it is an existing URL
                                    }
                                );
                            }
                        }
                    );
                }else{
                    URLs.insert( new_url(url, link_id), function(err, insertedURL){
                        if( err ){
                            callback( err );
                        }else{
                            box.db.coll.links.updateById(
                                link_id,
                                { $set: { url_id:insertedURL._id }},
                                function( err, result ){
                                    callback(err, insertedURL, false );
                                }
                            );
                        }
                    });
                }
            }
        );
    });

    process.nextTick(function() {
      done(null, 'db:URLs initialised.');
    });
});

/*

{
  ready: true,
  canonical:false,
  rawHTML:'',
  "url":"http://www.seoconsultants.com/meta-tags/dublin/#Creator",
  "body":{
        "images":[
            {
                "src":"http://www.seoconsultants.com/images/seo-consultants.png",
                "width":"370",
                "height":"40"
            },
        ],
            "h1":[
            "DCMI Dublin Core Metadata Initiative"
        ],
            "h2":[
            "DC Dublin Core META Tags",
            "Dublin Core Metadata Initiative References",
            "Where did the name Dublin Core originate?"
        ]
  },
  "head":{
        "title":"DC Dublin Core META Tags: DCMI Dublin Core Metadata Initiative",
            "fb":{},
        "og":{},
        "names":{
            "description":"The Dublin Core Metadata Initiative (DCMI) is an open forum engaged in the development of interoperable online metadata standards that support a broad range of purposes and business models.",
                "author":"Administrator"
        },
        "keywords":[
            "Dublin Core Metadata Initiative",
            "DCMI",
            "Dublin Core META Tags",
            "DC",
            "Dublin Core Metadata Element Set"
        ],
            "dc":{
            "title":"DC Dublin Core META Tags: DCMI Dublin Core Metadata Initiative",
                "creator":"Administrator",
                "subject":"DCMI; Dublin Core Metadata Initiative; DC META Tags",
                "description":"Examples of Dublin Core META Tags.",
                "publisher":"SEO Consultants Directory",
                "contributor":"DCMI Dublin Core Metadata Initiative",
                "date":"2004-01-01",
                "type":"Text",
                "format":"text/html",
                "identifier":"/meta-tags/dublin/",
                "source":"/meta-tags/",
                "language":"en",
                "relation":"/meta-tags/",
                "coverage":"World",
                "rights":"/legal/terms-of-use"
        },
        "links":{
            "favicon":{
                "href":"http://www.seoconsultants.com/images/favicon.ico"
            },
            "icon":{
                "href":"http://www.seoconsultants.com/images/favicon.gif",
                    "type":"image/gif"
            }
        }
    },
    "links":["51ff5dedc470e7f800000003"],
    "tags":[{"word":"seo", "count":21 }]
}

    */