var Handlebars = require("handlebars");
var common = require("../lib/common");
// var entities = require("entities");

var formatModel = function(model, options) {
    if (typeof model === 'object' && typeof model.properties === 'object')
        model = model.properties;
    
    var clonedModel = JSON.parse(JSON.stringify(model));
    Object.keys(clonedModel).forEach(function(propName) {
        var prop = clonedModel[propName];
        if (prop.type) {
            if (prop.type !== "object") {
                clonedModel[propName] = prop.type;
            } else {
                clonedModel[propName] = formatModel(prop, options)
            }
        }
            
        if (prop.format) {
            clonedModel[propName] += ('(' + prop.format + ')');
        }
    })
    
    if (options.hash.type == 'array')
        clonedModel = [clonedModel];
    
    return clonedModel;
}

module.exports = function(reference, options) {
  if (!reference) {
    console.error("Cannot print null reference.");
    return '';
  }
  var model = common.resolveSchemaReference(reference, options.data.root);
    model = formatModel(model, options);
  var html = common.printSchema(model);
  // html = common.highlight(html, 'json')
  // html = entities.decodeHTML(html); html;
  return new Handlebars.SafeString(html);
};
