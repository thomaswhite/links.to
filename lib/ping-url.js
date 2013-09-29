/**
 * Created by Thomas on 28/09/13.
 */

var request = require('request')
    , _ = require('lodash')
    , url = require('url')
    , default_request_options = {
        "uri": ""
        , "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22"
        }
        , "method":"GET"
        , "followRedirect" : true
        , "followAllRedirects" : true
        , "maxRedirects" : 10
        , "encoding" : "UTF-8"
        , "timeout": 12000
    }
;

module.exports = {
    ping : function ( url, options, callback ){
        var request_options = _.merge( {}, default_request_options, options, {uri:url });
        request_options.jar = request.jar();
        request(request_options, function (err, response, body) {
            var found = {
                    url:request_options.uri,
                    statusCode: response ? response.statusCode : -1 ,
                    state: response && response.statusCode == 200 ?  'found' :  'not-found',
                    body: body
                }
                ;
            if( err ){
                err.url = url;
            }
            callback( err, found );
        });
    }
};