/**
 * Created by twhite on 31/10/13.
 */

/**
 *
 *
 */

function detect_bottom( event ){

    var // parameters
        distance = 20    // px from the bottom
        , sleepTime = 1000// wait for 1s before trigger check
        , interval = 250
        , explain = true

        // runtime variables
        , myDebug = !explain
            ? function(){}
            : debug && $.isFunction(debug.info)
            ? debug.info
            : window.console && console.log
            ? console.log
            : function(){}

        , $document = $(document)
        , $window = $(window)
        , $body = $('body')
        , $marker = $('<div id="bottom-marker" style="text-align:center"><span>&nbsp; ------ bottom marker ------- </span></div>').appendTo( $body )
        , marker_height = $marker.height()
        , lastScrollTS = new Date().getTime()
        , lastScrollTop = 0
        , lastWindowHeight = 0

        , triggeredTS = 0
        , triggeredWindowHeight = 0
        , timer
    ;


   function check (event){
        clearTimeout(timer);
        var nowTS = new Date().getTime(), t;
        if( event && event.type == 'resize' ){
            lastWindowHeight = lastScrollTop = 0; // new window size. check check
            timer = setTimeout( check, interval );
            myDebug('Resizing wait... ');
        }else if(  nowTS - lastScrollTS  < interval ){
            t = nowTS - lastScrollTS  +  interval /2;
            timer = setTimeout( check, t );
            //myDebug( 'Throttle calls: check again in ' + t + 'ms');
        }else if( nowTS - triggeredTS < sleepTime ){
            t = nowTS - triggeredTS  + interval /2;
            timer = setTimeout( check,  t );
            myDebug( 'Sleep for another ' + t + 'ms after the "page_bottom_detected" event, before checking again.');
        }else{
            var window_height = $window.height(),
                footerHeight  = window_height - ($marker.offset().top + marker_height),
                thisScrollTop = $document.scrollTop();

            if( thisScrollTop - lastScrollTop < 1 ){
                //myDebug("Canceled. Moving Up.");
//            }else if( triggeredTS && ( triggeredWindowHeight >=  window_height   )){ // ||  window_height - lastWindowHeight < 10
//                myDebug("Canceled. The window has not grown since the last 'page_bottom' event.");
            }else if(triggeredTS) {
                myDebug("Canceled. Wait for 'page_updated' event");
            }else if( (thisScrollTop + window_height + distance) >= window_height - footerHeight) {
                myDebug( 'page_bottom_detected triggered, window_height:' + window_height );
                $body.trigger('page_bottom_detected', [nowTS, window_height]);
                triggeredTS = nowTS;
                triggeredWindowHeight = window_height;
            }

            lastScrollTop    = thisScrollTop;
            lastWindowHeight = window_height;
            lastScrollTS     = nowTS;

            if( window_height > triggeredWindowHeight + distance ){
                triggeredTS = triggeredWindowHeight = 0;
                // now the event can trigger again
            }
        }
   }

    $window.scroll( check );
    $window.resize( check );
    check();

    /**
     *  this allow the 'page_bottom_detected' to be triggered again
     */
    $body.on('page_updated', function(event){
        lastWindowHeight = lastScrollTS = triggeredTS = triggeredWindowHeight = 0;
        check();
    });

}
$('body').on('page_bottom_detection', detect_bottom);
