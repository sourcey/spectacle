var common = require('../lib/common');

/**
 * Resolve a (local) json schema $ref and replace context to referenced object.
 * @param reference
 * @param options
 */
module.exports = function(reference, options) {
  return options.fn(reference ? common.resolveSchemaReference(reference, options.data.root) : this);
};
