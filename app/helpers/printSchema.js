var Handlebars = require("handlebars");
var common = require("../lib/common");
// var entities = require("entities");

module.exports = function(value, options) {
  var html = common.printSchema(value);
  return new Handlebars.SafeString(html)
};
