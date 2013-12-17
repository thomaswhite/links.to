/**
 * User: Thomas
 * Date: 08/05/13
 * Time: 21:01
 */

define([], function () {

        "use strict";

        function toType(obj) {
            return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
        }

        return {
            toType:toType
        }
});
