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
    ;

var stop_words={},
    StopWords = { };

    StopWords.en =  [
      "'ll", "'ve", "I", "a", "a's", "able", "about", "above", "abroad",
      "abst", "accordance", "according", "accordingly", "across", "act",
      "actually", "added", "adj", "adopted", "affected", "affecting",
      "affects", "after", "afterwards", "again", "against", "ago", "ah",
      "ahead", "ain't", "all", "allow", "allows", "almost", "alone", "along",
      "alongside", "already", "also", "although", "always", "am", "amid",
      "amidst", "among", "amongst", "amoungst", "amount", "an", "and",
      "announce", "another", "any", "anybody", "anyhow", "anymore", "anyone",
      "anything", "anyway", "anyways", "anywhere", "apart", "apparently",
      "appear", "appreciate", "appropriate", "approximately", "are", "aren",
      "aren't", "arent", "arise", "around", "as", "aside", "ask", "asking",
      "associated", "at", "auth", "available", "away", "awfully", "b", "back",
      "backward", "backwards", "be", "became", "because", "become", "becomes",
      "becoming", "been", "before", "beforehand", "begin", "beginning",
      "beginnings", "begins", "behind", "being", "believe", "below", "beside",
      "besides", "best", "better", "between", "beyond", "bill", "biol",
      "both", "bottom", "brief", "briefly", "but", "by", "c", "c'mon", "c's",
      "ca", "call", "came", "can", "can't", "cannot", "cant", "caption",
      "cause", "causes", "certain", "certainly", "changes", "clearly", "co",
      "com", "come", "comes", "computer", "con", "concerning", "consequently",
      "consider", "considering", "contain", "containing", "contains",
      "corresponding", "could", "couldn't", "couldnt", "course", "cry",
      "currently", "d", "dare", "daren't", "date", "de", "definitely",
      "describe", "described", "despite", "detail", "did", "didn't",
      "different", "directly", "do", "does", "doesn't", "doing", "don't",
      "done", "down", "downwards", "due", "during", "e", "each", "ed", "edu",
      "effect", "eg", "eight", "eighty", "either", "eleven", "else",
      "elsewhere", "empty", "end", "ending", "enough", "entirely",
      "especially", "et", "et-al", "etc", "even", "ever", "evermore", "every",
      "everybody", "everyone", "everything", "everywhere", "ex", "exactly",
      "example", "except", "f", "fairly", "far", "farther", "few", "fewer",
      "ff", "fifteen", "fifth", "fify", "fill", "find", "fire", "first",
      "five", "fix", "followed", "following", "follows", "for", "forever",
      "former", "formerly", "forth", "forty", "forward", "found", "four",
      "from", "front", "full", "further", "furthermore", "g", "gave", "get",
      "gets", "getting", "give", "given", "gives", "giving", "go", "goes",
      "going", "gone", "got", "gotten", "greetings", "h", "had", "hadn't",
      "half", "happens", "hardly", "has", "hasn't", "hasnt", "have",
      "haven't", "having", "he", "he'd", "he'll", "he's", "hed", "hello",
      "help", "hence", "her", "here", "here's", "hereafter", "hereby",
      "herein", "heres", "hereupon", "hers", "herse", "herself", "hes", "hi",
      "hid", "him", "himse", "himself", "his", "hither", "home", "hopefully",
      "how", "how's", "howbeit", "however", "hundred", "i", "i'd", "i'll",
      "i'm", "i've", "id", "ie", "if", "ignored", "im", "immediate",
      "immediately", "importance", "important", "in", "inasmuch", "inc",
      "inc.", "indeed", "index", "indicate", "indicated", "indicates",
      "information", "inner", "inside", "insofar", "instead", "interest",
      "into", "invention", "inward", "is", "isn't", "it", "it'd", "it'll",
      "it's", "itd", "its", "itse", "itself", "j", "just", "k", "keep",
      "keeps", "kept", "keys", "kg", "km", "know", "known", "knows", "l",
      "largely", "last", "lately", "later", "latter", "latterly", "least",
      "less", "lest", "let", "let's", "lets", "like", "liked", "likely",
      "likewise", "line", "little", "look", "looking", "looks", "low",
      "lower", "ltd", "m", "made", "mainly", "make", "makes", "many", "may",
      "maybe", "mayn't", "me", "mean", "means", "meantime", "meanwhile",
      "merely", "mg", "might", "mightn't", "mill", "million", "mine", "minus",
      "miss", "ml", "more", "moreover", "most", "mostly", "move", "mr", "mrs",
      "much", "mug", "must", "mustn't", "my", "myse", "myself", "n", "na",
      "name", "namely", "nay", "nd", "near", "nearly", "necessarily",
      "necessary", "need", "needn't", "needs", "neither", "never", "neverf",
      "neverless", "nevertheless", "new", "next", "nine", "ninety", "no",
      "no-one", "nobody", "non", "none", "nonetheless", "noone", "nor",
      "normally", "nos", "not", "noted", "nothing", "notwithstandi", "novel",
      "now", "nowhere", "o", "obtain", "obtained", "obviously", "of", "off",
      "often", "oh", "ok", "okay", "old", "omitted", "on", "once", "one",
      "one's", "ones", "only", "onto", "opposite", "or", "ord", "other",
      "others", "otherwise", "ought", "oughtn't", "our", "ours", "ours ",
      "ourselves", "out", "outside", "over", "overall", "owing", "own", "p",
      "page", "pages", "part", "particular", "particularly", "past", "per",
      "perhaps", "placed", "please", "plus", "poorly", "possible", "possibly",
      "potentially", "pp", "predominantly", "present", "presumably",
      "previously", "primarily", "probably", "promptly", "proud", "provided",
      "provides", "put", "q", "que", "quickly", "quite", "qv", "r", "ran",
      "rather", "rd", "re", "readily", "really", "reasonably", "recent",
      "recently", "ref", "refs", "regarding", "regardless", "regards",
      "related", "relatively", "research", "respectively", "resulted",
      "resulting", "results", "right", "round", "run", "s", "said", "same",
      "saw", "say", "saying", "says", "sec", "second", "secondly", "section",
      "see", "seeing", "seem", "seemed", "seeming", "seems", "seen", "self",
      "selves", "sensible", "sent", "serious", "seriously", "seven",
      "several", "shall", "shan't", "she", "she'd", "she'll", "she's", "shed",
      "shes", "should", "shouldn't", "show", "showed", "shown", "showns",
      "shows", "side", "significant", "significantly", "similar", "similarly",
      "since", "sincere", "six", "sixty", "slightly", "so", "some",
      "somebody", "someday", "somehow", "someone", "somethan", "something",
      "sometime", "sometimes", "somewhat", "somewhere", "soon", "sorry",
      "specifically", "specified", "specify", "specifying", "state", "states",
      "still", "stop", "strongly", "sub", "substantially", "successfully",
      "such", "sufficiently", "suggest", "sup", "sure", "system", "t", "t's",
      "take", "taken", "taking", "tell", "ten", "tends", "th", "than",
      "thank", "thanks", "thanx", "that", "that'll", "that's", "that've",
      "thats", "the", "their", "theirs", "them", "themselves", "then",
      "thence", "there", "there'd", "there'll", "there're", "there's",
      "there've", "thereafter", "thereby", "thered", "therefore", "therein",
      "thereof", "therere", "theres", "thereto", "thereupon", "these", "they",
      "they'd", "they'll", "they're", "they've", "theyd", "theyre", "thick",
      "thin", "thing", "things", "think", "third", "thirty", "this",
      "thorough", "thoroughly", "those", "thou", "though", "thoughh",
      "thousand", "three", "throug", "through", "throughout", "thru", "thus",
      "til", "till", "tip", "to", "together", "too", "took", "top", "toward",
      "towards", "tried", "tries", "truly", "try", "trying", "ts", "twelve",
      "twenty", "twice", "two", "u", "un", "under", "underneath", "undoing",
      "unfortunately", "unless", "unlike", "unlikely", "until", "unto", "up",
      "upon", "ups", "upwards", "us", "use", "used", "useful", "usefully",
      "usefulness", "uses", "using", "usually", "v", "value", "various",
      "versus", "very", "via", "viz", "vol", "vols", "vs", "w", "want",
      "wants", "was", "wasn't", "way", "we", "we'd", "we'll", "we're",
      "we've", "wed", "welcome", "well", "went", "were", "weren't", "what",
      "what'll", "what's", "what've", "whatever", "whats", "when", "when's",
      "whence", "whenever", "where", "where's", "whereafter", "whereas",
      "whereby", "wherein", "wheres", "whereupon", "wherever", "whether",
      "which", "whichever", "while", "whilst", "whim", "whither", "who",
      "who'd", "who'll", "who's", "whod", "whoever", "whole", "whom",
      "whomever", "whos", "whose", "why", "why's", "widely", "will",
      "willing", "wish", "with", "within", "without", "won't", "wonder",
      "words", "world", "would", "wouldn't", "www", "x", "y", "yes", "yet",
      "you", "you'd", "you'll", "you're", "you've", "youd", "your", "youre",
      "yours", "yourself", "yourselves", "z", "zero"
    ];


function make_locale_stop_words(locale){
    for( var locale in StopWords){
      if(StopWords.hasOwnProperty(locale)){
        var L = stop_words[locale] = {};
        var W = StopWords[locale].sort( function(a, b) {
          if (a == b) { return 0; }
          return a < b;
        });

        for( var i=0; i< W.length; i++){
          if ( !L.hasOwnProperty( W[i] ) ) {
            L[W[i]] = 0;
          }
        }
        console.info( stop_words );
      }
    }
}

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


