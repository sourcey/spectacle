var Handlebars = require('handlebars');
var common = require('../lib/common');

module.exports = function(reference, options) {
  if (!reference) {
    console.error("Cannot print null reference.");
    return '';
  }
  var model = common.resolveSchemaReference(reference, options.data.root);
  var cloned = common.formatSchema(model);
  if (options.hash.type == 'array')
    cloned = [cloned];
  var html = common.printSchema(cloned);
  return new Handlebars.SafeString(html);
};
