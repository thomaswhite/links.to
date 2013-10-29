
/*
 * GET home page.
 */

var  _ = require('lodash')
   , URL = require('url')
   , async = require('async')
   , request = require('request')
   , cheerio = require('cheerio')
   , keyWords = require('./keyWords')
   , emitter = require('./../box.js')


// var sanitize = require('validator').sanitize;

   ;

var cherioParam = {
    ignoreWhitespace: false,
    xmlMode: true,
    lowerCaseTags: true
};

var NON_CLOSENG_TAGS = /<(sourse|hr|br|embed|command|input)[^>]*>/gi // link
    , SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
    , SCRIPT_REGEX2= /<script\b[^>]*>(.*?)<\/script>/ig
    , SCRIPT_REGEX3 = /<(script|object|frameset|frame|iframe|style)[^>]*>((.|\n)*?)<\/\\1>/gi
    , RegEx_TOO_MANY_WHITE_SPACES = /(\n+|\t+|\s\s+)/g
;

// multiple RegEx can be passes as second, third etc argument
function removeAll(s, regEx ){
    for(var i=1; i< arguments.length; i++){
        var REx = arguments[i];
        while (REx.test(s)) {
            s = s.replace(REx, "");
        }
    }
    return s;
}


function prop_or_array( o, prop, value ){
    if( prop.indexOf('.') > -1 ){
        prop = prop.split('.').join('_');
    }
    if( !o[prop]){
        o[prop] = value;
    }else if( typeof o[prop] == 'array' ){
        o[prop].push( value );
    }else{
        o[prop] = [ o[prop],value ];
    }
    return o;
}

/**
 *
 * @param O
 * @param name
 * @param value
 */

function metaSetValue( O, name, value, delimiter, baseURL ){
    var o = O, names = null;
    if( typeof delimiter == 'string'){
        delimiter = [delimiter];
    }
    for( var i = 0; delimiter && delimiter.length && i < delimiter.length; i++ ){
        if( name.indexOf( delimiter[i]) > -1 ){
            names = name.split( delimiter[i] );
            name =  name = names[names.length - 1];
            break;
        }
    }
    // create missing steps
    for( var i=0; names && names.length && i < names.length - 1; i++  ){
        var n = names[i].toLowerCase();
        o = o[ n ] = o[ n ] || {};
    }
    if( names == null && name != 'keywords'){
        // save plane tags here
        o = o['names'] = o['names'] || {};
    }
    o[ name ] = value;
}

function __head_meta_names( $head, baseURL, callback ){
    var meta = {};

    $head.find('meta[name]').each(function(i, elem) {
        var j, name = elem.attribs.name,
            nameParts = name.split('.');

        if( elem.attribs  && elem.attribs.content ){
                var content = unescape(elem.attribs.content.trim()),
                    names = name.split(':');

                switch( name ){
                    case 'google-site-verification':
                    case 'robots':
                    case 'generator':
                    case 'http-equiv':
                        break;

                    case 'keywords':
                    case 'dc.keywords':
                        content =  content.split(',');
                        for( j = 0; j < content.length; j++){
                            content[j] = content[j].trim();
                        }

                    default:
                        metaSetValue( meta, name, content, [':', '.'], baseURL);
                }
        }
    });
    emitter.utils.later(callback, null, meta );
}

function __head_fbTags( $head, baseURL, callback ){
    var fb = {};
    $head.find('meta[property^=fb]').each(function(i, item ){
        var value = item.attribs.content.trim(),
            aP = item.attribs.property.split(':'),
            dimmy = aP.shift(),
            type = aP.shift();

        fb[ type ] = value;
    });
    emitter.utils.later(callback, null, fb );
}

function __head_ogTags( $head, baseURL, callback ){
    var og = {}, currentType;
    $head.find('meta[property^="og:"]').each(function(i, item ){
        var value = item.attribs.content.trim(),
            aP = item.attribs.property.split(':'),
            dimmy = aP.shift(),
            type = aP.shift(),
            isMain = 0 === aP.length,
            sameMainPart = currentType === type,
            cenBeSequence =  type === 'image' ||
                type === 'video' ||
                type === 'audio' ||
                type === 'music' ||
                type === 'article' ||
                type === 'book' ||
                type === 'profile';

        if( type === 'keywords' ){
            value = value.split(',');
            //type = 'tags';
        }

        if( type.indexOf('.') !== -1 ){
            console.error("Type can not contain '.' - ", item.attribs.property );
        }else if( isMain ){
            if( currentType === type){ currentType = type;  }

            if( !og[ type ] ){
                // new
                if( cenBeSequence ){
                    og[ type ] = [{url:value}];
                }else{
                    og[ type ] = value;
                }
            }else if (og[type].push){
                // array
                og[type].push( {url:value });
            }else{
                // string. convert into an array
                og[type] = [og[type], value ];
            }
        }else{
            // this is a structured property og:image:type
            if(  type === currentType ){ // check just in case
                if( cenBeSequence ){
                    // add a property og:image:TYPE to the last element in the array
                    og[ type ][ og[ type ].length -1 ][aP[0]] = value;
                }else {
                    og[ type ][ aP[0] ] = value;
                }
            }else{
                // error.
                // og:image:type without og:image before
                console.log('Metatag out of order:', item.attribs.property );
            }
        }
    });
    emitter.utils.later(callback, null, og );
}

function __head_links($head, baseURL, callback){
    var links = {};
    $head.find( 'link[rel]').each( function(i,elem){
        var rel = elem.attribs.rel,
            type = elem.attribs.type;
        delete elem.attribs.rel;

        if( rel == 'stylesheet' || type == 'text/css' ){
            return;
        }
        if( rel == 'shortcut icon' ){
            rel = 'favicon';
        }
        if( elem.attribs.href ){
            elem.attribs.href = URL.resolve( baseURL, elem.attribs.href );
            prop_or_array( links, rel, elem.attribs );
        }
        //head.links.push( elem.attribs );
    });
    emitter.utils.later(callback, null, links );
}


function scrape_head( $, url, callback ){
    var $head = $('head'),
        aURL =  _.pick(URL.parse(url), 'protocol', 'host', 'port'),
        baseURL = URL.format(aURL);

    async.series({
//            url:   async.apply( thisValue, url ),
            fb:    async.apply( __head_fbTags, $head, baseURL ),
            og:    async.apply( __head_ogTags, $head, baseURL ),
            meta : async.apply( __head_meta_names, $head, baseURL ),
            links: async.apply( __head_links, $head, baseURL)
        },
        function(err, head ){
            head.title = $($head.find('title')).text();
            head.xhtml = '<head>' +  $head.html() + '</head>';

            if( head.meta && head.meta.twitter ){
                head.twitter = head.meta.twitter;
                delete head.meta.twitter;
            }else{
                head.twitter = {};
            }
            var canonical = (head.twitter ? head.twitter.url : '')
                ||  head.og.url
                || (head.links.canonical ? head.links.canonical.href : null );


            if( canonical ){
                head.canonical = canonical;
            }
            callback(err, head );
        }
    );
}


function __body_images( $, uri ){
    var images = [],
        oURL = URL.parse(uri),
        baseURL = uri; //URL.format(_.pick(oURL, 'protocol', 'host', 'port'));

    $('img').each(function(i, elem) {
        var a,
            src = elem.attribs.src,
            h   = elem.attribs.height ? parseInt( elem.attribs.height, 10) : 0,
            w   = elem.attribs.width ? parseInt( elem.attribs.width, 10) : 0;

        src = typeof src === 'string' ? URL.resolve( baseURL, src): null;

        if( h > 31 && src && !_.find(images, function(oImg){return oImg.src === src; }) && src.indexOf('captcha') == -1 ){
            elem.attribs.src = src;
            delete elem.attribs.id;
            delete elem.attribs.style;
            delete elem.attribs.alt;
            delete elem.attribs.class;
            delete elem.attribs.border;
            for( a in elem.attribs){
                if( !elem.attribs[a] ){
                    delete elem.attribs[a];
                }
            }
            images.push( elem.attribs );
        }
    });
    return images;
}

function scrape_body( $, uri, callback ){
    var i
        , buffer = ''
        , $body = $('body')
        , body = {
            h1:[],
            h2:[],
            images : __body_images( $, uri ),
            xhtml : '<body>' +  $body.html() + '</body>'
        }
        , aH1 = $('h1').toArray()
        , aH2 = $('h2').toArray()
        , Ps = $body.find('p')
        , aP = Ps.toArray();

    for( i=0; i< aH1.length; i++ ){
        body.h1.push( $( aH1[i]).text().replace(RegEx_TOO_MANY_WHITE_SPACES, ' ').trim() );
    }
    for( i=0; i< aH2.length; i++ ){
        body.h2.push( $( aH2[i]).text().replace(RegEx_TOO_MANY_WHITE_SPACES, ' ').trim() );
    }

    //        tip.summary = $('p').text().substr(0,750).replace(/(\s)+/,' ').trim();
    //        tip.summary = tip.summary.substr(0, tip.summary.lastIndexOf('.')+1);

    for( i=0; i< aP.length; i++ ){
        buffer += $(aP[i]).text().replace(RegEx_TOO_MANY_WHITE_SPACES, ' ').trim();
        if( buffer.length > 750 ){
            break;
        }
    }
    buffer = buffer.substr(0,750);
    body.summary = buffer.substr(0, buffer.lastIndexOf('.')+1);

    emitter.utils.later(callback, null, body );
}

function thisValue(value, cb){
    async.nextTick(function(){
        cb( null, value );
    });
}


function bodyHTML($, cb){
    async.nextTick(function(){
        cb( null, $('body').html() );
    });
}

function scrape_tags( $,  callback ){
    var Tags = keyWords.makeList( $('body').find('p, ul, h1, h2, h3').text(), null, 4, 'en'),
        result = Tags.words.slice(0, 12);

    result.local = Tags.locale;
    callback( null, result );
}

exports.init = function ( requestOptions, Done ) {

    emitter.on('pageScrape', function( url, html, callback ){
        var html2 = removeAll(html, NON_CLOSENG_TAGS, SCRIPT_REGEX, SCRIPT_REGEX2,SCRIPT_REGEX3  )
            , $ = cheerio.load(html2, cherioParam)
            , $html = $('html')
            , htmlAttr = $html && $('html')[0] ? $('html')[0].attribs : null
        ;
        async.series({
                head: async.apply( scrape_head, $, url ),
                body: async.apply( scrape_body, $, url ),
                tags: async.apply( scrape_tags, $ )
            },
            function(err, result){
                var canonical = result.head.canonical;
                if( canonical ){
                    delete result.head.canonical;
                    result.canonical = true;
                    if( url != canonical ){
                        result.original_url = url;
                    }
                    result.url = canonical;
                }else{
                    result.url = url;
                }
                result.xhtml = {
                    head : result.head.xhtml,
                    body : result.body.xhtml
                };
                if( htmlAttr ){
                    result.xhtml.html_attr = htmlAttr;
                }
                delete result.head.xhtml;
                delete result.body.xhtml;
                callback(err, result );
            }
        );
    });

    emitter.on('pageScrape.split_head_and_body', function( html, callback ){
        var html2 = removeAll(html_page_body, NON_CLOSENG_TAGS, SCRIPT_REGEX, SCRIPT_REGEX2,SCRIPT_REGEX3  )
            , $ = cheerio.load(html2, cherioParam)
            , result = {
                head : '<head>' +  $('head').html() + '</head>',
                body : '<body>' +  $('body').html() + '</body>',
                html : html
            }
            ;
        emitter.utils.later(null, result);
/*        async.nextTick(function(){
            callback( null, result );
        });
*/
    });

    emitter.on('pageScrape.head', function( sHead, url,  callback){
       scrape_head( cheerio.load(sHead, cherioParam), url, callback );
    });

    emitter.on('pageScrape.body', function( sBody, url,  callback){
       scrape_head( cheerio.load(sBody, cherioParam), url, callback );
    });

    emitter.on('pageScrape.tags', function( sBody, callback){
       var sText = cheerio.load(sBody, cherioParam).find('p, ul, h1, h2, h3').text(),
           Tags = keyWords.makeList( sText, null, 4, 'en'),
           result = Tags.words.slice(0, 12);

       result.local = Tags.locale;
       callback( null, result );
    });

    keyWords.add_locale('en', Done );

};
