var Handlebars = require('handlebars')

/**
 * This block-helper can be used to iterate objects sorted by key. It behaves like the built-in
 * `{{#each ...}}`-helper except that it can only be used for objects and the output is in a
 * deterministic order (i.e. sorted).
 *
 * Example template:
 *
 * ```handlebars
 * {{#eachSorted obj}}
 *    {{@index}} of {{@length}}: {{@key}}={{.}}
 * {{/eachSorted}}
 * ```
 *
 * With the data `{ b: 'another one', a: 'first' }`, ignoring newlines and indents, this will output
 *
 * ```text
 * 1 of 2: a=first
 * 2 of 2: b=another one
 * ```
 *
 * The helper will set the following @-values according to the Handlebars documentation:
 * `@first`, `@index`, `@key`, `@last`, `@length`
 * @name eachSorted
 * @returns {string}
 * @api public
 */
module.exports = function(context, options) {
  var ret = "";
  var data;
  if (typeof context !== "object") {
    return ret;
  }
  var keys = Object.keys(context)
  keys.sort(function(a,b) {
    // http://stackoverflow.com/questions/8996963/how-to-perform-case-insensitive-sorting-in-javascript
    a = String(a).toLowerCase()
    b = String(b).toLowerCase()
    if (a == b) return 0;
    if (a > b) return 1;
    return -1;
  }).forEach(function(key, index) {
    if (options.data) {
      data = Handlebars.createFrame(options.data || {})
      data.index = index;
      data.key = key;
      data.length = keys.length;
      data.first = index === 0;
      data.last = index === keys.length - 1;
    }
    ret = ret + options.fn(context[key], {data: data})
  })
  return ret;
};
