
/*
 * GET home page.
 */

var  _ = require('lodash')
   , URL = require('url')
   , debug = require('debug')('linksTo:pageScraper')
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

var requestDefaults = {
    'uri': null
    , 'headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22'
    }
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

function __head_meta_names( $head, baseURL ){
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

    return meta;
}

function __head_fbTags( $head, baseURL ){
    var fb = {};
    $head.find('meta[property^=fb]').each(function(i, item ){
        var value = item.attribs.content.trim(),
            aP = item.attribs.property.split(':'),
            dimmy = aP.shift(),
            type = aP.shift();

        fb[ type ] = value;
    });
    return fb;
}

function __head_ogTags( $head, baseURL ){
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
    return og;
}

function __head_links($head, baseURL){
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
    return links;
}


function scrape_head( $, uri, callback ){
    var $head = $('head'),
        aURL =  _.pick(URL.parse(uri), 'protocol', 'host', 'port'),
        baseURL = URL.format(aURL),
        head = {
           title: $($head.find('title')).text() ,
              fb: __head_fbTags( $head, baseURL ),
              og: __head_ogTags( $head, baseURL ),
            meta : __head_meta_names( $head, baseURL ),
            twetter: {},
            links: __head_links($head, baseURL)
        }
    ;
    if( head.meta && head.meta.twitter ){
        head.twitter = head.meta.twitter;
        delete head.meta.twitter;
    }

    async.nextTick(function(){
        callback( null, head );
    });
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
        , body = {
            h1:[],
            h2:[],
            images : __body_images( $, uri )
        }
        , aH1 = $('h1').toArray()
        , aH2 = $('h2').toArray()
        , Ps = $('body').find('p')
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

    async.nextTick(function(){
        callback( null, body );
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


exports.init = function ( requestOptions ) {


    emitter.on('pageScrape', function( url, html_page_body, callback ){
        var body = removeAll(html_page_body, NON_CLOSENG_TAGS, SCRIPT_REGEX, SCRIPT_REGEX2,SCRIPT_REGEX3  )
            , $ = cheerio.load(body, cherioParam)
        ;
        async.series({
//              url: function(cb){  cb(null, url);  },
//              bodyHTML: async.apply( bodyHTML, $ )
                head: async.apply( scrape_head, $, url ),
                body: async.apply( scrape_body, $, url ),
                tags: async.apply( scrape_tags, $ )
            },
            function(err, result){
                // TODO set result.canonical = true;
                if( result.head.twetter.url || result.head.links.canonical ){
                    result.canonical = result.head.twetter.url || (result.head.links.canonical ? result.head.links.canonical.href : null );
                }
                result.url = url;
                callback(err, result );
            }
        );
    });
    return emitter;
};

