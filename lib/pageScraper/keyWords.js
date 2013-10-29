/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 11/11/12
 * Time: 20:00
 * To change this template use File | Settings | File Templates.
 */

var util = require('util')
    , fs   = require('fs')
    , path = require('path')
    , _ = require('lodash')
    , directory = __dirname
    , stop_words = {}
    ;

module.exports = {
     add_locale: function( locale, done){
         locale = locale || 'en';
         var i=0,sFile = path.join( directory, 'stop-words_' + locale + '.json');
         fs.readFile( sFile, 'utf-8', function(err,text){
             if( !err ){
                 stop_words[locale] = JSON.parse('' + text);
                 for(var k in stop_words[locale]){
                    i++;
                 }
                 done(err, 'Locale:' + locale + ', ' + i) ;
             }else{
                 done(err);
             }
         });
     },
     makeList : function ( s, keys, threshold, locale  ){
       keys = keys || {};
       threshold = threshold || 3;
       locale = 'en'; // locale || 'en';
       var stopWords = stop_words[locale],
           wordCounts = {},
           Words = [],
           words = s.split(/\W/),
           i;

      for(i = 0; i < words.length; i++){
        var w = words[i].toLocaleLowerCase();
        if( w && w.length > 2 && !stopWords.hasOwnProperty( w ) ) {
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
      }

      for( i in keys ){
        if( wordCounts.hasOwnProperty( i ) ) { continue; }
        var found = s.split(i);
        if( found && found.length > 2){
          wordCounts[ i ] = found.length - 1;
        }
      }

      for(i in wordCounts){
        if( wordCounts.hasOwnProperty( i ) && wordCounts[i] > threshold ){
          Words.push({word:i, count:wordCounts[i]});
        }
      }

      Words.sort(function(a, b) {
        if (a.count < b.count) { return 1; }
        if (a.count > b.count) { return -1; }
        return a.word > b.word;
      });


/*    find compound tags of 2,3 and 4 words

      var topLimit = limit,
          top =  Words.slice(0, limit);

      for(i=0; i< topLimit; i++){
        var R = [];
        for(var z=0; z < topLimit; z++){
          if( z !== i ){
             var regEx = new RegExp( "(" + Words[i].word + "\s?" + Words[z].word  + ")"  , 'gi');
             var repetitions = s.split(regEx );
             if(repetitions.length > threshold ){
               Words.splice(i,0, {word: Words[i].word + " " + Words[z].word, count: repetitions.length});
               i--;
               topLimit++;
             }
          }
        }

      }
*/

 //     for( i = 0; i < limit && Words[i]; i++ ){
 //       result[ Words[i].word  ] =  Words[i].count;
 //     }

      return {
          locale:locale,
          words: Words,
          text: s
      };
    }
};


