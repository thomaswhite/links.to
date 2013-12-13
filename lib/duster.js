var fs = require('graceful-fs')
   , path = require('path')
   , _ = require('lodash')
//   , watchTree = require('watch-tree-maintained')
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
;


exports.watch = function(dust, templateDir, publicDir, templateExtension, callBackWhenAllIsReady) {
    var startedTS = new Date().getTime();

    templateExtension = templateExtension || '.dust';

    function make_templateID(path, ext){
        var filePath = path.split('\\').join('/');
        return filePath.substr(0, filePath.indexOf(ext ));
    }

    function make_job( file, cb ){
        var templateID = make_templateID(file.path, templateExtension),
            job = {
                type:'none',
                changed : false,
                template:   null,
                templateID: templateID,
                templatePath: file.fullPath.split('\\').join('/'),
                templateTS  : file.stat.mtime,
                templateMs  : file.stat.mtime.getTime(),
                compiledPath: path.join(publicDir, templateID.split('/').join('~') + '.js'),
                compiledTS : null,
                compiled:null
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
                if( compileAll || (combinedTS && combinedTS < file.stat.mtime) ){
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
            box.utils.later( cb, null, job.compiled );
        }else if( job.compiledTS > job.templateTS && !job.changed  ) { // reuse the compiled file
            fs.readFile(job.compiledPath, function read(err, text) {
                if (err) {
                    cb(err);
                }else{
                    job.compiled = '' + text;
                    job.type = 'reload';
                    dust.loadSource( job.compiled );
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
                    job.compiledTS = new Date();
                    job.type = 'compile';
                    dust.loadSource( job.compiled );
                    fs.writeFile( job.compiledPath, job.compiled, function(err){
                        cb(err, job.compiled );
                    });
                }
            });
        }
    }

    function make_job_hash(){
        Jobs.forEach(function(job){
            Templates[ job.templatePath ] = job;
        });
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

    function writeAll(aCompiled, cb){
        var compiled_ids = [' --- all.js, all-amd.js ---'];
        var sCode = aCompiled.join('\r');
        fs.writeFile(path.join(publicDir, 'all.js'), sCode , function(err){
            if( err ){
                cd(err);
                return;
            }
            var amd = 'define(["dustjs-linkedin"], function(dust){\r' + sCode + '\r});';
            fs.writeFile(path.join(publicDir, 'all-amd.js'), amd , function(err){
                cb(err, find_compiled(compiled_ids) );
            });
        });
    }

    function write_all( aJobs_code, cb ){
        var compiled_ids = [' --- all.js ---'];
        if( aJobs_code && aJobs_code.length == Jobs.length  ){
            Compiled = aJobs_code;
            writeAll( Compiled, cb );
        }else{
            async.map(Jobs, get_compiled, function(err, aCompiled ){
                if( err ){
                    cb(err );
                }else{
                    Compiled = aCompiled;
                    writeAll( Compiled, cb);
                }
            });
        }
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
        if( nowMs - combinedMs > 60*60000 ){
            compileAll = true;
        }

        get_templates_asynch( function(errors, templates){
            // templates.files.sort(function(a,b){ eturn a.templateTS > b.templateTS;   });
            if( errors ){  console.error( errors ); }

            async.map(templates, make_job, function(err, jobs ){
                jobs.sort(function(a,b){ return a.changed && !b.changed ? -1 : !a.changed && b.changed ? 1 : 0; }); // move changed at the top
                Jobs = jobs;
                make_job_hash(); // to used when a file gets updated

                if( !updatedAfterLastRun && !recentChanges ){
                    reuse_all( function(err3, compiled_id ){
                        if(err3){ console.error( 'Error while reusing all.js ', err3 ); }
                        callBackWhenAllIsReady( err3,  compiled_id );
                    });
                }else{
                    write_all( [], function(err3, compiled_id ){
                        if(err3){ console.error( 'Error while writing all.js ', err3 ); }
                        callBackWhenAllIsReady( null,  compiled_id );
                    });
                }
            });

        });
    });
};


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
