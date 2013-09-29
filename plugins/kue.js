var box = require('../lib/box.js'),
    kue  = require('kue'),
    jobs = kue.createQueue();

box.Queue = kue;
box.Jobs  = jobs;


function removeJobs( err, aJobs){
    if( err ){
        console.error( err );
    }else if( aJobs ){
        aJobs.forEach(function(id){
            kue.Job.remove(id, function(err,r){
                var dummy = 1;
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


box.on('init', function (app, config, done) {

    jobs.active(function(err,aJobs){
        var dummy = 1;
    });
    jobs.inactive(removeJobs);
    jobs.complete( removeJobs );
    jobs.failed( removeJobs );

    process.nextTick(function() {
        done(null, 'plugin "KUE" initialised');
    });
});

/*
box.on('init.attach', function (app, config,  done) {
    done(null, 'plugin KUE attached');
});
*/