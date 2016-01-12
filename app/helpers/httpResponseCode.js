module.exports = function(code) {
  // Comments refer to the section number in rfc2616
  // If an rfc number is specified, the code is
  // documented in the specified rfc.
  return {
    '100': 'Continue', // 10.1.1
    '101': 'Switching Protocols', // 10.1.2
    '200': 'OK', // 10.2.1
    '201': 'Created', // 10.2.2
    '202': 'Accepted', // 10.2.3
    '203': 'Non-Authoritative Information', // 10.2.4
    '204': 'No Content', // 10.2.5
    '205': 'Reset Content', // 10.2.6
    '206': 'Partial Content', // 10.2.7
    '207': 'Multi-status', // rfc4918, 11.1
    '208': 'Already Reported', // rfc5842, 7.1
    '226': 'IM Used', // rfc3229, 10.4.1
    '300': 'Multiple Choices', // 10.3.1
    '301': 'Moved Permanently', // 10.3.2
    '302': 'Found', // 10.3.3
    '303': 'See Other', // 10.3.4
    '304': 'Not Modified', // 10.3.5
    '305': 'Use Proxy', // 10.3.6
    '306': '(Unused)', // 10.3.7
    '307': 'Temporary Redirect', // 10.3.8
    '400': 'Bad Request', // 10.4.1
    '401': 'Unauthorized', // 10.4.2
    '402': 'Payment Required', // 10.4.3
    '403': 'Forbidden', // 10.4.4
    '404': 'Not Found', // 10.4.5
    '405': 'Method Not Allowed', // 10.4.6
    '406': 'Not Acceptable', // 10.4.7
    '407': 'Proxy Authentication Required', // 10.4.8
    '408': 'Request Timeout', // 10.4.9
    '409': 'Conflict', // 10.4.10
    '410': 'Gone', // 10.4.11
    '411': 'Length Required', // 10.4.12
    '412': 'Precondition Failed', // 10.4.13
    '413': 'Request Entity Too Large', // 10.4.14
    '414': 'Request-URI Too Long', // 10.4.15
    '415': 'Unsupported Media Type', // 10.4.16
    '416': 'Requested Range Not Satisfiable', // 10.4.17
    '417': 'Expectation Failed', // 10.4.18
    '421': 'Misdirected Request', // rfc7540, 9.1.2
    '422': 'Unprocessable Entity', // rfc4918, 11.2
    '423': 'Locked', // rfc4918, 11.3
    '424': 'Failed Dependency', // rfc4918, 11.4
    '426': 'Upgrade Required', // rfc2817, 6
    '428': 'Precondition Required', // rfc6585, 3
    '429': 'Too Many Requests', // rfc6585, 4
    '431': 'Request Header Fields Too Large', // rfc6585, 5
    '500': 'Internal Server Error', // 10.5.1
    '501': 'Not Implemented', // 10.5.2
    '502': 'Bad Gateway', // 10.5.3
    '503': 'Service Unavailable', // 10.5.4
    '504': 'Gateway Timeout', // 10.5.5
    '505': 'HTTP Version Not Supported', // 10.5.6
    '506': 'Variant Also Negotiates',
    '507': 'Insufficient Storage', // rfc4918, 11.5
    '508': 'Loop Detected', // rfc5842, 7.2
    '510': 'Not Extended', // rfc2774, 7
    '511': 'Network Authentication Required' // rfc6585, 6
  }[code]
};
