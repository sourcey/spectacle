var Handlebars = require('handlebars');
var common = require('../lib/common');
var _ = require('lodash');

module.exports = function(reference, options) {
  if (!reference) {
    console.error("Cannot print null reference.");
    return '';
  }
  var model = common.resolveSchemaReference(reference, options.data.root);
  if (typeof model === 'object' && typeof model.properties === 'object')
    model = model.properties;
  var cloned = _.cloneDeep(model);
  Object.keys(cloned).forEach(function(propName) {
    var prop = cloned[propName];
    if (prop.type) {
      cloned[propName] = prop.type;
      if (prop.format) {
        cloned[propName] += ('(' + prop.format + ')');
      }
    }
  })
  if (options.hash.type == 'array')
    cloned = [cloned];
  var html = common.printSchema(cloned);
  return new Handlebars.SafeString(html);
};
