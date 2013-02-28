/**
 * jquery.tw-labels.js
 * Date: 25th Oct 2010
 * @author Thomas White
 * @version 1.0
 */

(function($) {

	$.fn.twLabels = function(opts) {
        var options = $.extend(true, {}, $.twLabels.settings, opts );	
		return $(this).not('.'+ options.labeledClass).each(function() {
			var settings = $.metadata ? $.extend(true, {}, options, $this.data()) : options;				    
				$this = $(this).addClass('tw-label-added'), 
				$parent = $this.parent(),
				$label = $("label[for=" + this.id +"]", $parent ),
				lookupval = $this.attr('label') || $label.text() || $this.attr("title") || settings.labelText,
				$wrapper = $( '<span class="tw-label-wrapper"></span>').css( settings.wpapperCSS );
			
			if(!lookupval ) return; 
			$this.addClass(settings.labeledClass );
			
			if( !$label.length ){
			    if( !this.id ) $this.attr('id', 'twl'+ (new Date()).valueOf() + Math.round(Math.random()*10000) );
				$label = $('<label for="' + this.id  + '">'+ lookupval +'</label>').insertBefore( $this );
			}
            $label.addClass(settings.labelClass)
			      .css( settings.labelCSS)
				  .insertBefore($this)
				  .add($this)
				  .wrapAll(wrapper);	

		    if( $this.hasClass('w100')) $label.parent().addClass('w100');
			return $this
	  });
	};
	$.fn.twLabels.setup( settings ){
	   $.twLabels.settings = $.extend(true, {}, $.twLabels.settings, settings )	
	};
	
	$.fn.twLabels.settings = {
		labelText: "Label Text",		
		labelClass: "tw-label",
		labeledClass:"tw-labeled",
		labelCSS:{
			color:"blue", 
			position: "absolute", 
			display: "block", 
			background-color: "#fff", 
			z-index: "99", 
			font-size:"75%", 
			margin:"0.2em 0 .30em", 
			padding:"0 .3em 0 .4em", 		
		},
		wpapperCSS:{
		     position:relative, 
			 display:"inline-block",
			 padding:"0 0 .2em 0";
		},
		wrappedCSS:{
		    padding:"6px 0 .15em .25em",
			margin:"10px 0 0 0"
		}
	  };

    $.fn.twLabels = $.twLabels;	
})(jQuery);

