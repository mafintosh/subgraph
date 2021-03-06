var bulk = require('bulk-write-stream')
var from = require('from2')
var equals = require('buffer-equals')
var messages = require('./lib/messages')
var hash = require('./lib/hash')

module.exports = Subgraph

function Subgraph (db, opts) {
  if (!(this instanceof Subgraph)) return new Subgraph(db, opts)
  if (!opts) opts = {}
  this.prefix = opts.prefix ? '!' + opts.prefix + '!' : ''
  this.db = db
}

Subgraph.prototype.get = function (key, cb) {
  this.db.get(this.prefix + key.toString('hex'), {valueEncoding: messages.Node}, cb)
}

Subgraph.prototype.add = function (link, value, cb) {
  var self = this

  if (!link) return add(0, value, null)
  this.get(link, function (err, entry) {
    if (err) return cb(err)
    add(entry.index + 1, value, link)
  })

  function add (index, value, link) {
    var key = hash(index, value, link)
    var entry = {index: index, value: value, link: link}
    self.db.put(self.prefix + key.toString('hex'), messages.Node.encode(entry), function (err) {
      if (err) return cb(err)
      cb(null, key)
    })
  }
}

Subgraph.prototype.root = function (key, cb) {
  var rs = this.createReadStream(key)
  var root = null

  rs.on('data', function (data) {
    root = data
  })

  rs.on('error', done)
  rs.on('end', done)

  function done (err) {
    if (err) return cb(err)
    cb(null, root)
  }
}

Subgraph.prototype.createAppendStream = function (link) {
  var self = this
  var count = 0
  var stream = bulk.obj(write, flush)
  var first = true

  return stream

  function write (datas, cb) {
    if (first && link) {
      first = false
      init(datas, cb)
      return
    }

    var batch = new Array(datas.length)

    for (var i = 0; i < datas.length; i++) {
      var data = toBuffer(datas[i], 'utf-8')
      var index = count++
      var node = messages.Node.encode({
        value: data,
        link: link,
        index: index
      })

      link = hash(index, data, link)
      batch[i] = {type: 'put', key: self.prefix + link.toString('hex'), value: node}
    }

    self.db.batch(batch, cb)
  }

  function init (datas, cb) {
    self.get(link, function (err, node) {
      if (err) return cb(err)
      count = node.index + 1
      write(datas, cb)
    })
  }

  function flush (cb) {
    stream.length = count
    stream.key = link
    cb()
  }
}

Subgraph.prototype.createWriteStream = function (link) {
  if (!link) throw new Error('key is required')
  link = toBuffer(link)

  var self = this
  var stream = bulk.obj(write)

  return stream

  function write (datas, cb) {
    var batch = new Array(datas.length)

    for (var i = 0; i < datas.length; i++) {
      var data = datas[i]
      if (!equals(hash(data.index, data.value, data.link), link)) return cb(new Error('Checksum mismatch'))
      batch[i] = {
        type: 'put',
        key: self.prefix + link.toString('hex'),
        value: messages.Node.encode(data)
      }
      link = data.link
    }

    self.db.batch(batch, cb)
  }
}

Subgraph.prototype.createReadStream = function (link) {
  if (!link) throw new Error('key is required')
  link = toBuffer(link)

  var self = this
  var stream = from.obj(read)
  stream.length = -1

  return stream

  function read (size, cb) {
    if (!link) return cb(null, null)
    self.db.get(self.prefix + link.toString('hex'), {valueEncoding: messages.Node}, function (err, node) {
      if (err && err.notFound) {
        if (first) ready(0)
        return cb(null, null)
      }
      if (err) return cb(err)
      var first = stream.length === -1
      if (first) ready(node.index + 1)
      link = node.link
      cb(null, node)
    })
  }

  function ready (length) {
    stream.length = length
    stream.emit('ready')
  }
}

function toBuffer (buf, enc) {
  if (typeof buf === 'string') return new Buffer(buf, enc)
  return buf
}
