/**
 * Extract then name of a subschema from a $ref property
 * @param url
 * @returns {*}
 */
module.exports = function(url) {
  return url.replace('#/definitions/', '')
};
