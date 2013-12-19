require(['domReady!', "tiny-pubsub"], function ( doc, tiny ) {
    tiny.pub('page-loaded');
    return doc;
});