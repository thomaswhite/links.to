// bottomless: a jQuery plugin that makes it easy to set or get the
// current value of a group of bottomless buttons.
//
// Copyright 2013 P'unk Avenue LLC
//
// Please see:
//
// https://github.com/punkave/jquery-bottomless
//
// For complete documentation.

/*
 $('.my-blog-posts').bottomless({
 url: '/fetch-blog-content'
 });
 // We don't need the pager if we can infinite scroll
 // However we hide it with JavaScript so that
 // Google still finds it otherwise we have serious SEO issues!
 $('.apos-pager').hide();
 */

(function( $ ){
    var defaults = {
       method : 'GET',
       dataType : 'html',
       page : 1,
       perPage : 40,
       criteria : {},
       distance : 350,
       interval : 150,
       now : false,
       spinner : '#bottomless_spinner'
       // success: fn
       // dataType :'json'
    };

    $.fn.bottomless = function(param) {
        var $el = this;
        var options = $.extend(true, {}, defaults, param );

        var page = options.page;
        var $spinner = $(options.spinner);

        var atEnd = false;
        var loading = false;
        var active = true;

        var lastScrollTS = new Date().getTime();
        var $document = $(document);
        var $window = $(window).scroll(function(event){
            var nowTS = new Date().getTime();
            if( active && (lastScrollTS - nowTS > options.interval ) && (!atEnd) && (!loading) ){
                lastScrollTS = nowTS;
                var window_height = $window.height(),
                    footerHeight = window_height - ($el.offset().top + $el.height());

                if (($document.scrollTop() + window_height + options.distance) >= window_height - footerHeight) {
                    loadPage();
                }
            }
        });


        $el.on('aposScrollReset', function(e, data) {
            if (data) {
                criteria = data;
            }
            reset();
        });

        $el.on('aposScrollEnded', function(e) {
            end();
        });

        $el.on('aposScrollDeactivate', function(e) {
            active = false;
            end();
        });

        $el.on('aposScrollActivate', function(e) {
            active = true;
            end();
        });

        function reset() {
            if (!options.reset) {
                $el.html('');
            } else {
                options.reset();
            }
            page = 0;
            atEnd = false;
            loadPage();
        }

        function loadPage() {
            start();
            page++;

            $.ajax({
                url: options.url,
                type: options.method,
                data: $.extend(true, {}, { page : page, limit : options.perPage, skip : (page - 1) * options.perPage }, options.criteria ),
                dataType: options.dataType,
                success: function(data) {
                    (options.success || function(data) {
                        var $items = $.parseHTML(data);
                        $el.append($items);
                        $el.data('page', page);
                    })(data);
                    stop();
                    $el.trigger('aposScrollLoaded');
                },
                error: function() {
                    $el.data('loading', false);
                    loading = false;
                },
                statusCode: {
                    404: function() {
                        $el.trigger('aposScrollEnded');
                    }
                }
            });
        }

        function start() {
            $el.data('loading', true);
            loading = true;
            $el.trigger('aposScrollStarted');
            $spinner.show();
        }

        function stop() {
            $el.data('loading', false);
            loading = false;
            $el.trigger('aposScrollStopped');
            $spinner.hide();
        }

        function end() {
            if (loading) {
                stop();
            }
            atEnd = true;
            $spinner.hide();
        }

        if (options.now) {
            loadPage();
        }
    };
})( jQuery );