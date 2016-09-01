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
    
  var clonedModel = JSON.parse(JSON.stringify(model));
  Object.keys(clonedModel).forEach(function(propName) {
    var prop = clonedModel[propName];
    if (prop.type) {
        clonedModel[propName] = prop.type;
      if (prop.format) {
          clonedModel[propName] += ('(' + prop.format + ')');
      }
    }
  })
  if (options.hash.type == 'array')
      clonedModel = [clonedModel];
  var html = common.printSchema(clonedModel);
  // html = common.highlight(html, 'json')
  // html = entities.decodeHTML(html); html;
  return new Handlebars.SafeString(html);
};
