var Handlebars = require('handlebars');
var common = require('../lib/common');

module.exports = function(value, options) {
  var cloned = common.formatSchema(value);
  if (options.hash.type == 'array')
    cloned = [cloned];
  var html = common.printSchema(cloned);
  return new Handlebars.SafeString(html)
};
