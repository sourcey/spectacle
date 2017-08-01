var Handlebars = require('handlebars')
var common = require('../lib/common')

module.exports = function(value, options) {
  var cloned = common.formatExample(value, options.data.root, options.hash)
  if (!cloned)
  	return '';
  var html = common.printSchema(cloned)
  return new Handlebars.SafeString(html)
};
