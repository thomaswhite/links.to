var fs = require('graceful-fs')
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

/**
 *  todo
 *  in init create a list of files
 *  later fiter only these that need reloading, compilling
  */

var Jobs = []           // all jobs are here
    , Templates = {}    // hash of jobs accesed by their template URL
    , Compiled = []// array of complied templates. used when saving
    , combinedTS = null
    , combinedMs = 0
    , compileAll = false
    , updatedAfterLastRun = 0  // changes after the last compilation of all.js
    , recentChanges = 0  // a template has been changed
    , Compiled_id = [];
    ;


exports.watch = function(dust, templateDir, publicDir, templateExtension, callBackWhenAllIsReady) {

    templateExtension = templateExtension || '.dust';

    function make_templateID(path, ext){
        var filePath = path.split('\\').join('/');
        return filePath.substr(0, filePath.indexOf(ext ));
    }

    function make_job( file, cb ){
        var templateID = make_templateID(file.path, templateExtension),
            job = {
                template:   null,
                templateID: templateID,
                templatePath: file.fullPath.split('\\').join('/'),
                templateTS  : file.stat.mtime,
                templateMs  : file.stat.mtime.getTime(),
                compiledPath: path.join(publicDir, templateID.split('/').join('~') + '.js'),
                compiledTS : null,
                compiled:null,
                changed : false
            }
        ;
        fs.stat( job.compiledPath, function(err, compiledFile ){
            if( err && err.code != 'ENOENT' ){
                console.error('Error accessing "' +  job.compiledPath + '"', err);
                cb(err);
            }else{
                job.compiledTS = compiledFile ? compiledFile.mtime : new Date('2000/01/01');
                if( job.compiledTS < job.templateTS ){
                    job.changed = true;
                    recentChanges++;
                }
                if( (combinedTS && combinedTS < file.stat.mtime) ){
                    job.changed = true;
                    updatedAfterLastRun++;
                }
                cb(null, job );
            }
        });
    }

    function get_compiled( job, cb ){
        if( job.compiled && !job.changed ){
            job.type = 'reuse';
            process.nextTick(function(){
                cb(null, job.compiled );
            });
        }else if( job.compiledTS > job.templateTS && !job.changed  ) { // reuse the compiled file
            fs.readFile(job.compiledPath, function read(err, text) {
                if (err) {
                    cb(err);
                }else{
                    job.compiled = '' + text;
                    dust.loadSource( job.compiled );
//                    debug( '"' + job.templateID + '.js" has been reused.');
                    job.type = 'reload';
                    cb(null, job.compiled );
                }
            });
        } else {
            job.changed = false;
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
//                        debug('"' + job.templateID + '.dust" has been COMPILED.');
                        cb(err, job.compiled );
                    });
                }
            });
        }
    }

    function find_compiled(compiled_ids){
        compiled_ids = compiled_ids || [];
        Jobs.forEach(function(job){
            if( job.type == 'compile'){
                compiled_ids.push( job.templateID );
            }
        });
        return compiled_ids;
    }


    function write_all( aJobs_code, cb ){
        var compiled_ids =[' --- all.js ---'];
        if( aJobs_code && aJobs_code.length == Jobs.length  ){
            Compiled = aJobs_code;
            fs.writeFile(path.join(publicDir, 'all.js'), Compiled.join('\r'), function(err){
                cb(err, compiled_ids);
            });
        }else{
            async.map(Jobs, get_compiled, function(err, aCompiled ){
                Compiled = aCompiled;
                fs.writeFile(path.join(publicDir, 'all.js'), Compiled.join('\r'), function(err){
                    cb(err, find_compiled(compiled_ids));
                });
            });
        }
/*
            Compiled.push(job.compiled);
*/

    }

    function reuse_all(cb){
        fs.readFile(path.join(publicDir, 'all.js'), function read(err, text) {
            if (err) {
                callBackWhenAllIsReady(err);
            }else{
                dust.loadSource( '' + text );
                callBackWhenAllIsReady(null, [' ==== Reusing compiled all.js ====']);
            }
        });
    }


    function get_templates_asynch(callBackWhenAllIsReady){
        var templates = [];
        readdirp({ root: templateDir, fileFilter: '*.dust' })
            .on('warn', function (err) {
                console.error('something went wrong when processing an entry', err);
            })
            .on('error', function (err) {
                console.error('something went fatally wrong and the stream was aborted', err);
                callBackWhenAllIsReady( err );
            })
            .on('data', function (entry) {
                templates.push( entry );
            })
            .on('end', function(){
                if(typeof callBackWhenAllIsReady == 'function'){
                    callBackWhenAllIsReady(null, templates );
                }
            })
        ;
    }

    fs.stat( path.join(publicDir, 'all.js'), function(err, statsAll){
        var nowMs = new Date().getTime();
        if( err && err.code != 'ENOENT'){
            console.error('Error all.js stats: ', err);
        }else{
            combinedTS = statsAll ? statsAll.mtime : null;
            combinedMs = combinedTS ? combinedTS.getTime():0;
        }
        if( nowMs - combinedMs > 5*60000 ){
            compileAll = true;
        }

        get_templates_asynch( function(errors, templates){
            // templates.files.sort(function(a,b){ eturn a.templateTS > b.templateTS;   });
            if( errors ){  console.error( errors ); }

            async.map(templates, make_job, function(err, jobs ){
                jobs.sort(function(a,b){ return a.changed && !b.changed ? -1 : !a.changed && b.changed ? 1 : 0; });
                Jobs = jobs;
                async.map(jobs, get_compiled, function(err2, jobs_code ){
                    if( err2 ){ throw( err2); }
                    if( !updatedAfterLastRun && !recentChanges ){
                        reuse_all( function(err3, compiled_id ){
                            if(err3){ console.error( 'Error while reusing all.js ', err3 ); }
                            callBackWhenAllIsReady( null,  compiled_id );
                        });
                    }else{
                        write_all( jobs_code, function(err3, compiled_id ){
                            if(err3){ console.error( 'Error while writing all.js ', err3 ); }
                            callBackWhenAllIsReady( null,  compiled_id );
                        });
                    }
                });
/*
                if( !updatedAfterLastRun && !recentChanges ){
                    Jobs = jobs;
                    reuse_all( function(err3, compiled_id ){
                        if(err3){ console.error( 'Error while reusing all.js ', err3 ); }
                        callBackWhenAllIsReady( null,  compiled_id );
                    });
                }else{
                    async.map(jobs, get_compiled, function(err2, jobs_whith_code ){
                        if( err2 ){ throw( err2); }
                        Jobs = jobs_whith_code;
                        write_all( function(err3, compiled_id ){
                            if(err3){ console.error( 'Error while writing all.js ', err3 ); }
                            callBackWhenAllIsReady( null,  compiled_id );
                        });
                    });
                }
*/
            });

        });
    });

    /*





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

*/

};

/*







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

*/