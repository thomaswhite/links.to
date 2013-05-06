
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
    lowerCaseTags: false
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

function scrape_tags( $, uri,  callback ){
    var Tags = keyWords.makeList( $('body').find('p, ul, h1, h2, h3').text(), null, 4, 'en'),
        result = Tags.words.slice(0, 10);

    result.local = Tags.locale;
    callback( null,{
        tags: result,
        type:'tags'
    });
}

function scrape_body( $, uri,  callback ){
    var i,
        content = { type:'content', h1:[], h2:[] },
        aH1 = $('h1').toArray(),
        aH2 = $('h2').toArray(),
        buffer = '',
        Ps = $('body').find('p'),
        aP = Ps.toArray();;

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
        if( buffer.length > 500 ){
            break;
        }
    }
    buffer = buffer.substr(0,500);
    content.summary = buffer.substr(0, buffer.lastIndexOf('.')+1);

    callback( null, content );
}

function scrape_images( $, uri,  callback ){
    var images = [],
        oURL = URL.parse(uri),
        baseURL = uri; //URL.format(_.pick(oURL, 'protocol', 'host', 'port'));

    images.type = 'images';
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
    callback( null, {images:images, type:'images'} );
}

function scrape_head( $, uri,  callback ){
    var $head = $('head'),
        head = {type:'head', meta:{  og : {},  fb : {} }, links:{} },
        meta = head.meta,
        og = meta.og,
        fb = meta.fb,
        aURL =  _.pick(URL.parse(uri), 'protocol', 'host', 'port'),
        baseURL = URL.format(aURL),
        currentType = '';

    head.title = $($head.find('title')).text();  // $(body.find('h1').text())

    $head.find( 'link[rel]').each( function(i,elem){
        var rel = elem.attribs.rel;
        if(rel == 'stylesheet' ){
            return;
        }
        if( rel == 'shortcut icon' ){
               rel = 'favicon';
        }
        if( elem.attribs.href ){
            elem.attribs.href = URL.resolve( baseURL, elem.attribs.href );
        }
        delete elem.attribs.rel;
        if( elem.attribs.href  ){
            prop_or_array( head.links, rel, elem.attribs );
        }
        //head.links.push( elem.attribs );
    });


    $head.find('meta[name]').each(function(i, elem) {
        var i, name = elem.attribs.name;
        if( name.indexOf('.') === -1 && elem.attribs && elem.attribs.content ){
            var content = unescape(elem.attribs.content.trim()),
                field = name,
                names = name.split(':');
            switch( name ){
                case 'google-site-verification':
                case 'robots':
                case 'generator':
                case 'http-equiv':
                    break;

                case 'keywords':
                    content =  content.split(',');

                case 'author':
                case 'description':

                    head[name] =
                    meta[ name] = content;
                    break;

                default:
                    if( names.length > 1 ){
                        var meta2 = meta[ names[0] ] || {};
                        meta2[ names[1] ] = content;
                        if( !meta[ names[0] ] ){
                            meta[ names[0] ] = meta2;
                        }
                    }else{
                        head[name] =
                        meta[name] = content;
                    }
            }
        }
    });

    $head.find('meta[property^=fb]').each(function(i, item ){
        var value = item.attribs.content.trim(),
            aP = item.attribs.property.split(':'),
            dimmy = aP.shift(),
            type = aP.shift();

        fb[ type ] = value;
    });

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
            type = 'tags';
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
    callback( null, head );
}

function scrape_metatags_open_graph( $, uri,  callback ){
    var head = $('head'),
        currentType = '',
        og = {},
        fb = {};


    callback( null, {og:og, fb:fb, type:'og'});
}

function  page_save ( $, uri,  callback ){
   emitter.invoke('page.save',  $('body').html(), uri, function(err, Page){
       if( !err ){
           Page.type = 'saved-page';
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
            callback(new Error('You must supply an url.'), null);
        }else{

            request(request_options, function (err, response, body) {
                if (err) {
                    callback( err );
                } else if ( !response || response.statusCode !== 200 ) {
                    callback(new  Error('Request to '+options['uri']+' ended with status code: '+(typeof response !== 'undefined' ? response.statusCode : 'unknown')));
                } else{
                    body = body.replace(/<(\/?)script/g, '<$1nobreakage');
                    var $ = cheerio.load(body, cherioParam);
                    emitter.parallel( 'pageScrape.process', $, request_options.uri, function(err, pageParts){
                        if( err ){
                            throw err;
                        }else{
                            var Results = {url: request_options.uri }, type, part;
                            for( var i = 0; i<pageParts.length; i++){
                                if( !(part = pageParts[i])  ) continue;
                                type = part.type;
                                delete part.type;
                                _.merge( Results, part );
                            }
                            debug( inspect( Results ) );
                            callback( null, Results);
                        }
                    });
                }
            });

        }
    });


    emitter.on( 'pageScrape.process', page_save );
    emitter.on( 'pageScrape.process', scrape_head );
    emitter.on( 'pageScrape.process', scrape_images  );
    emitter.on( 'pageScrape.process', scrape_body );
//    emitter.on( 'pageScrape.process', scrape_metatags_open_graph  );
    emitter.on( 'pageScrape.process', scrape_tags  );
    return emitter;
};