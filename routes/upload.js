/**
 * Created with JetBrains WebStorm.
 * User: twhite
 * Date: 14/08/13
 * Time: 09:00
 * To change this template use File | Settings | File Templates.
 */


var box = require('../box.js')
    , formidable = require('formidable')
    ,  util = require('util')
    , debug = require('debug')('linksTo:view.collections')
    , config
    , app

    ;


function upload (req, res) {
    var form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.uploadDir =  config.__dirname + config.upload.dir;




    form.parse(req, function(err, fields, files){
        if (err) return res.end('You found error');
        // do something with files.image etc
        console.log(files.image);
        console.log("parse:\n" + util.inspect( fields, false, 7, true ) + "\n" + util.inspect( files, false, 7, true )  );
    });

/*
    form.progress( function(bytesReceived, bytesExpected){
        var percent = (bytesReceived / bytesExpected * 100) | 0;
        process.stdout.write('Uploading: %' + percent + '\r');
    });



 form.error(req,  function(err) {
 res.writeHead(200, {'content-type': 'text/plain'});
 res.end('error:\n\n'+util.inspect(err));
 });

*/
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

    // console.log("uploaded:\n" + util.inspect(  req.files.inputTypeFile , false, 7, true )  );

    res.end('Done');
    return;
};


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

