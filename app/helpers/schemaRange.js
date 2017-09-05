var util = require('util')

/**
 *
 * @param range a json-schema object with minimum, maximum, exclusiveMinimum, exclusiveMaximum
 * @param {number} [range.minimum]
 * @param {number} [range.maximum]
 * @param {boolean} [range.minimumExclusive]
 * @param {boolean} [range.maximumExclusive]
 * @param {Handlebars} engine the current handlebars engine
 */
module.exports = function(range, options) {
  var hasMinimum = range.minimum || range.minimum === 0;
  var hasMaximum = range.maximum || range.maximum === 0;

  if (!hasMinimum && !hasMaximum) {
    // There is no range
    return "";
  }

  if (hasMinimum && !hasMaximum) {
    return util.format("x %s %d",
        range.minimumExclusive ? ">" : "\u2265",
        range.minimum)
  } else if (hasMaximum && !hasMinimum) {
    return util.format("x %s %d",
        range.maximumExclusive ? "<" : "\u2264",
        range.maximum)
  } else {
    // if (hasMaxmium && hasMinimum)
    return util.format("%d %s x %s %d",
        range.minimum,
        range.minimumExclusive ? "<" : "\u2264",
        range.minimumExclusive ? "<" : "\u2264",
        range.maximum)
    // NOTREACHED
    return util.format("x %s %d | x %s %d",
        range.minimumExclusive ? ">" : "\u2265",  // <<----- correction here
        range.minimum,
        range.maximumExclusive ? "<" : "\u2264",
        range.maximum)
  }

  // var numberSet = "";
  // if (range.type === "integer") {
  //   numberSet = "\u2208 \u2124" // ELEMENT OF - DOUBLE-STRUCK CAPITAL Z
  // } else if (range.type === "number") {
  //   numberSet = "\u2208 \u211D" // ELEMENT OF - DOUBLE-STRUCK CAPITAL R
  // }
  //
  // if (hasMinimum && !hasMaximum) {
  //   return util.format(", { x %s | x %s %d }",
  //       numberSet,
  //       range.minimumExclusive ? ">" : "\u2265",
  //       range.minimum)
  // } else if (hasMaximum && !hasMinimum) {
  //   return util.format(", { x %s | x %s %d }",
  //       numberSet,
  //       range.maximumExclusive ? "<" : "\u2264",
  //       range.maximum)
  // } else {
  //   // if (hasMaxmium && hasMinimum)
  //   return util.format(", { x %s | %d %s x %s %d }",
  //       numberSet,
  //       range.minimum,
  //       range.minimumExclusive ? "<" : "\u2264",
  //       range.maximumExclusive ? "<" : "\u2264",
  //       range.maximum)
  // }
};
