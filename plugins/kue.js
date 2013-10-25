var box = require('../lib/box')
    , kue  = require('kue')
    , path = require('path')
    , debug = require('debug')('plugin:kue')
    , jobs = kue.createQueue()

    , app
    , config
;

box.Queue = kue;
box.Jobs  = jobs;


function removeJobs( err, aJobs){
    if( err ){
        console.error( err );
    }else if( aJobs ){
        debug('Delete jobs:');
        aJobs.forEach(function(id){
            kue.Job.get(id, function(err, job){
                debug(job);
                kue.Job.remove(id, function(err,r){
                    var dummy = 1;
                });
            });
        });
    }
}


jobs.on('job complete', function(id){
    kue.Job.get(id, function(err, job){
        if (err) return;
        if( job ){
            job.remove(function(err){
                if (err) throw err;
                console.info('Removed completed job #%d,  %s', job.id, box.utils.inspect(job.data, { showHidden: false, depth: null, colors:false }) );
            });
        }else{
            var dummyu = 1;
        }
    });
});


box.on('init', function (App, Config, done) {
    app = App;
    config = Config.queue;


    jobs.active(function(err,aJobs){
        var dummy = 1;
    });
    jobs.active(removeJobs);
    jobs.inactive(removeJobs);
    jobs.complete( removeJobs );
    jobs.failed( removeJobs );



    var jobs_id = [],
        jobs_processors = box.utils.request_files_in_directory( path.join( Config.__dirname, config.jobs_dir ) )
        ;

    for(var i=0; jobs_processors && i < jobs_processors.length; i++){
        var j = jobs_processors[i];
        jobs.process( j.id, 20, j.processor );
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
                                debug("Cancel import job ", job);
                            }else{
                                debug("Error canceling import job ", job);
                            }
                        });
                    });
                    callback( null );
                }
        });
    });


    box.utils.later( done, null,  'plugin "KUE" initialised. Jobs registered:', jobs_id );
});

/*
box.on('init.attach', function (app, config,  done) {
    done(null, 'plugin KUE attached');
});
*/