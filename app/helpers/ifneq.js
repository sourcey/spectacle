/**
 * Block helper that compares to values. The body is executed if values are not equal.
 * Example:
 *
 * ```hbs
 * {{#ifneq value 10}}
 *    Value is not 10
 * {{else}}
 *    Value is 10
 * {{/ifeq}}
 * ```
 *
 * @param {object} `v1` the first value
 * @param {object} `v2` the second value
 */
module.exports = function(v1, v2, options) {
  if (v1 !== v2) {
    return options.fn(this)
  }
  return options.inverse(this)
};
