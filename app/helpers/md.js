var Handlebars = require('handlebars')
var common = require('../lib/common')

/**
 * Render a markdown formatted text as HTML.
 * @param {string} `value` the markdown-formatted text
 * @param {boolean} `options.hash.stripParagraph` the marked-md-renderer wraps generated HTML in a <p>-tag by default.
 *      If this options is set to true, the <p>-tag is stripped.
 * @returns {Handlebars.SafeString} a Handlebars-SafeString containing the provieded
 *      markdown, rendered as HTML.
 */
module.exports = function(value, options) {
  var html = common.markdown(value, options.hash ? options.hash.stripParagraph : false)
  return new Handlebars.SafeString(html)
};
