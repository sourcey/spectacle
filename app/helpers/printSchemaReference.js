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


var Handlebars = require('handlebars');
var common = require('../lib/common');
var _ = require('lodash');

module.exports = function(reference, options) {
  if (!reference) {
    console.error("Cannot print null reference.");
    return '';
  }
  var model = common.resolveSchemaReference(reference, options.data.root);
  if (typeof model === 'object' && typeof model.properties === 'object') {
    if (model['example']) {
      // Use the supplied example
      model = model.example;
      var cloned = _.cloneDeep(model);
    } else {
      // Create json object of keys : type info string
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
    }
  }
  if (options.hash.type == 'array')
    cloned = [cloned];
  var html = common.printSchema(cloned);
  return new Handlebars.SafeString(html);
};