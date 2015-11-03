var protobuf = require('protocol-buffers')

module.exports = protobuf([
  'message Node {',
  '  required bytes value = 1;',
  '  optional bytes link = 2;',
  '  required uint64 index = 3;',
  '}'
].join('\n'))
