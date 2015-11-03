# subgraph

Content addressable graph where every node has at most a single link to another node

```
npm install subgraph
```

[![build status](http://img.shields.io/travis/mafintosh/subgraph.svg?style=flat)](http://travis-ci.org/mafintosh/subgraph)

## Usage

``` js
var subgraph = require('subgraph')
var sg = subgraph(levelupInstance)

var ws = sg.createAppendStream()

ws.write('hello')
ws.write('world')

ws.end(function () {
  var rs = sg.createReadStream(ws.key)

  rs.on('data', function (node) {
    console.log(node) // first {value: 'world'} then {value: 'hello'}
  })
})
```

## API

#### `var sg = subgraph(levelupInstance)`

Create a new subgraph instance

#### `var ws = sg.createAppendStream([link])`

Create an append stream. The values you write to it will be linked together.
When the stream emits `finish` it will have a `.key` property that contains the latest link
and a `.length` property that contains the number of nodes written

Optionally you can provide a `link` in the constructor for the first node to append to.

#### `var rs = sg.createReadStream(link)`

Create a read stream from a link.
Will read out values in reverse order of writes to the append stream.

#### `var ws = sg.createWriteStream(link)`

Create a write stream from a link. Will verify that the values written matches the link when hashed.

#### `sg.add(link, value, [cb])`

Shorthand for only adding a single value

#### `sg.get(link, cb)`

Shorthand for getting a single value

#### `sg.resumable(link, cb)`

If the write stream is destroyed/ended before all values are written to it will be resumable.
This method returns the latest missing link of a write stream.

## License

MIT
