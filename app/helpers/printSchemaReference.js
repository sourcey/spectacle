var Handlebars = require("handlebars");
var common = require("../lib/common");
// var entities = require("entities");

module.exports = function(reference, options) {
  if (!reference) {
    console.error("Cannot print null reference.");
    return '';
  }
  var model = common.resolveSchemaReference(reference, options.data.root);
  if (typeof model === 'object' && typeof model.properties === 'object')
    model = model.properties;
  Object.keys(model).forEach(function(propName) {
    var prop = model[propName];
    if (prop.type) {
      model[propName] = prop.type;
      if (prop.format) {
        model[propName] += ('(' + prop.format + ')');
      }
    }
  })
  if (options.hash.type == 'array')
    model = [model];
  var html = common.printSchema(model);
  // html = common.highlight(html, 'json')
  // html = entities.decodeHTML(html); html;
  return new Handlebars.SafeString(html);
};
