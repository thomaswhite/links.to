var box = require('../lib/box')
    , kue  = require('kue')
    , path = require('path')
    , debug = require('debug')('plugin:kue')
    , jobs = kue.createQueue()
    , request_files_from_directory = require('../lib/request_files_from_directory')

    , app
    , config
;

box.Queue = kue;
box.Jobs  = jobs;


function removeJobs( err, aJobs){
    if( err ){
        console.error( err );
    }else if( aJobs ){
        debug('Delete jobs:%d', aJobs.length );
        aJobs.forEach(function(id){
            kue.Job.get(id, function(err, job){
                if( !job ){
                    return;
                }
                debug('Job:%j', job);
                kue.Job.remove(id, function(err,r){
                    var dummy = 1;
                });
            });
        });
    }
}


jobs.on('job complete', function(id){
    kue.Job.get(id, function(err, job){
        if (err) {
            console.info('Error removed completed job #%d, type:%s  %j', id );
        }
        if( job ){
            job.remove(function(err){
                if (err) throw err;
                console.info('Removed completed job #%d, type:%s  %j', job.id, job.type, job.data );
            });
        }else{
            console.info('Missing job #%d', id );
        }
    });
});


box.on('init', function (App, Config, done) {
    app = App;
    config = Config.queue;

    var ts = new Date().getTime();


    jobs.active(function(err,aJobs){
        var dummy = 1;
    });
    jobs.active(removeJobs);
    jobs.inactive(removeJobs);
    jobs.complete( removeJobs );
    jobs.failed( removeJobs );

    var jobs_id = [],
        jobs_processors = request_files_from_directory.get( path.join( Config.__dirname, config.jobs_dir ) )
        ;

    for(var i=0; jobs_processors && i < jobs_processors.length; i++){
        var j = jobs_processors[i];
        jobs.process( j.id, 50, j.processor );
        jobs_id.push(j.id);
    }

    box.on('cancel-import-tasks', function( import_id,  callback){
        jobs.active(function(err, aJobs){
                if( err ){
                    console.error( err );
                }else if( aJobs ){
                    debug('Cancel Import jobs:');
                    aJobs.forEach(function(id){
                        kue.Job.get(id, function(err, job){
                            if( job.data.import_id && job.data.import_id == import_id ){
                                kue.Job.remove(id, function(err,r){
                                    var dummy = 1;
                                });
                                debug("Cancel import job %j", job);
                            }else{
                                debug("Error canceling import job %j", job);
                            }
                        });
                    });
                    callback( null );
                }
        });
    });

    box.utils.later( done, null, '+' + ( new Date().getTime() - ts) + 'ms plugin "KUE" initialised. Jobs registered:[' + jobs_id.join(', ') + ']');
});

/*
box.on('init.attach', function (app, config,  done) {
    done(null, 'plugin KUE attached');
});
*/