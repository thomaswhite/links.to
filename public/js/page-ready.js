require(['domReady!', "tiny-pubsub"], function ( doc, tiny ) {
    tiny.pub('page-ready');
    return doc;
});