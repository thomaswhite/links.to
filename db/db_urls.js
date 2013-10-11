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
        state: 'none',
        canonical:false,
        page_id:link_id,  // just a placeholder
        url:  url,
        head: [],
        body:[],
        tags:[],
        links:[]
    };
    if( link_id ){
        url2save.links.push( link_id );
    }
    return _.merge( url2save, extra );

}

box.on('db.init', function( monk, Config, done ){
    var URLs = box.db.coll.urls = monk.get('urls');

    URLs.index('url',  { unique: true });
    URLs.index('links', {background:true});

    // TODO: DO not delete URL thst is used in any active link
    box.on('url.delete', function( url_id, callback){
         URLs.remove( {_id: url_id || 'missing' }, { safe: false } );
    });

// ================== updated =================

    box.on('url.get', function( id,  callback){
        URLs.findById(id, callback);
    });


    box.on('url.find-url', function( url, callback){
        if( !url ){
            process.nextTick(function() {
                callback(null, null);
            })
        }else{
            URLs.findOne(
                {$or : [
                    {url: url },
                    {original_url:url}
                ]},
                callback
          );
        }
    });

    box.on('url.update', function( id, oURL, callback ){
        URLs.updateById( id, { $set:oURL }, { safe: true }, callback );
    });

    box.on('url.add-link-id', function( id, link_id, returnUpdated, callback){
        URLs.update(
            { _id: id, "links" :{ $ne : link_id }},
            {  $push: {  "links" : link_id } },
            { safe: false },
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
        URLs.find( {url: url }, { fields:{links:false, page_id:false} },  function(err, exisitng_URL ){
            if( exisitng_URL.length ){
                URLs.update(
                    { _id: exisitng_URL[0]._id, "links" :{ $ne : link_id }},
                    {  $push: {  "links" : link_id } },
                    function( err, result ){
                        box.db.coll.links.updateById(  newLink._id,
                            { $set:{url_id:exisitng_URL[0]._id }},
                            function( err, result ){
                                callback(err, exisitng_URL[0], true ); // true indicates it is an existing URL
                        });
                    }
                );
            }else{
                URLs.insert( new_url(url, link_id), function(err, insertedURL){
                    box.db.coll.links.updateById(
                        newLink._id,
                        { $set: { url_id:insertedURL._id }},
                        function( err, result ){
                            callback(err, insertedURL, false );
                        }
                    );
                });
            }
        });
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