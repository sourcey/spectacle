module.exports = function(options) {
  var data = options.data.root;
  var endpoint = 'http';
  if (data.schemes) {
    data.schemes.every(function (scheme) {
      if (scheme == 'https' || scheme == 'HTTPS') {
        endpoint = 'https';
        return false;
      }
      endpoint = scheme;
      return true;
    })
  }
  endpoint += '://';
  endpoint += data.host;
  if (data.basePath) {
    // endpoint += '/'
    endpoint += data.basePath;
  }
  return endpoint;
};
