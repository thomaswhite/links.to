
/*
 * GET home page.
 */

var  _ = require('lodash')
   , URL = require('url')
   , debug = require('debug')('linksTo:view.links')
   , async = require('async')
   , request = require('request')
   , cheerio = require('cheerio')
   , keyWords = require('./keyWords')

   , Emitter = require('eventflow')
// var sanitize = require('validator').sanitize;

   , emitter
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






function scrape_tokens( token, $, uri,  callback ){
    var Tags = keyWords.makeList( $('body').find('p, ul, h1, h2, h3').text(), null, 8, 4, 'en' );
    callback( null,{
        tags: Tags.tags,
        type:'tags'
    });
}

function scrape_body( token, $, uri,  callback ){
    var i,
        content = { type:'content', h1:[]  },
        aH1 = $('h1').toArray()
        buffer = '',
        Ps = $('body').find('p'),
        aP = Ps.toArray();;

    for( i=0; i< aH1.length; i++ ){
        content.h1.push( $( aH1[i]).text().replace(/(\n+|\t+|\s\s+)/g, ' ').trim() );
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

function scrape_images( token, $, uri,  callback ){
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

        if( h > 31 && src && !_.find(images, function(oImg){return oImg.src === src; })  ){
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

function scrape_head( token, $, uri,  callback ){
    var $head = $('head'),
        head = {type:'head', meta:{}, keyword:{}},
        aURL =  _.pick(URL.parse(uri), 'protocol', 'host', 'port'),
        baseURL = URL.format(aURL);

    head.title = $($head.find('title')).text();  // $(body.find('h1').text())

    $head.find( 'link[rel*="icon"]').each( function(i,elem){
        head.favicon = URL.resolve( baseURL, elem.attribs.href );
    });

    $head.find('meta[name]').each(function(i, elem) {
        var i, name = elem.attribs.name;
        if( name.indexOf('.') === -1 && elem.attribs && elem.attribs.content ){
            switch( elem.attribs.name ){
                case 'google-site-verification':
                case 'robots':
                case 'generator':
                case 'http-equiv':
                    break;

                case 'keywords':
                    var tags = unescape(elem.attribs.content.trim()).split(',');
                    for(  i=0; i < tags.length; i++){
                        head.keyword[tags[i].trim()] = 0;
                    }

                case 'author':
                case 'description':
                    head[name] = unescape(elem.attribs.content.trim());
                    break;

                default:
                    head[name] = unescape(elem.attribs.content.trim());
            }
        }
    });
    callback( null, head );
}

function scrape_metatags_open_graph( token, $, uri,  callback ){
    var head = $('head'),
        currentType = '',
        og = {},
        fb = {};

    head.find('meta[property^=fb]').each(function(i, item ){
        var value = item.attribs.content.trim(),
            aP = item.attribs.property.split(':'),
            dimmy = aP.shift(),
            type = aP.shift();

        fb[ type ] = value;
    });

    head.find('meta[property^="og:"]').each(function(i, item ){
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
    callback( null, {og:og, fb:fb, type:'og'});
}


exports.init = function ( requestOptions, mainEmitter ) {
    emitter = mainEmitter || Emitter(this);
    var options = {};

     _.defaults(options, requestOptions, requestDefaults );

    emitter.on('pageScrape', function(request_options, token, callback ){
        if( typeof request_options == 'string'){
            request_options = { uri: request_options };
        }
        _.defaults(request_options, options );

        if ( !request_options.uri ) {
            callback(new Error('You must supply an url.'), null);
        }else{
            request(request_options, function (err, response, body) {
                body = body.replace(/<(\/?)script/g, '<$1nobreakage');
                if (err) {
                    emitter.emit( 'pageScrape.error', err, token);
                } else if ( !response || response.statusCode !== 200 ) {
                    emitter.emit( 'pageScrape.notOK',
                        new Error('Request to '+options['uri']+' ended with status code: '+(typeof response !== 'undefined' ? response.statusCode : 'unknown')),
                        response,
                        token
                    );
                } else{
                    var $ = cheerio.load(body, cherioParam);
                    emitter.parallel( 'pageScrape.process', token, $, request_options.uri, function(err, pageParts){
                        if( err ){
                            throw err;
                        }else{
                            var Results = {url: request_options.uri }, type, part;
                            for( var i = 0; i<pageParts.length; i++){
                                if( !(part = pageParts[i])  ) continue;
                                type = part.type;
                                delete part.type;
                                delete part.token;
                                _.merge( Results, part );
                            }
                            emitter.emit('pageScrape.ready', token, Results );
                        }
                    });
                }
            });
            callback( null );
        }
    });

    emitter.on( 'pageScrape.process', scrape_head );
    emitter.on( 'pageScrape.process', scrape_images  );
    emitter.on( 'pageScrape.process', scrape_body );
    emitter.on( 'pageScrape.process', scrape_tokens  );
    emitter.on( 'pageScrape.process', scrape_metatags_open_graph  );

    return emitter;
};