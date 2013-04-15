/**
 * Created with JetBrains WebStorm.
 * User: Thomas White
 * Date: 14/04/13
 * Time: 11:27
 * idea got from http://jsfiddle.net/gLhCk/5/
 */

function textareaAutogrow( selector ){

    selector = selector || 'textarea.autoGrow';

    function resize(event){
        var $this = $(this),
            data = $this.data();
        if( !data.wait ){
            $this.data('wait', true);
            this.style.overflow = 'hidden';
            this.style.height = 0;
            this.style.height = this.scrollHeight + 'px';
            setTimeout(function () { $this.data('wait', false); }, 25);
        }
    }

    if( !$ || typeof $ != 'function' ){
        throw 'jQuery required'
    }else if($.isFunction($.fn.on)){
        $('body').on('keyup input change', selector, resize );
    }else{
        $('body').delegate( selector, 'keyup input change',resize );
    }

    $(selector).trigger('change');
}

