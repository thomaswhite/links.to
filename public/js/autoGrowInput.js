/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 01/09/12
 * Time: 17:47
 * To change this template use File | Settings | File Templates.
 */

(function($){

    // jQuery autoGrowInput plugin by James Padolsey
    // See related thread: http://stackoverflow.com/questions/931207/is-there-a-jquery-autogrow-plugin-for-text-fields

    $.fn.autoGrowInput = function(o) {

        o = $.extend({
            maxWidth: 650,
            minWidth: 0,
            comfortZone: 25
        }, o);

        this.filter('input:text').each(function(){

            var minWidth = o.minWidth || $(this).width(),
                val = '',
                input = $(this),
                testSubject = $('<span/>').css({
                    position: 'absolute',
                    top: -9999,
                    left: -9999,
                    width: 'auto',
                    height: input.height(),
                    fontSize: input.css('fontSize'),
                    fontFamily: input.css('fontFamily'),
                    fontWeight: input.css('fontWeight'),
                    letterSpacing: input.css('letterSpacing'),
                    whiteSpace: 'nowrap'
                }),
                check = function(event, justDoIt) {

                    if (val === (val = input.val()) && !justDoIt ) {return;}

                    // Enter new content into testSubject
                    var escaped = val.replace(/&/g, '&amp;').replace(/\s/g,'&nbsp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    testSubject.html(escaped);

                    // Calculate new width + whether to change
                    var testerWidth = testSubject.width(),
                        changedWidth = (testerWidth + o.comfortZone) >= minWidth ? testerWidth + o.comfortZone : minWidth,
                        currentWidth = input.width(),
                        newWidth =  Math.min(Math.max( minWidth, changedWidth ),  o.maxWidth),

                        isValidWidthChange = justDoIt ||
                            (changedWidth < currentWidth && changedWidth >= minWidth) ||
                            (changedWidth > minWidth && changedWidth < o.maxWidth ) ||
                            (changedWidth > currentWidth && currentWidth < o.maxWidth)


                        ;
                    
                    // Animate width
                    if (isValidWidthChange) {
                        input.width(newWidth);
                    }

                };

            testSubject.insertAfter(input);

            $(this).bind('keyup keydown blur update change', check);
            check(null,true);

        });

        return this;

    };

})(jQuery);

