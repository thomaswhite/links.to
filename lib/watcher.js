var fs = require('fs')
   , path = require('path')
   , _ = require('lodash')
   , watchTree = require('watch-tree-maintained')
   , debug = require('debug')('linksTo:watcher')
   , util = require('util')
   , readdirp = require('readdirp')
;

var allCode = {};

function writeAll( publicDir ){
    var a = [];
    for( var i in allCode){
        a.push(allCode[i]);
    }
    fs.writeFileSync(path.join(publicDir, 'all.js'), a.join('\r'));
}

function refreshTemplate(path, publicDir){
    compileTemplate(path);
    writeAll( publicDir );
}

exports.watch = function(dust, templateDir, publicDir, templateExtension, callBack) {
	// Compile all templates at start-up
	var templates = [],
        Errors = [];

    function compileTemplate(file) {
        if (file && path.extname(file) == templateExtension) {
            // debug('Recompiling: ' + file);
            var templateName = path.basename(file, templateExtension);
            var compiled = dust.compile(fs.readFileSync(file, 'UTF-8'), templateName);
            dust.loadSource(compiled);
            fs.writeFileSync(path.join(publicDir, templateName + '.js'), compiled);
            allCode[file] = compiled;
        }
    }

    // Watch the templates directory and recompile them if a file changes or is created
    var watcher = watchTree.watchTree(templateDir, {'sample-rate': 1000});
    watcher.on('fileModified', function(path) { refreshTemplate(path, publicDir); });
    watcher.on('fileCreated',  function(path) { refreshTemplate(path, publicDir); });

    readdirp({ root: templateDir, fileFilter: '*' + templateExtension }, function (errors, templates) {
        var fileNames = [];
        if (errors) {
            errors.forEach(function (err) {
                console.error('Error: ', err);
            });
        }
        _.each(templates.files, function(file) {
            try{
                fileNames.push( file.path );
                compileTemplate(file.fullPath);
            }catch(e){
                // debug(  'Error while compiling DUST template ', file.fullPath, e  );
                console.error( 'Error while compiling DUST template ', file.fullPath, e );
            }
        });
        writeAll( publicDir );
        callBack( null, fileNames ) ;
    });
}


/*

readdirp({ root: templateDir, fileFilter: '*' + templateExtension })
    .on('warn', function (err) {
        console.error('something went wrong when processing an entry', err);
    })
    .on('error', function (err) {
        console.error('something went fatally wrong and the stream was aborted', err);
        callBack( err );
    })
    .on('data', function (entry) {
        templates.push( entry.fullPath );
        try{
            compileTemplate(entry.fullPath);
        }catch(e){
            console.error('Error while compiling a template "' + entry.fullPath +'"', e);
        }
    })
    .on('end', function(){
        if(typeof callBack == 'function'){
            callBack(null, templates );
        }
    })
;

    */