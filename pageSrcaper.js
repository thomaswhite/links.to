
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
   , emitter = require('./box.js')

// var sanitize = require('validator').sanitize;

    , inspect = require('eyes').inspector({
        styles: {                 // Styles applied to stdout
            all:     'cyan',      // Overall style applied to everything
            label:   'underline', // Inspection labels, like 'array' in `array: [1, 2, 3]`
            other:   'inverted',  // Objects which don't have a literal representation, such as functions
            key:     'bold',      // The keys in object literals, like 'a' in `{a: 1}`
            special: 'grey',      // null, undefined...
            string:  'green',
            number:  'magenta',
            bool:    'blue',      // true false
            regexp:  'green'      // /\d+/
        },
        pretty: true,             // Indent object literals
        hideFunctions: true,     // Don't output functions at all
        stream: process.stdout,   // Stream to write to, or null
        maxLength: 8192           // Truncate output if longer
    })

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

function scrape_tags( $, uri, token, callback ){
    var Tags = keyWords.makeList( $('body').find('p, ul, h1, h2, h3').text(), null, 4, 'en'),
        result = Tags.words.slice(0, 10);

    result.local = Tags.locale;
    callback( null,{
        tags: result
    });
}

function scrape_body( $, uri, token, callback ){
    var i,
        content = { type:'body', h1:[], h2:[] },
        aH1 = $('h1').toArray(),
        aH2 = $('h2').toArray(),
        buffer = '',
        Ps = $('body').find('p'),
        aP = Ps.toArray();

    for( i=0; i< aH1.length; i++ ){
        content.h1.push( $( aH1[i]).text().replace(/(\n+|\t+|\s\s+)/g, ' ').trim() );
    }
    for( i=0; i< aH2.length; i++ ){
        content.h2.push( $( aH2[i]).text().replace(/(\n+|\t+|\s\s+)/g, ' ').trim() );
    }

    //        tip.summary = $('p').text().substr(0,750).replace(/(\s)+/,' ').trim();
    //        tip.summary = tip.summary.substr(0, tip.summary.lastIndexOf('.')+1);

    for( i=0; i< aP.length; i++ ){
        buffer += $(aP[i]).text().replace(/(\n+|\t+|\s\s+)/g, ' ').trim();
        if( buffer.length > 750 ){
            break;
        }
    }
    buffer = buffer.substr(0,750);
    content.summary = buffer.substr(0, buffer.lastIndexOf('.')+1);
    callback( null, content );
}

function scrape_images( $, uri, token,  callback ){
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

    emitter.emit('pageScrape.part', token, images[0] );
    callback( null, {images:images, type:'body'} );
}


function scrape_meta_names( $head, baseURL ){
    var meta = {};

    $head.find('meta[name]').each(function(i, elem) {
        var name = elem.attribs.name,
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
                        for(var i = 0; i < content.length; i++){
                            content[i] = content[i].trim();
                        }

                    default:
                        metaSetValue( meta, name, content, [':', '.'], baseURL);
                }
        }
    });

    return meta;
}

function scrape_fbTags( $head, baseURL ){
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

function scrape_ogTags( $head, baseURL ){
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

function scrape_head_links($head, baseURL){
    var links = {};
    $head.find( 'link[rel]').each( function(i,elem){
        var rel = elem.attribs.rel;
        delete elem.attribs.rel;

        if( rel == 'stylesheet' ){
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


function scrape_head( $, uri, token,  callback ){
    var $head = $('head'),
        result = { head:{ title: $($head.find('title')).text() ,fb:{}, og:{} } },
        head = result.head,
        display = result.display,
        aURL =  _.pick(URL.parse(uri), 'protocol', 'host', 'port'),
        baseURL = URL.format(aURL),
        meta = scrape_meta_names( $head, baseURL );

    // result.display.title = $($head.find('title')).text();
    _.extend( head, meta );
    _.extend(head.fb, scrape_fbTags( $head, baseURL ));
    _.extend(head.og, scrape_ogTags( $head, baseURL ));
    head.links = scrape_head_links($head, baseURL);

//    if( result.title.indexOf('|') > -1 ){
//        result.title = result.title.split('|')[0];
//    }
    emitter.emit('pageScrape.part', token, result );
    callback( null, result );
}

function  page_save ( $, uri, token,  callback ){
   emitter.invoke('page.save',  $('body').html(), uri, function(err, Page){
       if( !err ){
           Page.type = 'none';
       }
       callback(err, Page);
   });
}

exports.init = function ( requestOptions ) {
    var options = {};

     _.defaults(options, requestOptions, requestDefaults );

    emitter.on('pageScrape', function(request_options, callback ){
        if( typeof request_options == 'string'){
            request_options = { uri: request_options };
        }
        _.defaults(request_options, options );
        request_options.method = "GET";

        if ( !request_options.uri ) {
            callback(new Error('You must supply an url!'), null);
        }else{
            request(request_options, function (err, response, body) {
                if (err) {
                    err.state = 'not-found';
                    err.statusCode = response ? response.statusCode : -1;
                    callback( err );
                } else if ( !response || response.statusCode !== 200 ) {
                    callback( {
                        state : 'not-found',
                        statusCode: response ? response.statusCode : -1
                    });
                } else{

                    var SCRIPT_REGEX2= /<script\b[^>]*>(.*?)<\/script>/ig;
                    var SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
                    while (SCRIPT_REGEX.test(body)) {
                        body = body.replace(SCRIPT_REGEX, "");
                    }
                    while (SCRIPT_REGEX2.test(body)) {
                        body = body.replace(SCRIPT_REGEX2, "");
                    }
                    // /<script\ .*?<\/.*?script>/i
                    // body = body.replace(/<(\/?)script/g, '<$1nobreakage');

                    var $ = cheerio.load(body, cherioParam);
                    emitter.series( 'pageScrape.process', $, request_options.uri, request_options.token, function(err, pageParts){
                        if( err ){
                            callback(err);
                        }else{
                            var Results = { url: request_options.uri }, type, part;
                            for( var i = 0; i<pageParts.length; i++){
                                if( !(part = pageParts[i]) || part.type == 'none'  ) continue;
                                type = part.type;
                                delete part.type;
                                if( type ){
                                    var tmp = {};
                                    tmp[type] = part;
                                    _.merge( Results, tmp );
                                    //Results[type] = part;
                                }else{
                                    _.merge( Results, part );
                                }
                            }
                            //delete Results.body;
                            //debug( inspect( Results ) );
                            callback( null, Results);
                        }
                    });
                }
            });

        }
    });


    emitter.on( 'pageScrape.process', scrape_head );
    emitter.on( 'pageScrape.process', scrape_images  );
    emitter.on( 'pageScrape.process', scrape_body );
    emitter.on( 'pageScrape.process', scrape_tags  );
    emitter.on( 'pageScrape.process', page_save );
    return emitter;
};