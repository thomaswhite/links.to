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
        job.remove(function(err){
            if (err) throw err;
            console.info('Removed completed job #%d,  %j', job.id, job.data );
        });
    });
});


box.on('init', function (App, Config, done) {
    app = App;
    config = Config.queue;

    var jobs_id = [],
        jobs_processors = box.utils.request_files_in_directory( path.join( Config.__dirname, config.jobs_dir ) )
        ;

    for(var i=0; jobs_processors && i < jobs_processors.length; i++){
        var j = jobs_processors[i];
        jobs.process( j.id, j.processor );
        jobs_id.push(j.id);
    }


    jobs.active(function(err,aJobs){
        var dummy = 1;
    });
    jobs.active(removeJobs);
    jobs.inactive(removeJobs);
    jobs.complete( removeJobs );
    jobs.failed( removeJobs );

    box.utils.later( done, null,  'plugin "KUE" initialised. Jobs registered:', jobs_id );
  /*  process.nextTick(function() {
        done(null, 'plugin "KUE" initialised. Jobs registered:' + jobs_id.join(', '));
    });
  */
});

/*
box.on('init.attach', function (app, config,  done) {
    done(null, 'plugin KUE attached');
});
*/