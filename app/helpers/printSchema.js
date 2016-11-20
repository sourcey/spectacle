var Handlebars = require('handlebars');
var common = require('../lib/common');

module.exports = function(value, options) {
  var html = common.printSchema(value);
  return new Handlebars.SafeString(html)
};
