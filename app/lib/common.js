var cheerio = require('cheerio')
var marked = require('marked')
var highlight = require('highlight.js')
var _ = require('lodash')

var common = {

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

     var html = marked(value)
     // We strip the surrounding <p>-tag, if
     if (stripParagraph) {
         var $ = cheerio("<root>" + html + "</root>")
         // Only strip <p>-tags and only if there is just one of them.
         if ($.children().length === 1 && $.children('p').length === 1) {
             html = $.children('p').html()
         }
     }
     return html;
  },

  highlight: function(code, lang) {
      var highlighted;
      if (lang) {
          try {
              highlighted = highlight.highlight(lang, code).value;
          } catch (e) {}
      }
      if (!highlighted) {
          highlighted = highlight.highlightAuto(code).value;
      }

      return '<pre><code'
          + (lang
              ? ' class="hljs ' + this.options.langPrefix + lang + '"'
              : ' class="hljs"')
          + '>'
          + highlighted //code //
          + '\n</code></pre>\n';
  },

  // formatSchema: function(value) {
  //   var cloned;
  //   if (typeof value === 'object' && typeof value.properties === 'object') {
  //     if (value.example) {
  //       // Use the supplied example
  //       value = value.example;
  //       cloned = _.cloneDeep(value)
  //     } else {
  //       // Create json object of keys : type info string
  //       value = value.properties;
  //       cloned = _.cloneDeep(value)
  //       Object.keys(cloned).forEach(function(propName) {
  //         var prop = cloned[propName];
  //         if (prop.type) {
  //           if (prop.example) {
  //             cloned[propName] = prop.example;
  //           }
  //           else {
  //             cloned[propName] = prop.type;
  //             if (prop.format) {
  //               cloned[propName] += ('(' + prop.format + ')')
  //             }
  //           }
  //         }
  //       })
  //     }
  //   }
  //   return cloned;
  // },

  formatExample: function(value, root, options) {
    if (!value) {
      // throw 'Cannot format NULL object ' + value;
      return;
    }

  	if (value.example) {
  	  return value.example;
  	}
    else if (value.schema) {
      return this.formatExampleProp(value.schema, root, options)
    }
    else if (value.type || value.properties || value.allOf)  {
      return this.formatExampleProp(value, root, options)
    }

    console.error('Cannot format object ', value)
  },

  formatExampleProp: function(ref, root, options) {
    if (!ref) {
      console.error('Cannot format NULL property')
      return;
    }

    // NOTE: Large schemas with circular references have been known to exceed
    // maximum stack size, so bail out here before that happens.
    // A better fix is required.
    // /usr/local/bin/node bin/spectacle -d test/fixtures/billing.yaml
    if (!options.depth)
      options.depth = 0;
    options.depth++;
    if (options.depth > 100) {
      // console.log('max depth', ref)
      return;
    }

    var showReadOnly = options.showReadOnly !== false
    var that = this;

    if (ref.example !== undefined) {
      return ref.example;
    }
    else if (ref.$ref) {
  	  var remoteRef = this.resolveSchemaReference(ref.$ref, root)
      if (remoteRef)
  	    return this.formatExampleProp(remoteRef, root, options)
  	}
    else if (ref.properties) { // && ref.type == 'object'
      var obj = {};
      Object.keys(ref.properties).forEach(function(k) {
        if (showReadOnly || ref.properties[k].readOnly !== true) {
          obj[k] = that.formatExampleProp(ref.properties[k], root, options)
        }
      })
      return obj;
    }
    else if (ref.allOf) {
      var obj = {};
      ref.allOf.forEach(function(parent) {
        var prop = that.formatExampleProp(parent, root, options)
        if (!prop || typeof prop == 'string') {
          // console.log('skipping property', prop, parent)
          return
        }
        obj = Object.assign(prop, obj)
      })
      return obj;
    }
  	else if (ref.items && ref.type == 'array') {
  	  return [ this.formatExampleProp(ref.items, root, options) ];
  	}
    else if (ref.type) {
  	  return ref.type + (ref.format ? ' (' + ref.format + ')' : '')
  	}

    console.error('Cannot format property ', ref)
  },

  printSchema: function(value) {
    if (!value) {
      return '';
    }

    var schemaString = JSON.stringify(value, null, 2)

    // Add an extra CRLR before the code so the postprocessor can determine
    // the correct line indent for the <pre> tag.
    var $ = cheerio.load(marked("```json\r\n" + schemaString + "\n```"))
    var definitions = $('span:not(:has(span)):contains("#/definitions/")')
    definitions.each(function(index, item) {
      var ref = $(item).html()
      var refLink = ref.replace(/&quot;/g, "").replace('#/definitions/', '#definition-')
      // TODO: This should be done in a template
      $(item).html("<a href=" + refLink + ">" + ref + "</a>")
    })

    // Remove trailing whitespace before code tag
    // var re = /([\n\r\s]+)(<\/code>)/g;
    // str = $.html().replace(re, '$2')

    // return '<pre><code class="hljs lang-json">' +
    //   this.highlight(schemaString, 'json') +
    //   '</code></pre>';

    return $.html()
  },

  resolveSchemaReference: function(reference, json) {
    reference = reference.trim()
    if (reference.lastIndexOf('#', 0) < 0) {
      console.warn('Remote references not supported yet. Reference must start with "#" (but was ' + reference + ')')
      return {};
    }
    var components = reference.split('#')
    var url = components[0];
    var hash = components[1];
    var hashParts = hash.split('/')
    // TODO : Download remote json from url if url not empty
    var current = json; //options.data.root
    // return current;
      // console.log('aaaaaaaaaaaaaaaaaa', hashParts)
    hashParts.forEach(function(hashPart) {
      // Traverse schema from root along the path
      if (hashPart.trim().length > 0) {
        if (typeof current === 'undefined') {
          console.warn("Reference '"+reference+"' cannot be resolved. '"+hashPart+"' is undefined.")
          return {};
        }
        current = current[hashPart];
      }
    })
    return current;
  }
}

// Configure highlight.js
highlight.configure({
  // "useBR": true
})

// Create a custom renderer for highlight.js compatability
var renderer = new marked.Renderer()
renderer.code = common.highlight

// Configure marked.js
marked.setOptions({
  // highlight: common.highlight,
  renderer: renderer
})

module.exports = common;
