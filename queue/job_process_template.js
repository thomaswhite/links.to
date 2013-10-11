/**
 * Created with JetBrains WebStorm.
 * User: Thomas White
 * Date: 09/10/13
 * Time: 21:48

 */

var job_id = 'dummy'
    ,  box = require('../lib/box')
    , debug = require('debug')('jobs:' + job_id )
    , async = require('async')
;



module.exports = {
    id : job_id ,
    processor : function (job, Done){
        var data = job.data;

        Done(null);
    }
};
