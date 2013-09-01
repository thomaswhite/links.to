var fs = require('fs')
   , path = require('path')
   , _ = require('lodash')
   , watchTree = require('watch-tree-maintained')
   , debug = require('debug')('linksTo:watcher')
   , util = require('util')
   , readdirp = require('readdirp')
   , async   = require('async')
   , os = require('os')
;

var allCode = {}
   , isWin = !!process.platform.match(/^win/)
;

exports.watch = function(dust, templateDir, publicDir, templateExtension, callBack) {

    templateExtension = templateExtension || '.dust';
	// Compile all templates at start-up
	var templates = [],
        Errors = [],
        Results,
        Templates = {},
        Compiled = {};

    function writeAll( publicDir ){
        var a = [],
            fullPath = path.join(publicDir, 'all.js');

        for( var i in allCode){
            a.push(allCode[i]);
        }
        fs.writeFileSync(fullPath, a.join('\r'));
        console.info(fullPath + ' has been updated ----------------------------------------------------------');
    }

    function refreshTemplate(path, publicDir){
        return;

        compileTemplateAsync(path, function(err, result){
            writeAllAsync( publicDir, function(err){
                if(err){
                    console.debug('Error white updating file', result, err);
                }
            });
        });
    }

    function compileTemplate(file, filePath ) {
        if (file && path.extname(file) == templateExtension) {
            // debug('Recompiling: ' + file);
            var templateName = path.basename(file, templateExtension);
            var compiled = dust.compile(fs.readFileSync(file, 'UTF-8'), filePath );
            dust.loadSource(compiled);

            var ouputPath = path.join(publicDir, templateName + '.js');
            fs.writeFileSync( ouputPath, compiled);
            console.info(ouputPath + ' has been updated.');
            allCode[file] = compiled;
            return compiled;
        }
    }


    function compileTemplateAsync_old(file, filePath, cb ) {
        var templateName = path.basename(file, templateExtension);
        fs.readFile(file, function read(err, text) {
            if (err) {
                cb(err);
            }else{
                var compiled = allCode[file] = dust.compile( '' + text, filePath );
                dust.loadSource(compiled);
                var ouputPath = path.join(publicDir, templateName + '.js');
                fs.writeFile( ouputPath, compiled, function(err){
                   if(err){
                       cb(err);
                   }else{
                       console.info(ouputPath + ' has been updated.');
                       cb(null, {path: file, compiled: compiled, saved: ouputPath} );
                   }
                });
            }
        });
    }


    function compileTemplateAsync(file, filePath, cb ) {
        fs.readFile(file, function read(err, text) {
            if (err) {
                cb(err);
            }else{
                var compiled = allCode[file] = dust.compile( '' + text, filePath );
                dust.loadSource(compiled);
                // console.info('"' + filePath + '.dust" has been compiled.');
                debug('"' + filePath + '.dust" has been compiled.');
                cb(null, {path: file, compiled: compiled } );
            }
        });
    }


    function writeAllAsync( publicDir, callBack ){
        var a = [],
            fullPath = path.join(publicDir, 'all.js');

        for( var i in allCode){
            a.push(allCode[i]);
        }
        fs.writeFile(fullPath, a.join('\r'), function(err){
            debug('"all.js" has been updated ----------------------------------------------------------');
            callBack(err);
        });
    }

    function process_all( err, results ){
        if( err ){
            console.error( 'Error while compiling DUST templates ', err );
        }else{
            Results = results;
            writeAllAsync( publicDir, function(err){
                if(err){
                    console.error( 'Error while writing all.js ', err );
                }
                callBack( null, results );
            });
        }
    }

    function make_templateID(path, ext){
        var filePath = path.split('\\').join('/');
        return filePath.substr(0, filePath.indexOf(ext ));
    }

    function make_job( file ){
        var templateID = make_templateID(file.path, templateExtension),
            compiled = Compiled[ templateID ],
            job = {
                templateID: templateID,
                templatePath: file.fullPath,
                templateTS  : file.stat.mtime,
                compiledPath: compiled ? compiled.fullPath : path.join(publicDir, templateID + '.js'),
                compiledTS  : compiled ? compiled.stat.mtime : new Date()
            }
        ;
        if( !compiled ){
            job.isNew = true;
        }
        return job;
    }

    fs.stat( path.join(publicDir, 'all.js'), function(err, statsAll){
        if( err ){
            console.error('Error all.js stats: ', err);
        }

        readdirp({ root: templateDir, fileFilter: '*' + templateExtension }, function (errors, templates) {
            var fileNames = [];
            if (errors) {
                errors.forEach(function (err) {
                    console.error('Error: ', err);
                });
            }
            var Jobs = [];
            templates.files.forEach( function(file){
                var job = make_job(file);
                Templates[ file.fullPath ] = job;
                Jobs.push( job );
            });


  /*

            async.map( Jobs, function(job, cb){
                 try{
                    var filePath = file.path.split('\\').join('/');
                    filePath = filePath.substr(0,filePath.indexOf('.dust'));

                    fileNames.push( file.path );
                    compileTemplateAsync( file.fullPath, filePath, cb );
                }catch(e){
                    console.error( 'Error while compiling DUST template ', file.fullPath, e );
                    cb( e );
                }
              },
              process_all
            );

   mapSeries
*/
            async.map( templates.files, function(file, cb){
                    try{
                        var filePath = file.path.split('\\').join('/');
                        filePath = filePath.substr(0,filePath.indexOf('.dust'));
                        fileNames.push( file.path );
                        compileTemplateAsync( file.fullPath, filePath, cb );
                    }catch(e){
                        console.error( 'Error while compiling DUST template ', file.fullPath, e );
                        cb( e );
                    }
                },
                process_all
            );
        });
    });



    // Watch the templates directory and recompile them if a file changes or is created
    var watcher = watchTree.watchTree(templateDir, {'sample-rate': 1000});
    watcher.on('fileModified', function(path) { refreshTemplate(path, publicDir); });
    watcher.on('fileCreated',  function(path) { refreshTemplate(path, publicDir); });
    // filePreexisted
    //allPreexistingFilesReported

};


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