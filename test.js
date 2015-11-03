var tape = require('tape')
var memdb = require('memdb')
var subgraph = require('./')

tape('add one value', function (t) {
  var sg = subgraph(memdb())

  sg.add(null, 'hello', function (err, key) {
    t.error(err, 'no error')
    t.ok(key, 'had key')
    t.end()
  })
})

tape('add two values', function (t) {
  var sg = subgraph(memdb())

  sg.add(null, 'hello', function (err, link) {
    t.error(err, 'no error')
    sg.add(link, 'world', function (err, key) {
      t.error(err, 'no error')
      t.ok(key, 'had key')
      sg.get(key, function (err, entry) {
        t.error(err, 'no error')
        t.same(entry.value.toString(), 'world')
        t.same(entry.link, link)
        t.same(entry.index, 1)
        t.end()
      })
    })
  })
})

tape('append stream', function (t) {
  var sg = subgraph(memdb())
  var stream = sg.createAppendStream()

  stream.write('hello')
  stream.write('world')
  stream.write('verden')

  stream.end(function () {
    t.ok(stream.key, 'has key')
    sg.get(stream.key, function (err, entry) {
      t.error(err, 'no error')
      t.same(entry.value.toString(), 'verden')
      t.same(entry.index, 2)
      t.end()
    })
  })
})

tape('append stream with link', function (t) {
  var sg = subgraph(memdb())
  var stream = sg.createAppendStream()

  stream.write('hello')
  stream.write('world')

  stream.end(function () {
    var stream2 = sg.createAppendStream(stream.key)
    stream2.write('verden')
    stream2.end(function () {
      t.ok(stream2.key, 'has key')
      sg.get(stream2.key, function (err, entry) {
        t.error(err, 'no error')
        t.same(entry.value.toString(), 'verden')
        t.same(entry.index, 2)
        t.end()
      })
    })
  })
})

tape('read stream', function (t) {
  var sg = subgraph(memdb())
  var stream = sg.createAppendStream()

  stream.write('hello')
  stream.write('world')
  stream.write('verden')

  stream.end(function () {
    var rs = sg.createReadStream(stream.key)
    var expected = [{value: 'verden', index: 2}, {value: 'world', index: 1}, {value: 'hello', index: 0}]

    rs.on('ready', function () {
      t.same(rs.length, 3, 'length is 3')
    })
    rs.on('data', function (data) {
      t.same(expected[0].value, data.value.toString(), 'expected value')
      t.same(expected[0].index, data.index, 'expected index')
      expected.shift()
    })
    rs.on('end', function () {
      t.same(expected.length, 0, 'no more data')
      t.end()
    })
  })
})

tape('partial read stream', function (t) {
  var sg = subgraph(memdb())
  var stream = sg.createAppendStream()

  stream.write('hello')
  stream.write('world')
  stream.write('verden')

  stream.end(function () {
    sg.get(stream.key, function (err, entry) {
      t.error(err, 'no error')

      var rs = sg.createReadStream(entry.link)
      var expected = [{value: 'world', index: 1}, {value: 'hello', index: 0}]

      rs.on('ready', function () {
        t.same(rs.length, 2, 'length is 2')
      })
      rs.on('data', function (data) {
        t.same(expected[0].value, data.value.toString(), 'expected value')
        t.same(expected[0].index, data.index, 'expected index')
        expected.shift()
      })
      rs.on('end', function () {
        t.same(expected.length, 0, 'no more data')
        t.end()
      })
    })
  })
})

tape('read stream to write stream', function (t) {
  var sg = subgraph(memdb())
  var copy = subgraph(memdb())
  var stream = sg.createAppendStream()

  stream.write('hello')
  stream.write('world')
  stream.write('verden')

  stream.end(function () {
    sg.createReadStream(stream.key).pipe(copy.createWriteStream(stream.key)).on('finish', verify)
  })

  function verify () {
    var rs = copy.createReadStream(stream.key)
    var expected = [{value: 'verden', index: 2}, {value: 'world', index: 1}, {value: 'hello', index: 0}]

    rs.on('ready', function () {
      t.same(rs.length, 3, 'length is 3')
    })
    rs.on('data', function (data) {
      t.same(expected[0].value, data.value.toString(), 'expected value')
      t.same(expected[0].index, data.index, 'expected index')
      expected.shift()
    })
    rs.on('end', function () {
      t.same(expected.length, 0, 'no more data')
      t.end()
    })
  }
})

tape('read stream to bad write stream', function (t) {
  var sg = subgraph(memdb())
  var copy = subgraph(memdb())
  var stream = sg.createAppendStream()

  stream.write('hello')
  stream.write('world')
  stream.write('verden')

  stream.end(function () {
    sg.createReadStream(stream.key).pipe(copy.createWriteStream('deadbeaf')).on('error', onerror)
  })

  function onerror (err) {
    t.ok(err, 'had error')
    t.end()
  }
})

tape('resumable write stream', function (t) {
  var sg = subgraph(memdb())
  var copy = subgraph(memdb())
  var stream = sg.createAppendStream()

  stream.write('hello')
  stream.write('world')
  stream.write('verden')

  stream.end(function () {
    var rs = sg.createReadStream(stream.key)
    var ws = copy.createWriteStream(stream.key)
    rs.pipe(ws)
    rs.on('data', function () {
      rs.destroy()
      ws.end(function () {
        copy.root(stream.key, function (err, root) {
          t.error(err, 'no error')
          t.ok(root.link, 'is resumable')
          var rs = sg.createReadStream(root.link)
          var ws = copy.createWriteStream(root.link)
          rs.pipe(ws).on('finish', function () {
            t.same(rs.length, 2, 'wrote to entries')
            copy.root(stream.key, function (err, root) {
              t.error(err, 'no error')
              t.ok(!root.link, 'no longer resumable')
              t.end()
            })
          })
        })
      })
    })
  })
})
