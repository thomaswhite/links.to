/**
 * Created with JetBrains WebStorm.
 * User: twhite_
 * Date: 15/05/13
 * Time: 16:22
 * To change this template use File | Settings | File Templates.
 */

var fudgeFactor = 24 / 1920; // defines the size of the body text for the maximum screen width
function fontFix() {
    var width = window.innerWidth || document.documentElement.clientWidth;
    document.body.style.fontSize = Math.max(14, fudgeFactor * width ) + "px";
};
window.addEventListener('resize', fontFix);
window.addEventListener('load', fontFix);
