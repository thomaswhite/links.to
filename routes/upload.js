/**
 * Created with JetBrains WebStorm.
 * User: twhite
 * Date: 14/08/13
 * Time: 09:00
 * To change this template use File | Settings | File Templates.
 */


var box = require('../box.js')
    ,  util = require('util')
    , debug = require('debug')('linksTo:view.collections')
    , fs = require('fs')
    , cheerio = require('cheerio')
    , config
    , app

    ;


var cherioParam = {
    ignoreWhitespace: false,
    xmlMode: true,
    lowerCaseTags: true
};


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
        hrefOK = href &&  href.indexOf('http') == 0;

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


function parseDL( $DL, $ ){
    return $DL.children('>DT').map(function(pos, element){
        var $DT = $(this),
            $H3 = $DT.children('>h3'),
            $A  = $DT.children('>a'),
            $next = $DT.next ? $DT.next() : null,
            step = {};

        if( $H3.length ){      // folder
            var $dd = $next ? $next.next() : null;
            if( $dd && $dd.filter('dd').length ){
                step.description = $next_next.text();
            }
            getAttr_and_Name( $H3, step );
            if( $next ){
                step.children = parseDL( $next, $, true );
            }
        }else if( $A.filter('>a').length ){ // link
            getAttr_and_Name( $A, step, true );
            if( $next && $next.filter('dd').length ){
                step.description = $next.text();
            }
        }
        return step;
    });
}


function upload (req, res) {
    fs.readFile(req.files.favorites.path, function (err, data) {
        var missingDD, s = '' + data;
        s = s.replace(/<p>|<HR>|ICON=".*"|ICON_URI=".*"/gi, '');
        s = s.replace(/<\/A>/gi, '</a></dt>');
        s = s.replace(/<\/h3>/gi, '</h3></dt>');

        s = s.replace(  /(<DD>[^<]*)?<\/DL>/gi, "\$1</DD>");
    //    s = s.replace(  /(<DD>[^<]*)?<DT>/gi, "\$1</DD>");

        s = s.substring( s.indexOf( '<DL>' ) - 1);
        var result, $ = cheerio.load( '<body>' + s + '</body>', cherioParam);
        console.info($.html() );

        result = parseDL( $(' body > dl' ), $ );
        console.log("parse:\n" + util.inspect( result, false, 7, true ));
    });

    deleteAfterUpload( req.files.favorites.path );
    res.end('Done');
    return;
}


box.on('init', function (App, Config, done) {
    app = App;
    config = Config;
    done(null, 'routers upload.js initialised');
});


box.on('init.attach', function (app, config,  done) {

    app.post('/upload', upload);
    app.io.route('upload',  function(req) {
        req.io.respond({
            result:'not implemented yet'
        });
    });

    done(null, 'route upload attached'  );
});


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

