var common = require('../lib/common')

/**
 * Resolve a (local) json schema $ref and return the referenced object.
 * @param reference
 */
module.exports = function(reference, options) {
  var model = common.resolveSchemaReference(reference, options.data.root)
  if (typeof model === 'object' && typeof model.properties === 'object')
    model = model.properties;
  return model;
};
