/**
 * Block helper that compares to values. The body is executed if both value equal.
 * Example:
 *
 * ```hbs
 * {{#ifeq value 10}}
 *    Value is 10
 * {{else}}
 *    Value is not 10
 * {{/ifeq}}
 * ```
 *
 * @param {object} `v1` the first value
 * @param {object} `v2` the second value
 */
module.exports = function(v1, v2, options) {
  // http://stackoverflow.com/questions/8853396/logical-operator-in-a-handlebars-js-if-conditional
  if (v1 === v2) {
    return options.fn(this)
  }
  return options.inverse(this)
};
