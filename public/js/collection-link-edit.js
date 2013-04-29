/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 07/10/12
 * Time: 14:56
 * To change this template use File | Settings | File Templates.
 */

var iFrameDoc = null;
$(document).ready(function() {
    var $iframe = $('iframe')[0];

    if( $iframe ){
        iFrameDoc = $($iframe.contentWindow.document)
            .delegate('p,img', 'click', function(event){
               $(this).toggleClass('hovered',true);
            });

    }



  $(document)
    .delegate('.iddDrop.closed', 'click', function(event){
      $('.opened').removeClass('opened').addClass('closed');
      $('.on').removeClass('on');
      $(this).removeClass('closed').addClass('opened')
             .closest('ul').addClass('opened')
             .find(' a.inactive').addClass('on');
      event.stopPropagation();
      return false;
    })

   .delegate('.iddDrop.opened', 'click', function(event){
    $(this).removeClass('opened').addClass('closed')
           .closest('ul').removeClass('opened')
           .find(' a.inactive').removeClass('on');
    event.stopPropagation();
    return false;
   })

  .delegate('.thumbnail.inactive.on', 'click', function(event){
    var $this = $(this).removeClass('on inactive'),
        li = $this.closest('li'),
        ul = $this.closest('ul'),
        eipDATA = $this.closest('.eipURL').data(),
        URL = eipDATA.url;

        delete eipDATA.url;
        eipDATA.value = $this.data('imagepos');
        eipDATA.name  = 'imagePos';

        ul.find('li').eq(0).find('a').addClass('inactive');
        ul.prepend(li).find('> a.iddDrop').trigger('click');

        $.ajax({
          url: URL,
          type: "POST",
          data: eipDATA,
          dataType: "json",
          complete: function(request){
              var dummy = 1;
          },
          success: function(result){
            var dummy = 1;
          },
          error: function(request) {
            var dummy = 1;
          }
        });

        event.stopPropagation();
        return false;
  });

    textareaAutogrow();

//  $('textarea.autoGrow').autosize();
//  $('input.autoGrow').autoGrowInput();
});