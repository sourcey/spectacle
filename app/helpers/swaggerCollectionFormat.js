module.exports = function(value, paramName) {
  return {
    'csv': 'comma separated (`' + paramName + '=aaa,bbb`)',
    'ssv': 'space separated (`' + paramName + '=aaa bbb`)',
    'tsv': 'tab separated (`' + paramName + '=aaa\\tbbb`)',
    'pipes': 'pipe separated (`' + paramName + '=aaa|bbb`)',
    'multi': 'multiple parameters (`' + paramName + '=aaa&' + paramName + '=bbb`)'
  }[value]
};
