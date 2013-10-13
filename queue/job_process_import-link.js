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
    id : 'import_link',
    processor : function (job, Done){
        var   user = job.data.user
            , link = job.data.link
            , link2save = box.invoke('link.new',
                link.href,
                job.data.collectionID,
                {
                    title: link.title,
                    description: link.description,
                    owner_id: user._id,
                    owner_screen_name: user.screen_name,
                    created: link.add_date,
                    updated: link.last_modified,
                    origin:'imported'
                }
            )
            ;

        box.invoke( 'link.add2', link.href, job.data.collectionID, { no_pageScrap:true }, link2save, function(err, savedLink){
            if(err){
                debug( err );
            }
            box.invoke( 'url.add-link', link.href, savedLink, function(err, oURL, existing_URL  ){
                if(err){
                    debug( err );
                }
                if( !existing_URL || !existing_URL.ready  ){
                    //   job to ping URL
                    //   job to fetch and process page then update .display
                    //   job to update oURL
                    //   job to create tags

                    Done(null);
                }else{
                    // generate .display for the link from the oURL

                    Done(null);
                }
            });
        });
    }
};

/*

IMPORTERD link
{
    "parent":"/",
    "title":"Get Bookmark Add-ons",
    "description"
    "href":"https://addons.mozilla.org/en-US/firefox/bookmarks/",
    "add_date":
    "last_modified":

    "icon_uri":"http://www.mozilla.org/2005/made-up-favicon/0-1357573349534",
    "icon":
    "importID":
}
Saved Link
{
    "collection":"51f7d3086cda2f4413000001",
    "owner_screen_name":"Dummy User",
    "owner":1,
    "updated":
    "display":{
    "title":"The Hathors &#8211; Lion&#8217;s Gate Portal August 8th &amp; 25th &#8211; THEME MAGIC &#8211; EXPANSION OF&nbsp;CONSCIOUSNESS | Sacred Ascension - Key of Life -                                          Secrets of the Universe on WordPress.com",
        "description":"We are the Hathors, and we come to bring you a message. A message that a new MAGICAL wave of light is about to sweep your planet and YOU are NEEDED yet again. For the theme of the portal that is about to sweep your planet is MAGIC. On August 8th of your earthly time,&hellip;",
        "imagePos":"",
        "thumbnail":"http://i2.wp.com/sacredascensionmerkaba.files.wordpress.com/2013/08/thehathorslionsgate.jpg?fit=1000%2C1000",
        "canonicalURL":true,
        "url":"http://sacredascensionmerkaba.wordpress.com/2013/08/07/lions-gate-portal-august-8th-25th-theme-magic-expansion-of-conscience/",
        "tags":[ {  "word":"light",   "count":21  }]
},
    "url_id":
    "_id":
}

// processed saved page

*/