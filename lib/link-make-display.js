/**
 * Created by Thomas on 28/09/13.
 */

var request = require('request')
    , _ = require('lodash')

    , SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
    , SCRIPT_REGEX2= /<script\b[^>]*>(.*?)<\/script>/ig


    ;


var metaTagsToUse = [
    'title',
    'author',
    'abstract',
    'description',
//    'keywords',
    'thumbnail',
    'summary',
    'url',
    'tags'
];

// multiple RegEx can be passes as second, third etc argument
function removeAll(s, regEx ){
    for(var i=1; i< arguments.length; i++){
        var REx = arguments[i], match;
        while ( match = REx.test(s)) {
            s = s.replace(REx, "");
        }
    }
    return s;
}

function pick_meta_field(groups, tag){
    var content = '';
    for( var g= 0; g < groups.length; g++){
        if( !groups[g] ) continue;
        if( (content = groups[g][ tag ]) ){
            content;
            break;
        }
    }
    return content;
}


function find_canonical_url(html){
    var regEx = [
            /<link\s+rel=(?:"canonical"|'canonical')\s+href\s*=\s*(\"[^"]*\"|'[^']*')\s*(?:\/>|><\/link>)/gi,
            /<meta[^>]*property\s*=\s*"og:url".*content\s*=\s*"([^"]*)/gi,
            /<meta[^>]*name\s*=\s*"twitter:url".*content\s*=\s*"([^"]*)/gi
        ]
        , match
        , result = null
        ;

    for( var i = 0; i < regEx.length; i++ ){
        match = regEx[i].exec( html );
        if( match ){
            result = match[1];
            break;
        }
    }
    return result;
}



function link_display( page, metaTagsToJoin ){
    metaTagsToJoin = metaTagsToJoin || metaTagsToUse;
    var display = { updated: new Date()},
        groups = [],
        head = page.head || {},
        names = head.names,
        og    = head.og,
        fb    = head.fb,
        twetter = head.twetter,
        pos
    ;

    groups.push( head.names );
    groups.push( head.og);
    groups.push( head.twetter);
    groups.push( head.fb );

    for( var i=0; i< metaTagsToJoin.length; i++){
        var tag = metaTagsToJoin[i],
            value = null;
        if(  display[ tag ] ) continue;
        switch( tag ){
            case 'title':
                value = pick_meta_field(groups, tag);
                if( !value ){
                    value = head.title || (page.body.h1 ? page.body.h1[0] : '' );
                }
/*                if( (pos = value.indexOf('|')) > -1){
                    value = value.split('|')[0];
                }
*/
                value = removeAll( value, SCRIPT_REGEX, SCRIPT_REGEX2);

                // value = value.split('&#8211;').join('-').split('&#8217;').join("'");
                break;

            case 'description':
                value = pick_meta_field(groups, tag);
                if( value ){
                    if( page.body && page.body.summary ){
                        delete page.body.summary;
                    }
                }else{
                    if( page.body && page.body.summary ){
                        value = page.body.summary;
                        display.summary_type = 'summary750';
                    }
                }
                value = removeAll( value, SCRIPT_REGEX, SCRIPT_REGEX2);
                break;

            case 'url':
                if( head.links && head.links.canonical ){
                    value = head.links.canonical.href;
                }else{
                    value = pick_meta_field(groups, 'url');
                }
                if( !value ){
                    value = page.url;
                }
                break;

            case 'thumbnail':
                display.imagePos = '';
                value = head.names && head.names.thumbnail ? head.names.thumbnail : pick_meta_field(groups, 'thumbnail');
                if( !value && head.og.image && head.og.image.length){
                    value = head.og.image[0].url;
                }else if( !value && page.body.image && page.body.image.length){
                    value = page.body.image[0].src;
                    display.imagePos = 0;
                }
                break;

            case 'author':
                if( head.links.author ){
                    var author =  head.links.author;
                    if( typeof author == 'string' ){
                        if( head.links.author.indexOf('@') > -1  ){
                            value = {
                                type:'email',
                                value: author
                            };
                        }else{
                            value = {
                                type:'text',
                                value: author
                            };
                        }
                    }else if( author.href ){
                        value = {
                            value:author.href,
                            type:'url'
                        };
                    }
                }
                break;

            case 'tags':
                value = _.first(page.tags || [], 5);
                break;

            case 'summary':

                break;

            case 'abstract':
                break;
        }
        if( value ){
            display[ tag ]  = value;
        }

    }
    if ( !display.title ){
        display.title = display.url;
    }
    // display.collection = page.collection;
    // display.shortID    = page.shortID;
    return display;
}





module.exports = {
    update : link_display,
    tags: function(){
        return metaTagsToUse;
    },
    find_canonical_url : find_canonical_url
};