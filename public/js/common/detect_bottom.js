/**
 * Created by twhite on 31/10/13.
 */

/**
 *
 *
 */


 define(['jquery', 'links-to/tiny-pubsub', 'links-to/debug' ], function ($, tiny, debug) {
    "use strict";

    function detect_bottom( event, options ){
        options = options || {};
        var // parameters
              distance =  options.distance  || 20    // px from the bottom
            , sleepTime = options.sleepTime || 1000  // sleep for 1s after 'eventName' is triggered before check again
            , interval  = options.interval  || 250
            , explain  = options.explain    || false
            , eventName = options.eventName || 'page_bottom_detected'

            // runtime variables
            , $document = $(document)
            , $window = $(window)
            , $body = $('body')
            , $marker = null
            , marker_height = $marker ? $marker.height():0
            , lastScrollTS = new Date().getTime()
            , lastScrollTop = 0
            , lastWindowHeight = 0
            , window_height = 0

            , triggeredTS = 0
            , triggeredWindowHeight = 0
            , timer

            , myDebug = !explain ? function(){} : debug.info

        ;


        interval = Math.max(50, interval);

        /**
         * The checks should be done very fast and efficiently.
         * There is throttling mechanism to check only every  'interval' milliseconds where a watchdog event is set
         * about 1/2 of the period to check if something happened while we have been skipping the events.
         * If the resize or scroll event comes back it clears the timer.
         *
         * There is a similar mechanism for skipping the checks for 'sleepTime' milliseconds after
         * the 'page_bottom_detected' event is fired to allow time to fetch the next page and insert it into the body of the page.
         *
         * No other event will be triggered before some of the following happen:
         *   1) the height of the page becomes bigger then the height of the page at the time of triggering 'page_bottom_detected' event.
         *   2) event 'page_updated' was captured.
         *
         *
         * @param event
         */
       function check (event ){
            clearTimeout(timer);
            if( !$marker ){
              $marker = options.$marker && (options.$marker instanceof jQuery )? options.$marker: $('<div id="bottom-marker" style="text-align:center"><span>&nbsp; ------ bottom marker ------- </span></div>').appendTo( $body );
              marker_height = $marker.height();
            }

            var nowTS = new Date().getTime(),
                window_height = $window.height(),
                t;
            if( event && event.type == 'resize' ){
                lastWindowHeight = lastScrollTop = 0; // new window size. check check
                timer = setTimeout( check, interval );
                myDebug('Resizing wait... ');
            }else if(  nowTS - lastScrollTS  < interval ){
                t = nowTS - lastScrollTS  +  (interval >> 2 );  // .25 interval
                timer = setTimeout( check, t );
                //myDebug( 'Throttle calls: check again in ' + t + 'ms');
            }else if( nowTS - triggeredTS < sleepTime ){
                t = sleepTime - (nowTS - triggeredTS)  + ( interval >> 2 ); // 0.25 interval
                timer = setTimeout( check,  t );
                myDebug( 'Sleep for another ' + t + 'ms, before checking again.');
            }else{
                var footerHeight  = window_height - ($marker.offset().top + marker_height),
                    thisScrollTop = $document.scrollTop();

                if( thisScrollTop - lastScrollTop < 1 ){
                    //myDebug("Canceled. Moving Up.");
    //            }else if( triggeredTS && ( triggeredWindowHeight >=  window_height   )){ // ||  window_height - lastWindowHeight < 10
    //                myDebug("Canceled. The window has not grown since the last 'page_bottom' event.");
                }else if(triggeredTS) {
                    myDebug("Canceled. Wait for 'page_updated' event");
                }else if( (thisScrollTop + window_height + distance) >= window_height - footerHeight) {
                    myDebug( 'page_bottom_detected triggered, window_height:' + window_height );
                    $.publish( eventName, [nowTS, window_height]);
                    triggeredTS = nowTS;
                    triggeredWindowHeight = window_height;
                }
                lastScrollTop    = thisScrollTop;
                lastWindowHeight = window_height;
                lastScrollTS     = nowTS;
            }
            if( triggeredTS && window_height > triggeredWindowHeight + distance ){
                triggeredTS = triggeredWindowHeight = 0; // now the event can trigger again
            }
       }
       $window.scroll( check );
       $window.resize( check );
       check();

        /** this allow the 'page_bottom_detected' to be triggered again */
        tiny.sub('page_updated', function(event){
            lastWindowHeight = lastScrollTS = triggeredTS = triggeredWindowHeight = 0;
            check();
        });
    }
    tiny.sub('page_bottom_detection', { catchUp:true }, detect_bottom  );
    //$('body').on('page_bottom_detection', detect_bottom);

    return {
        id:'detect-bottom'
    }

});