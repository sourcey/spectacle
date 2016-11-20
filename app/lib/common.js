var cheerio = require('cheerio');
var entities = require('entities');
var marked = require('marked');
var highlight = require('highlight.js');

var common = {
  highlight: function(code, name) {
      var highlighted;
      if (name) {
          highlighted = highlight.highlight(name, code).value;
      } else {
          highlighted = highlight.highlightAuto(code).value;
      }
      return highlight.fixMarkup(highlighted); //highlighted; //
  },

  /**
   * Render a markdown formatted text as HTML.
   * @param {string} `value` the markdown-formatted text
   * @param {boolean} `stripParagraph` the marked-md-renderer wraps generated HTML in a <p>-tag by default.
   *      If this options is set to true, the <p>-tag is stripped.
   * @returns {string} the markdown rendered as HTML.
   */
  markdown: function(value, stripParagraph) {
     if (!value) {
         return value;
     }
     var html = marked(value);
     // We strip the surrounding <p>-tag, if
     if (stripParagraph) {
         var $ = cheerio("<root>" + html + "</root>");
         // Only strip <p>-tags and only if there is just one of them.
         if ($.children().length === 1 && $.children('p').length === 1) {
             html = $.children('p').html();
         }
     }
     return html;
  },

  printSchema: function(value) {
      if (!value) {
          return '';
      }
      var schemaString = require('json-stable-stringify')(value, { space: 2 });

      // Add an extra CRLR before the code so the postprocessor can determine
      // the correct line indent for the <pre> tag.
      var $ = cheerio.load(marked("```json\r\n" + schemaString + "\n```"));
      var definitions = $('span:not(:has(span)):contains("#/definitions/")');
      definitions.each(function(index, item) {
          var ref = $(item).html();
          var refLink = ref.replace(/&quot;/g, "").replace('#/definitions/', '#definition-')
          // TODO: This should be done in a template
          $(item).html("<a href=" + refLink + ">" + ref + "</a>");
      });

      // return '<pre><code class="hljs lang-json">' +
      //   this.highlight(schemaString, 'json') +
      //   '</code></pre>';

      return $.html();
  },

  resolveSchemaReference: function(reference, json) {
    reference = reference.trim();
    if (reference.lastIndexOf('#', 0) < 0) {
      console.warn('Remote references not supported yet. Reference must start with "#" (but was ' + reference + ')')
      return {};
    }
    var components = reference.split('#');
    var url = components[0];
    var hash = components[1];
    var hashParts = hash.split('/');
    // TODO : Download remote json from url if url not empty
    var current = json; //options.data.root
    hashParts.forEach(function(hashPart) {
      // Traverse schema from root along the path
      if (hashPart.trim().length > 0) {
        if (typeof current === 'undefined') {
          console.warn("Reference '"+reference+"' cannot be resolved. '"+hashPart+"' is undefined.");
          return {};
        }
        current = current[hashPart];
      }
    })
    return current;
  }
}

highlight.configure({
    // "useBR": true
});

marked.setOptions({
    highlight: common.highlight
});

module.exports = common;
