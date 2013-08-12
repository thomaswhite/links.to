(function() {
  var fs, jsdom, parsehtml;

  jsdom = require("jsdom");

  fs = require("fs");

  parsehtml = function(file, callback) {
    var html;
    html = fs.readFileSync(file).toString();
    return jsdom.env({
      html: html,
      scripts: ["./req/jquery.min.js"],
      done: function(errors, window) {
        var $, anchors, itemdoubleclick, results;
        $ = window.$;
        itemdoubleclick = "";
        results = new Array();
        anchors = $("dl").find("a");
        anchors.each(function(i, e) {
          var add_date, name, result, tags, url;
          url = $(e).attr("href");
          name = $(e).text();
          add_date = $(e).attr("add_date");
          tags = new Array();
          $(e).parents("dl").each(function(ii, ee) {
            var folder, tag;
            folder = $(ee).prev();
            tag = folder.text();
            return tags.push(tag);
          });
          result = {
            url: url,
            name: name,
            add_date: add_date,
            tags: tags
          };
          return results.push(result);
        });
        if (typeof callback === "function") {
          return callback(results);
        } else {
          return console.warn("Callback isn't a function.");
        }
      }
    });
  };

  module.exports = parsehtml;

}).call(this);
