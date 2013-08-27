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

function getAttr_and_Name( $s, dest, folder ){
    var o = $s[0],
        href = o.attribs ? o.attribs.HREF : null,
        hrefOK = href &&  href.indexOf('http') === 0;

    dest.title = $s.text();
    if( hrefOK || folder ){
        for( var i in o.attribs){
            var attrName = i.toLowerCase(),
                value = o.attribs[i];

            if( attrName == 'last_modified' && value == o.attribs['LAST_MODIFIED'] ){
                continue;
            }
            if( attrName == 'add_date' || attrName == 'last_modified' ){
                  value += '0000';
            }
            dest[ attrName ] = value;
        }
    }
    return dest;
}

function appendArray(a,b){
    for( var i = 0; a &&  b && i < b.length; i++){
        a.push( b[i])
    }
}

function parseDL( $DL, $, fullPath, flatOutput, isFolder ){
    fullPath = fullPath || '';
    var result = $DL.children('>DT').map(function(pos, element){
        var $DT = $(this),
            $H3 = $DT.children('>h3'),
            $A  = $DT.children('>a'),
            $next = $DT.next ? $DT.next() : null,
            step = {parent : fullPath || '/'},
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
                for(var x=0; links && x < links.length; x++ ){
                    var item = links[x];
                    if( item.folder ){
                        folder.folders += 1 + item.folder.folders;
                        step.folder.links   += item.folder.links;
                    }else{
                        folder.links++;
                    }
                }

                if( flatOutput ){
                    appendArray( flatOutput, links );
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
    if( !isFolder ) {
        appendArray( flatOutput, result );
    }

    return result;
}

function sanitizeData( s ){
    s = s.replace(/<p>|<HR>|ICON=".*"|ICON_URI=".*"/gi, '');
    s = s.replace(/<\/A>/gi, '</a></dt>');
    s = s.replace(/<\/h3>/gi, '</h3></dt>');

    s = s.replace(  /<DD>([^<]*)?<\/DL>/gi,"<DD>$1</DD></DL>"); // description at the end of DL
    s = s.replace(  /<DD>([^<]*)?<DT>/gi, "<DD>$1</DD><DT>");
    s = s.replace(  /<DD>([^<]*)?<DL>/gi, "<DD>$1</DD><DL>");
//        s = s.replace(  /<DD>([^<]*)?<DL>/gi,"<DD>$1</DD>");

    s = s.substring( s.indexOf( '<DL>' ) - 1);
    return s;
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


function parse (path, keep_after_parse, callback) {
    fs.readFile(path, function (err, data) {
        var flatOutput = [];
        if( err ){
            callback(err);
        }else{
            var data2 =  sanitizeData('' + data );

            console.info( data2 );
            var $ = cheerio.load( '<body>' + data2 + '</body>', cherioParam);
            var root = parseDL( $(' body > dl' ), $, '', flatOutput ); //

            removeBlankNodes(flatOutput);
               flatOutput.sort( orderImpoertNodes );
            removeBlankNodes(root);
                root.sort( orderImpoertNodes );

            callback(null, root, flatOutput);
        }
    });
    if( !keep_after_parse ){
        deleteAfterUpload( path );
    }
}


exports.parse = parse;

/*
 var form = new formidable.IncomingForm();
 form.keepExtensions = true;
 form.uploadDir =  config.__dirname + config.upload.dir;

 form.parse(req, function(err, fields, files){
 if (err) return res.end('You found error');
 // do something with files.image etc
 console.log(files.image);
 console.log("parse:\n" + util.inspect( fields, false, 7, true ) + "\n" + util.inspect( files, false, 7, true )  );
 });


 form.progress( function(bytesReceived, bytesExpected){
 var percent = (bytesReceived / bytesExpected * 100) | 0;
 process.stdout.write('Uploading: %' + percent + '\r');
 });



 form.error(req,  function(err) {
 res.writeHead(200, {'content-type': 'text/plain'});
 res.end('error:\n\n'+util.inspect(err));
 });


 req.form.complete(function(err, fields, files){
 if (err) {
 next(err);
 } else {
 console.log('\nuploaded %s to %s'
 ,  files.image.filename
 , files.image.path);
 res.redirect('back');
 }
 });
 */

//  console.log("uploaded:\n" + util.inspect(  req.files.favorites , false, 7, true )  );

