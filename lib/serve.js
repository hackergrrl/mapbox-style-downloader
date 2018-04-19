const ecstatic = require('ecstatic')
const http = require('http')
const url = require('url')
const getport = require('getport')
const fs = require('fs')

module.exports = serve

function serve (root, styleFile, port) {
  var server = http.createServer(function (req, res) {
    var pathname = url.parse(req.url).pathname
    if (pathname.startsWith('/tiles') && (pathname.endsWith('.pbf') || pathname.endsWith('.mvt'))) {
      // Vector tiles are gzip at rest, so need to be served as gzip
      // Raster tiles should not be served as gzip
      res.setHeader('content-encoding', 'gzip')
    }
    if (url.parse(req.url).pathname === '/style.json') {
      return serveStyleFile(styleFile, req, res)
    }
    ecstatic({ root: root, cors: true })(req, res)
  })

  getport(port, function (err, port) {
    if (err) return console.error(err)
    server.listen(port, function () {
      console.log('Listening on port:', port)
    })
  })

  return server
}

function serveStyleFile (styleFile, req, res) {
  fs.stat(styleFile, function (err, stat) {
    if (err) console.error(err)
    fs.readFile(styleFile, 'utf8', function (err, data) {
      if (err) console.error(err)
      data = Buffer.from(data.replace(/\{host\}/gm, 'http://' + req.headers.host))
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.setHeader('last-modified', (new Date(stat.mtime)).toUTCString())
      res.setHeader('content-length', data.length)
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.statusCode = 200
      res.write(data)
      res.end()
    })
  })
}
