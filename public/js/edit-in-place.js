/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 01/09/12
 * Time: 16:51
 * To change this template use File | Settings | File Templates.
 */

$(document).ready(function() {
    $('textarea').autosize();


    var eipBase = $('.eipBase').data();

    var eipSettings = $.extend({}, {
       hover_class:'eip_hover',
       show_buttons:true,
       textarea_rows:0,
       textarea_cols:0,
       saving_animation_color: "#ECF2F8",

        url :  eipBase.url || function(options){
            return options.dom.closest('eipURL').data('url');
        },

        delegate: {
            willOpenEditInPlace: function(aDOMNode, aSettingsDict, event) {
                aDOMNode.find('input').autoGrowInput();
                aDOMNode.find('textarea').autosize();
            },

            willCloseEditInPlace: function(aDOMNode, aSettingsDict, event) {
                aDOMNode.find('input,textarea').empty();
            },

            missingCommaErrorPreventer:''
        },

        success:function(newEditorContentString,b,c){
            var dummy = 1;
        },
        error:function(newEditorContentString,b,c){
            var dummy = 1;
        }
    });

    $(".eip.ta").editInPlace($.extend({},eipSettings, {field_type: "textarea"}));
    $(".eip").not('.ta').editInPlace(eipSettings);
    $('input.autoGrow').autoGrowInput();
    $('textarea.autoGrow').autosize();

  /*
  $('#links').bind(' change paste',function(e){ // keyup mouseup input
    var $this = $(this);
    if( $this.val() ) {
      $this.attr('disabled');
      $('form#add')[0].submit();
    }
    return true;

  });
*/

});