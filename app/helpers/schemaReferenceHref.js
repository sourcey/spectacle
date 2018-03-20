var common = require('../lib/common')

/**
 * Build href links for local and remote references.
 * @param reference
 */
module.exports = function(reference, options) {
  if (reference.indexOf('#') === 0) {
    // local references
    return reference
  }
  else {
    // remote references
    var path = ' #definition-'
    path += require('./htmlId')(reference)
    return path
  }
};
