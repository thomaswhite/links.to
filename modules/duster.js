var fs = require('fs')
   , path = require('path')
   , _ = require('lodash')
   , watchTree = require('watch-tree-maintained')
   , debug = require('debug')('linksTo:duster')
   , util = require('util')
   , readdirp = require('readdirp')
   , async   = require('async')
   , os = require('os')
;

var allCode = {}
   , isWin = !!process.platform.match(/^win/)
;

exports.watch = function(dust, templateDir, publicDir, templateExtension, callBackWhenAllIsReady) {

    templateExtension = templateExtension || '.dust';
	var   Templates = {}
        , Jobs = []
        , combinedTS = null
        , combinedMs = 0
        , compileAll = false
        , nowMs = new Date()
    ;

    function make_templateID(path, ext){
        var filePath = path.split('\\').join('/');
        return filePath.substr(0, filePath.indexOf(ext ));
    }

    function make_job( file ){
        var templateID = make_templateID(file.path, templateExtension),
            job = {
                template: null,
                templateID: templateID,
                templatePath: file.fullPath.split('\\').join('/'),
                templateTS  : file.stat.mtime,
                templateMs  : file.stat.mtime.getTime(),
                compiledPath: path.join(publicDir, templateID.split('/').join('~') + '.js'),
                compiledTS : null,
                compiled:null
            }
        ;
        return job;
    }

    function process_job(job, cb){
        fs.stat( job.compiledPath, function(err, compiledFile ){
            if( err && err.code != 'ENOENT'){
                console.error('Error accessing "' +  job.compiledPath + '"', err);
            }

            if( compiledFile && job.compiled && !job.changed ){
                job.type = 'reuse';
                process.nextTick(function(){
                    cb(null, job );
                });
            }else if( compiledFile && compiledFile.mtime > job.templateTS && !job.changed  ) { // reuse the compiled file
                job.compiledTS = compiledFile.mtime;
                fs.readFile(job.compiledPath, function read(err, text) {
                    if (err) {
                        cb(err);
                    }else{
                        job.compiled = '' + text;
                        dust.loadSource( job.compiled );
                        debug( '"' + job.templateID + '.js" has been reused.');
                        job.type = 'reload';
                        cb(null, job );
                    }
                });
            } else {
                delete job.changed;
                fs.readFile(job.templatePath, function read(err, text) {
                    if (err) {
                        cb(err);
                    }else{
                        job.template = '' + text;
                        job.compiled = dust.compile( job.template, job.templateID );
                        dust.loadSource( job.compiled );
                        job.compiledTS = new Date();
                        job.type = 'compile';
                        fs.writeFile( job.compiledPath, job.compiled, function(err){
                            debug('"' + job.templateID + '.dust" has been COMPILED.');
                            cb(err, job );
                        });
                    }
                });
            }
        });
    }

    fs.stat( path.join(publicDir, 'all.js'), function(err, statsAll){
        if( err && err.code != 'ENOENT'){
            console.error('Error all.js stats: ', err);
        }else{
            combinedTS = statsAll ? statsAll.mtime : null;
            combinedMs = combinedTS ? combinedTS.getTime():0;
        }
        if( nowMs - combinedMs > 12*60*60000 ){
            compileAll = true;
        }

        readdirp({ root: templateDir, fileFilter: '*' + templateExtension }, function (errors, templates) {
            var fileNames = []
                , compiled=[]
                , recentMs = 0
                , nowMs = (new Date()).getTime()
            ;

            if (errors) {
                errors.forEach(function (err) {
                    console.error('Error: ', err);
                });
            }
            var changes = 0;
            templates.files.forEach( function(file){
                var job = make_job(file, statsAll ? statsAll.mtime : new Date('2000/01/01') );
                Templates[ job.templatePath ] = job;
                Jobs.push(job);
                if( compileAll || job.templateMs > recentMs  ){
                    recentMs = job.templateMs;
                    job.changed = true;
                }
            });

            // move changed first to give time process the rest while the files are loading
            Jobs.sort(function(a,b){
                return a.changed && !b.changed
                       ? -1
                       : !a.changed && b.changed
                         ? 1
                         : 0
                ;
            });

            if( !compileAll && recentMs <= combinedMs && !changes  ){ //
                fs.readFile(path.join(publicDir, 'all.js'), function read(err, text) {
                    if (err) {
                        callBackWhenAllIsReady(err);
                    }else{
                        dust.loadSource( '' + text );
                        callBackWhenAllIsReady(null, ['Reusing compiled all.js']);
                    }
                });
            }else{
                async.map( Jobs, process_job, function(err, jobs ){
                    if( err ){
                        console.error( 'Error while compiling DUST templates ', err );
                    }else{
                        combine_all(jobs, function(err, result){
                            if(err){
                                console.error( 'Error while writing all.js ', err );
                            }
                            callBackWhenAllIsReady( null,  result );
                        });
                    }
                });
            }
        });
    });

    function combine_all( jobs, cb ){
        var all = [], compiled=[];
        jobs.forEach( function( job ){
            all.push(job.compiled);
            if( job.type == 'compile'){
                compiled.push( job.templateID );
            }
        });

        fs.writeFile(path.join(publicDir, 'all.js'), all.join('\r'), function(err){
            debug('"all.js" has been updated ----------------------------------------------------------');
            compiled.push('all.js');
            cb(err, compiled);
        });
    }

    function refreshTemplate(path, publicDir){
        path = path.split('\\').join('/');
        var job = Templates[path];
        if( !job ){
            throw('Missing template for file:' + path);
        }
        job.changed = true;
        process_job(  Templates[path], function(err, job ){
            if(err){
                debug('Error white updating file', job.templatePath, err);
            }else{
                combine_all(Jobs, function(err){
                    if(err){
                        console.error( 'Error while writing all.js ', err );
                    }
                    debug('The change in template "' + path + '" has been reflected in all.js');
                });
            }
        });
    }


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
        callBackWhenAllIsReady( err );
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
        if(typeof callBackWhenAllIsReady == 'function'){
            callBackWhenAllIsReady(null, templates );
        }
    })
;

    */