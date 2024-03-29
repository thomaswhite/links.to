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
    , URLs
    ;


function new_url( url, link_id, extra ){
    var url2save = {
        state: 'fetching',
        url:  url,
        links:[]
    };
    if( link_id ){
        url2save.links.push( link_id );
    }
    return _.merge( url2save, extra );
}

function update_related_links(aLinks, oUpdate, condition, callback ){
    condition = oUpdate || {};
    condition._id = { $in: aLinks};
    box.db.coll.links.update( condition, oUpdate, { multi : true },  callback  );
}


function update_links_display( id, all, callback ){
    if( !id ){
        throw 'Missing ID';
    }
    URLs.findById( id, function( err, oURL ){
        if( err ){
            callback(err);
        }else{
            var oUpdate = {
                    $set: {
                        display :  oURL.display,
                        updated : new Date(),
                        state   : 'ready',
                        url     : oURL.url
                   }
                }
                , condition = {
                    _id : { $in: oURL.links},
                    $or : [
                        {state: 'queued' },
                        {state: 'new' },
                        {state: 'fetching' },
                        {state: 'refresh' },
                        {state: 'hard-refresh' }
                    ]
                }
            ;

            if( !oURL.links.length ){
                throw 'Missing links';
            }

            if( all ){
                delete condition.$or;
            }
            box.db.coll.links.update(
                condition,
                oUpdate,
                { multi : true },
                function( err, updated ){
                    // todo: there was an error. Investgate and fix.
                    callback(err, oURL, updated );
                }
            );
        }
    });
}

function add_link_ids( id, aLinks, returnUpdated, callback){
    URLs.updateById( id,
        {   $addToSet: {  "links" : { $each: aLinks} } },
        function(err, u){
            if( returnUpdated ){
                URLs.findById(id, callback );
            }else{
                callback(err);
            }
        }
    );
}

function add_link_id( id, link_id, update, callback){
    URLs.updateById(
        id,
        {   $addToSet: {  "links" : { $each: [link_id] } } },
        function(err, u){
            if(err){
                callback(err);
            }else{
                box.db.coll.links.updateById( link_id, { $set: { url_id:id }}, function(err, number_of_updated ){
                    if( update ){
                        update_links_display( id, false, callback);
                    }
                });

            }
        }
    );
}



box.on('db.init', function( Config, done ){
    URLs = box.db.coll.urls = box.db.monk.get('urls');

    URLs.options.multi = true;
    URLs.index('url',  { unique: true });
    URLs.index('original_url', {background:true, sparse:1} );
    URLs.index('links', {background:true});


// ================== updated =================

    box.on('url.add', function( url, link_id, extra, callback){
        URLs.insert( new_url(url, link_id, extra), function(err, insertedURL){
            if( err ){
                callback(err);
            }else if( link_id ){
                var update = { url_id:insertedURL._id };
                if( insertedURL.display ){
                    update.display = insertedURL.display;
                    update.state = insertedURL.state;
                }
                box.db.coll.links.updateById( link_id, { $set: update}, function( err, result ){
                    if( insertedURL.page_id ){
                        box.db.coll.pages.updateById(  insertedURL.page_id, { $set:{url_id: insertedURL._id}},{ safe: false });
                    }
                    if( insertedURL.state == 'ready'){
                        update_links_display( insertedURL._id, true, function(err){
                            callback( err, insertedURL );
                        });
                    }else{
                        callback( err, insertedURL );
                    }
                });
            }else{
                callback(err, insertedURL);
            }
        });
    });

    // TODO: DO not delete URL that is used in any active link
    box.on('url.delete', function( id, callback){
        if( !id ){
            throw "url.delete': missing ID";
        }
        callback = callback || function(){};
        URLs.findById(id, function(err, oURL){
            if( !oURL || err ){
                if( typeof callback == 'function'){
                    callback();
                }
            }else{
                update_related_links(oURL.links, {$set:{url_id:0}}, {}, function(err, updated){
                    URLs.remove( {_id: id }, callback );
                });
            }
        });





    });

    box.on('url.get', function( id,  callback){
        if( id ){
            if( typeof id == 'string'){
                id = URLs.col.ObjectID(id);
            }

            URLs.findById(id, callback);
        }else{
            box.utils.later( callback );
        }
    });


    box.on('url.check-url', function( url, exclude_id, callback){
        if( !url ){
            box.utils.later( callback );
        }else{
            var param =  {
                $or : [
                    {url: url },
                    {original_url:url}
                ]
            };

            if( exclude_id ){
                param._id = { $nin: [exclude_id] };
            }
            URLs.findOne(param,  { fields:{links:false }}, callback  );
           //  { fields:{links:false, page_id:false} },

        }
    });

    box.on('url.check-url-and-original_url', function( url, callback){
        if( !url ){
            box.utils.later(callback );
        }else{
            URLs.find(
                {$or : [
                    {url: url },
                    {original_url:url}
                ]},
                // { fields:{links:false, page_id:false} },
                function(err, oFound){
                    if( oFound && oFound.length && oFound.length > 1){
                        throw {msg:"Duplicate oURLs", URL: oFound };
                    }
                    callback(err, !oFound.length ? null: oFound[0]);
                }
            );
        }
    });

    box.on('url.update', function( id, oURL, callback ){
        URLs.updateById( id, { $set:oURL },callback );
    });
    box.on('url.update-fast', function( id, oURL ){
        URLs.updateById( id, { $set:oURL }, { safe: false } );
    });

    box.on('url.set-state', function( id, state, job_id, callback ){
        var u = {
            $set:{
              state:state,
              updated: new Date()
            }
        };
        if( job_id ){
           if(  job_id > 0 ){
               u.$set.job_id = job_id;
           }else{
               u.$unset = { job_id: ''}
           }
        }
        if(  state === 'fetching' ){
            u.$set.start_fetching = new Date();
        }
        if( callback ){
            URLs.updateById( id, u, callback);
        }else{
            URLs.updateById( id, u, { safe: false });
        }
    });


    box.on('url.set-page-id', function( id, page_id  ){
        box.db.coll.pages.updateById(  page_id, { $set:{url_id: id}},{ safe: false }); // URLs.col.ObjectID()
        URLs.updateById( id, { $set: {page_id:page_id }}, { safe: false } );
    });

    box.on('url.update-display-queued_and_new-links', function( id, toUpdate, callback ){
        if( toUpdate ){
            toUpdate.updated = new Date();
            toUpdate.state = 'ready';
            URLs.updateById( id,  { $set: toUpdate }, function(err, n){
                if( err ){
                    callback(err);
                }else{
                    update_links_display( id, false, callback);
                }
            });
        }else{
            update_links_display( id, false, callback);
        }
    });

    box.on('url.update-links', update_links_display );
    box.on('url.add-link-ids', add_link_ids );
    box.on('url.add-link-id',  add_link_id );

    box.utils.later( done, null, 'db:URLs');
});

/*
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
                add_link_ids( exisitng_URL._id, [link_id], false, function(err){
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
                        box.db.coll.links.updateById(  link_id, { $set:oUpdate}, function( err, result ){
                            callback(err, exisitng_URL, true ); // true indicates it is an existing URL
                        });
                    }
                });
            }else{
                URLs.insert( new_url(url, link_id), function(err, insertedURL){
                    if( err ){
                        callback( err );
                    }else{
                        box.db.coll.links.updateById( link_id, { $set: { url_id:insertedURL._id }}, function( err, result ){
                            callback(err, insertedURL, false );
                        });
                    }
                });
            }
        }
    );
});






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