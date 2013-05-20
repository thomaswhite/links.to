
// window.onload = function()

function addScript(code){
    var s = document.createElement('script');
    s.type = 'text/javascript';
    try {
        s.appendChild(document.createTextNode(code));
        document.body.appendChild(s);
    } catch (e) {
        s.text = code;
        document.body.appendChild(s);
    }
}