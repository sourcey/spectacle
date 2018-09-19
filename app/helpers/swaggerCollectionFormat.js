/**
* Copyright (c) 2015 Nils Knappmeier
* https://github.com/bootprint/bootprint-openapi
*
* @license MIT
**/

module.exports = function(value, paramName) {
  return {
    'csv': 'Array values passed separated by comma: `?' + paramName + '=aaa,bbb`',
    'ssv': 'Array values passed separated by space: `?' + paramName + '=aaa bbb`',
    'tsv': 'Array values passed separated by tab: `?' + paramName + '=aaa\\tbbb`',
    'pipes': 'Array values passed separated by pipe: `?' + paramName + '=aaa|bbb`',
    'multi': 'Array values passed as multiple parameters: `?' + paramName + '=aaa&' + paramName + '=bbb`'
  }[value]
};
