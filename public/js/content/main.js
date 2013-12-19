define([
    "tiny-pubsub",
    "./detect_bottom",
    "content/buttons",
    'content/pages',
    "bootstrap-js",
    "./page"
], function(tiny ){

    // TODO add bottomless scroll.
    function page_bottom_detected(event, nowTS, window_height){
         debug.log('page_bottom_detected, received. ts:' + nowTS + ', window_height:' + window_height );
    }

    tiny.sub('page_bottom_detected', page_bottom_detected);
    tiny.pub('page_bottom_detection'); // activate the bottom detection

    return {content:true};
});
