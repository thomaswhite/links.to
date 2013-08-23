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

function getAttr_and_Name( $s, dest, lowerCase ){
    var o = $s[0],
        href = o.attribs ? o.attribs.HREF : null,
        hrefOK = href &&  href.indexOf('http') === 0;

    if( href ) {
        if( hrefOK ){
            dest.title = $s.text();
            for( var i in o.attribs){
                var attrName = lowerCase ?  i.toLowerCase() : i;
                dest[ attrName ] = o.attribs[i];
            }
        }
    }else{
        dest.folder = $s.text();
    }
    return dest;
}

function appendArray(a,b){
    for( var i = 0; a &&  b && i < b.length; i++){
        a.push( b[i])
    }
}

function parseDL( $DL, $, fullPath, flatOutput ){
    fullPath = fullPath || '';
    var result = $DL.children('>DT').map(function(pos, element){
        var $DT = $(this),
            $H3 = $DT.children('>h3'),
            $A  = $DT.children('>a'),
            $next = $DT.next ? $DT.next() : null,
            step = {parent : fullPath || '/'},
            $DL;

        if( $H3.length ){      // folder
            $DL = $next;
            getAttr_and_Name( $H3, step );
            if( $next.filter('dd').length ){
                step.description = $next.text().replace(/(\n|\r)/g,'').trim();
                if( $next.next ){
                    $DL = $next.next();
                }else{
                    $DL = null;
                }
            }
            step.full_path = fullPath + '/' + step.folder;
//            step.parent = fullPath || '/';
            if( $DL ){
                step.child_links = 0;
                step.child_folders = 0;
                step.links = parseDL( $DL, $, step.full_path, flatOutput  );

                appendArray( flatOutput, step.links );

                for(var x=0; x < step.links.length; x++ ){
                   var item = step.links[x];
                   if( item.folder ){
                       step.child_folders += 1 + item.child_folders;
                       step.child_links   += item.child_links;
                   }else{
                       step.child_links++;
                   }
                }
                if( step.child_folders || step.child_links ){
                    step.id = ShorterID();
                }
            }

        }else if( $A.filter('>a').length ){ // link
            getAttr_and_Name( $A, step, true );
            if( $next && $next.filter('dd').length ){
                step.description = $next.text().replace(/(\n|\r)/g,'').trim();
            }
        }
        return step;
    });
    appendArray( flatOutput, result );

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


function parse (path, keep_after_parse, callback) {
    fs.readFile(path, function (err, data) {
        var flatOutput = [];
        if( err ){
            callback(err);
        }else{
            var $ = cheerio.load( '<body>' + sanitizeData('' + data ) + '</body>', cherioParam);
            var result = parseDL( $(' body > dl' ), $, '', flatOutput )
                ;

            for( var i = 0; i < flatOutput.length; i++){
                var o =  flatOutput[i];
                if( !o.title ){
                    flatOutput.splice(i,1);
                    i--;
                }else if (o.folder && o.links) {
                   delete o.links;
                }
            }
            flatOutput.sort(function(a,b){return a.parent - b.parent });

            callback(null, result, flatOutput);
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
