var framedHash = require('framed-hash')

module.exports = hash

function hash (index, data, link) {
  var sha = framedHash('sha256')
  sha.update(index.toString())
  sha.update(data)
  if (link) sha.update(link)
  return sha.digest()
}
