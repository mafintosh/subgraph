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

#### `var sg = subgraph(levelupInstance, [options])`

Create a new subgraph instance. Options include:

``` js
{
  prefix: 'optional-sublevel-prefix'
}
```

#### `var ws = sg.createAppendStream([link])`

Create an append stream. The values you write to it will be linked together.
When the stream emits `finish` it will have a `.key` property that contains the latest link
and a `.length` property that contains the number of nodes written

Optionally you can provide a `link` in the constructor for the first node to append to.

#### `var rs = sg.createReadStream(key)`

Create a read stream from a key.
Will read out values in reverse order of writes to the append stream.

#### `var ws = sg.createWriteStream(key)`

Create a write stream from a key. Will verify that the values written matches the key when hashed.

#### `sg.add(link, value, [cb])`

Shorthand for only adding a single value

#### `sg.get(key, cb)`

Shorthand for getting a single value

#### `sg.root(key, cb)`

Returns the root of a stream. If a write stream was ended prematurely / destroyed the root returned will
have a link property.

``` js
sg.root(someKey, function (err, node) {
  console.log('root is', node)
  console.log('the stream is partially written?', !!root.link)
})
```

## License

MIT
