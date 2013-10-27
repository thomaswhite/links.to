/**
 * Created with JetBrains WebStorm.
 * User: Thomas White
 * Date: 09/10/13
 * Time: 21:48

 */

var   box = require('../lib/box')
    , debug = require('debug')('jobs:import-link')
    , async = require('async')
;

module.exports = {
    id : 'import-link',
    processor : function (job, Done){
        var   user = job.data.user
            , link = job.data.link
            , param = {
                    title: link.title,
                    description: link.description,
                    owner_id: user._id,
                    created: link.add_date,
                    updated: link.last_modified,
                    origin:'imported',
                    owner_screen_name: user.screen_name,
                    do_not_fetch: job.data.do_not_fetch,
                    url:link.href
            }
        ;
        // todo imported_from will be removed after the import becomes stable
        box.invoke('link_process',   link.href, job.data.collectionID, param, null, {import: link}, function(err, oAdded_Link, oURL ){
            Done(err);
        });
    }
};
