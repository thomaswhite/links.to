/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 14/07/12
 * Time: 09:57
 * To change this template use File | Settings | File Templates.
 */

module.exports = {
     parseParam: function (body){
        var param = {},i ;
        for( i in body){
            var value =body[i],
                sValue = ('' + body[i]).trim(),
                name = i,
                step = param;

            if( i.indexOf('.') > -1 ){
                if( !sValue ) continue;
                var parts = i.split('.');

                for(var l=0; l < parts.length-1 ; l++ ){
                    if( 'undefined' == typeof step[ parts[l] ]){
                        step[ parts[l] ] = {};
                    }
                    step = step[ parts[l] ];
                }
                // TODO: what if there is an existing value there? then change it to an array
                name = parts[l];
            }

            if(Array.isArray(value)){
                for( var a = 0; a < value.length; a++ ){
                    if( !value[a]){
                        value.splice(a,1);
                        a--;
                    }
                }
                step[name] = value;
            }else{
                step[name] = unescape(sValue);
            }
        }
        return param;
    },

    /**
     * Pick some selected properties defined in pickParam from object org
     * @param org
     * @param pickArr
     * @return {Object}
     */
    pick : function ( org, pickArr ){
    var result = {};
    for(var i=0; i < pickArr.length; i++){
        var key = pickArr[i],
            value = org[key],
            delimPos = key.indexOf(':'),
            parts = delimPos == -1 ? [key] : [ key.substr(0,delimPos), key.substr( delimPos +1 )];

        if( parts.length > 1){
            key = parts[0].trim();

            var steps = parts[1].trim().split('.');
            var tokenToReplace = parts[1].trim().split('#');

            if( tokenToReplace.length == 3 ){
                tokenToReplace[1] = org[  tokenToReplace[1]];
                value = tokenToReplace.join('');
            }else if( steps.length == 1 ){
                value = org[ steps[0] ];
            }else{
                for(value = org; value && steps.length; ){
                    value = value[ steps.shift()  ];
                }
            }
        }
        if( value ){
            if( typeof value == 'string' || typeof value == 'number' ){
                value = '' + value;
                value = value.trim().replace('\/','/');
            }
            if( value == 'undefined' ||  value == 'undefined undefined' ) value = '';
            result[key] = value;
        }
    }
    return result;
}


};