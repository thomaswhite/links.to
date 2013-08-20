/**
 * Created with JetBrains WebStorm.
 * User: twhite
 * Date: 20/08/13
 * To change this template use File | Settings | File Templates.
 */


$(document).ready(function() {

    $('.fakeFileCont input:file').change(function(){
        var $this = $(this);
        $this.closest('.fakeFileCont').find('input:text').val($this.val());
    });

    $('.fakeFileCont input:button, .fakeFileCont button').click(function(event){
        $(this).closest('.fakeFileCont').find('input:file').trigger('click');
    });

});