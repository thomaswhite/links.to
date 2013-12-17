/**
 * jQuery plugin "Blue dotted Label"
 * Author: Thomas White
 * Date: 2013/06/10
 *
 * boilerplate used:  https://github.com/jquery-boilerplate/patterns/jquery.basic.plugin-boilerplate.js
 */

;(function ( $, window, document, undefined ) {
    var pluginName = "blueDottedLabel",
        defaults = {
            className: "bdLabel",
            labelTextOrder:"placeholder,title"
        };

    function Plugin( element, options ) {
        this.element = element;
        this.options = $.extend( {}, defaults, options) ;
        this._defaults = defaults;
        this._name = pluginName;
        this.runTime = {};
        this.init();
    }

    Plugin.prototype = {

        init: function() {
            var $element = $(this.element)
                , wrapper =  this.wrapper = $("<span class='bdLabel'>")
                , label   =  this.label = $("<span></span>")
                , labelText = ''
                , aLabels = this.options.labelTextOrder.split(',')

                ;

            this.runTime.border = $element.css('border');

            for( var i=0; labelText && i< aLabels.length; i++){
                labelText = $element.attr( aLabels[i] );
            };
            if( !labelText ){
                labelText = 'Missing label:(' + this.options.labelTextOrder +')';
            }
            wrapper.append(label.txt(labelText))
                   .append( $element )
                   ;
        },

        yourOtherFunction: function(el, options) {
            // some logic
        }
    };

    $.fn[pluginName] = function ( options ) {
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new Plugin( this, options ));
            }
        });
    }

})( jQuery, window, document );