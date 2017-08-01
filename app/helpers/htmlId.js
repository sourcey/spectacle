/**
 * Replace all characters that may not be used in HTML id-attributes by '-'.
 * There is still the restriction that IDs may only start with letters, which
 * is not addressed by this helper.
 */
module.exports = function(value) {
  return value.replace(/[^A-Za-z0-9-_:.]/g, "-")
};
