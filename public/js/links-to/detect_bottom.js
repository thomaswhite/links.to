/**
 * Created by twhite on 31/10/13.
 */

/**
 *
 * @param $marker - an element placed in end of the page used to determine if we reached the bottom of the screen
 */

function detect_bottom( event, $marker  ){
    var   // parameters
        distance = 20    // px from the bottom
        , sleepTime = 1000// wait for 1s before trigger again
        , interval = 200
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
        , lastScrollTS = new Date().getTime()
        , lastScrollTop = 0
        , lastWindowHeight = 0

        , triggeredTS = 0
        , triggeredWindowHeight = 0
        , timer
        ;


    if( !$marker || !$marker instanceof(jQuery)){
        // TODO add spinner ?
        // TODO center
        $marker = $('<div id="bottom-marker" style="align:center"><span>&nbsp; ------ bottom marker ------- </span></div>').appendTo( $body );
    }

    function again(){
        //   myDebug('delayed check');
        check_if_bottom();
    }


    function check_if_bottom (event){
        clearTimeout(timer);
        var nowTS = new Date().getTime();
        if( event && event.type == 'resize' ){
            lastWindowHeight = lastScrollTop = 0; // new window size. check again
            // myDebug('Resizing wait... ');
            lastScrollTS = nowTS; // this is to trigger interval delay, next bellow
        }
        if(  nowTS - lastScrollTS  < interval ){
            timer = setTimeout( again, nowTS - lastScrollTS  +  interval /2 );
            return;


        }else if( nowTS - triggeredTS < sleepTime ){
            // myDebug( 'Sleeping: check again in ' + (nowTS - triggeredTS  + interval /2 ) + 'ms');
            timer = setTimeout( again,  nowTS - triggeredTS + interval /2);
            return;
        }else{
            lastScrollTS = nowTS;
            var window_height = $window.height(),
                footerHeight = window_height - ($marker.offset().top + $marker.height()),
                thisScrollTop = $document.scrollTop();

            if( thisScrollTop - lastScrollTop < 1 ){
                //myDebug("Canceled. Not moving down");
            }else if( triggeredTS && window_height - lastWindowHeight < 10 ){
                myDebug("Canceled. The window has not grown since the last 'page_bottom' event.");
            }else if( (thisScrollTop + window_height + distance) >= window_height - footerHeight) {
                myDebug( 'page_bottom_detected triggered, window_height:' + window_height );
                $body.trigger('page_bottom_detected', [nowTS, window_height]);
                triggeredTS = nowTS;
                triggeredWindowHeight = window_height;
            }else{
                triggeredTS = 0;
            }
            lastScrollTop = thisScrollTop;
            lastWindowHeight = window_height;
        }
    }

    $window.scroll( check_if_bottom );
    $window.resize( check_if_bottom );
    check_if_bottom();
}
$('body').on('page_bottom_detection', detect_bottom);
