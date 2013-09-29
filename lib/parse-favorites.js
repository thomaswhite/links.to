/**
 * Created with JetBrains WebStorm.
 * User: twhite
 * Date: 14/08/13
 * Time: 09:00
 * To change this template use File | Settings | File Templates.
 */


var util = require('util')
    , debug = require('debug')('parse-favouirites.js')
    , fs = require('fs')
    , ShortId  = require('shortid').seed(96715)
    , cheerio = require('cheerio')
;

var cherioParam = {
    ignoreWhitespace: true,
    xmlMode: true,
    lowerCaseTags: true
};

function ShorterID(){
    return  ShortId.generate().substr(0, 8);
}


function deleteAfterUpload (path) {
    setTimeout( function(){
        fs.unlink(path, function(err) {
            if (err) console.log(err);
            console.log('file successfully deleted:' + path);
        });
    }, 10 * 1000);
}

function appendNodes(a,b){
    for( var o, i = 0; a &&  b && i < b.length; i++){
        o = b[i];
        if( !o.title ||(!o.folder && !o.href)) {
            continue;
        }
        a.push( o );
    }
}

function removeBlankNodes(a){
    for( var i = 0; i < a.length; i++){
        var o =  a[i];
        if( !o.title ||(!o.folder && !o.href)){
            a.splice(i,1);
            i--;
        }
    }
    return a;
}

function orderImpoertNodes(a,b){
    if( a.parent != b.parent ){
        return (a.parent > b.parent ? 1 : -1);
    }else{
        if((a.folder && b.folder) || (!a.folder && !b.folder)){
            // ordered by adding date
            return a.add_date == b.add_date
                ? (a.title > b.title ? 1 : -1)
                : (parseInt(a.add_date, 10) > parseInt(b.add_date,10) ? 1 : -1);
        }else {
            // folders first
            return a.folder
                ? -1
                : b.folder
                ? 1
                : 0;
        }
    }
}

function getAttr_and_Name( $s, dest, folder ){
    var o = $s[0],
        href = o.attribs ? o.attribs.HREF : null,
        hrefOK = href &&  href.indexOf('http') === 0;

    dest.title = $s.text();
    if( hrefOK || folder ){
        for( var i in o.attribs){
            var attrName = i.toLowerCase(),
                value = o.attribs[i];

            switch(attrName){
                case 'last_modified':
/*                    if( value == o.attribs.ADD_DATE ){
                        continue;
                    }
*/
                case 'add_date':
                    value = new Date( parseInt(o.attribs[i] + '000') );
            }
            dest[ attrName ] = value;
        }
    }
    return dest;
}

function countFoldersAndLinks( links, o ){
    o = o || {};
    o.folders = o.links = o.this_links = o.this_folders = 0;
    for(var x=0; links && x < links.length; x++ ){
        var item = links[x], item_folder = item.folder;
        if( item_folder ){
            o.folders += item_folder.folders + 1; // count this folder
            o.links   += item_folder.links;
            o.this_folders++;
        }else{
            o.links++;
            o.this_links++;
        }
    }
    return o;
}

function parseDL( $DL, $, fullPath, flatOutput, isFolder ){
    fullPath = fullPath || '';
    var result = $DL.children('>DT').map(function(pos, element){
        var $DT = $(this),
            $H3 = $DT.children('>h3'),
            $A  = $DT.children('>a'),
            $next = $DT.next ? $DT.next() : null,
            step = {parent : fullPath || '/', excluded:false},
            $subDL;

        if( $DT.attr('done') ){
            return {};
        }
        $DT.attr('done', 'true');
        if( $H3.length ){      // folder
            $subDL = $next;
            getAttr_and_Name( $H3, step, true );

            var links = [],
                folder = {
                    links : 0,
                    folders : 0,
                    full_path:'',
                    id : ShorterID()
                };

            if( $next.filter('dd').length ){
                step.description = $next.text().replace(/(\n|\r)/g,'').trim();
                if( $next.next ){
                    $subDL = $next.next();
                }else{
                    $subDL = null;
                }
            }

            step.folder = folder;
            folder.full_path = fullPath + '/' + step.title;

            if( $subDL ){
                links = parseDL( $subDL, $, folder.full_path, flatOutput, true  );
                countFoldersAndLinks( links, folder );
                if( flatOutput ){
                    appendNodes( flatOutput, links );
                }else{
                    step.links = links;
                }
            }

        }else if( $A.filter('>a').length ){ // link
            getAttr_and_Name( $A, step );
            if( $next && $next.filter('dd').length ){
                step.description = $next.text().replace(/(\n|\r)/g,'').trim();
            }
        }
        return step;
    });
    if( fullPath === '' || !isFolder ) {
        appendNodes( flatOutput, result );
    }
    return result;
}


function sanitizeData( s ){
    s = s.replace(/<p>|<HR>/gi, '');  //      |ICON=".*"|ICON_URI=".*"
    s = s.replace(/<\/A>/gi, '</a></dt>');
    s = s.replace(/<\/h3>/gi, '</h3></dt>');

    s = s.replace(  /<DD>([^<]*)?<\/DL>/gi,"<DD>$1</DD></DL>"); // description at the end of DL
    s = s.replace(  /<DD>([^<]*)?<DT>/gi, "<DD>$1</DD><DT>");
    s = s.replace(  /<DD>([^<]*)?<DL>/gi, "<DD>$1</DD><DL>");
//        s = s.replace(  /<DD>([^<]*)?<DL>/gi,"<DD>$1</DD>");

    s = s.substring( s.indexOf( '<DL>' ) - 1);
    return s;
}

function parse (path, keep_after_parse, callback) {
    fs.readFile(path, function (err, data) {
        var subFolders = [], sData = '' + data;
        if( err ){
            callback(err);
        }else if( sData.indexOf('<!DOCTYPE NETSCAPE-Bookmark-file-1>') !== 0 ){
            callback('This is not a bookmark file exported from a browser.');
        }else{
            var data2 =  sanitizeData( sData );
            var $ = cheerio.load( '<body>' + data2 + '</body>', cherioParam);
            var root = parseDL( $(' body > dl' ), $, '', subFolders ); //

            subFolders.sort( orderImpoertNodes );
            root.sort(       orderImpoertNodes );

            callback(null, root, subFolders);
        }
    });
    if( !keep_after_parse ){
        deleteAfterUpload( path );
    }
}

exports.parse = parse;
exports.countFoldersAndLinks = countFoldersAndLinks;
exports.check = function (s){
    return s.indexOf('<!DOCTYPE NETSCAPE-Bookmark-file-1>') === 0;
};
