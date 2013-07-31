/**
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01
 */


/**
 *
 * @param model
 * @param data
 * @param target
 * @param contentPos: 1 or append, -1 or prepend, 0 or replace
 */
function myRender(model, data, target, contentPos) {
    if (!model) { return; }

    var base = dust.makeBase({
        user:socketContext.user,
        pageParam:pageParam
    });

    data.user =   socketContext.user;
    dust.render(model,  base.push(data), function(err, out) {
        if (err) {
            console.error(err);
        }else if( !target ){
            console.log( out );
        } else {
            switch( contentPos ){
                case 'append' :
                case 1 :
                    $(target).append(out);
                    break;

                case 'prepend' :
                case -1:
                    $(target).prepend(out);
                    break;

                case 'replace':
                default:
                    $(target).html(out);
                    break;
            }
        }
    });
}

function fnBtnAdd(event){
    var $this = $(this).attr('disabled', true ),
        context = $this.data('context'),
        $addInput = $('input.addInput'),
        page = pages[context.route]
        ;

    context.value =  $addInput.val();
    socket.emit(page.routeIO, context, function(dataDone){
        $this.removeAttr('disabled');
        console.log ('button.btnAdd', dataDone);
        myRender( page.tempateID, dataDone, page.containerID, page.contentPos);
    });
}

function fnDelete(event){
    var $this = $(this),
        context = $this.data('context'),
        page = pages[context.route],
        $row  = $this.closest( page.deleteClosest ).addClass('deleting')
        ;

    socket.emit(page.routeIO, context, function(dataDone){
        console.log ('fnCollDelete', dataDone);
        if( dataDone.result == 'ok' ){
            $row.slideUp(400, function(){$row.remove()});
        }
    });
}


function page_init() {
    $('body').on('click', 'button.btnAdd',     fnBtnAdd);
    $('body').on('click', 'a.deleteIcon.coll', fnDelete);
    $('body').on('click', 'a.linkDelete', fnDelete);

    var helpers = dust.helpers;
    helpers.timeFromNow = function(chunk, ctx, bodies, params) {
        var time = helpers.tap(params.time, chunk, ctx);
        return time ? chunk.write( moment(time).fromNow() )
            : chunk;
    };
    helpers.timeStamp = function(chunk, ctx, bodies, params) {
        var time  = helpers.tap(params.time, chunk, ctx),
            format = helpers.tap(params.format, chunk, ctx) || 'YYYY-MM-DD HH:mm';

        return time ? chunk.write( moment(time).format(format) )
                    : chunk;
    };


}
