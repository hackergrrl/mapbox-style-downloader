#!/usr/bin/env node


// var finalhandler = require('finalhandler')
// var Router = require('router')
// var tilelive = require('tilelive-cache')(require('tilelive'))
// require('mbtiles').registerProtocols(tilelive)
// require('tilelive-file').registerProtocols(tilelive)

// var config = require('../config')

// module.exports = function (tileUri) {
//   var router = Router()

//   router.get('/:z(\\d+)/:x(\\d+)/:y(\\d+).vector.pbf', function (req, res) {
//     var z = req.params.z | 0
//     var x = req.params.x | 0
//     var y = req.params.y | 0

//     return tilelive.load(tileUri, function (err, src) {
//       if (err) {
//         res.statusCode = 500
//         return res.end(err.message)
//       }

//       return src.getTile(z, x, y, function (err, data, headers) {
//         if (err) {
//           res.statusCode = 404
//           return res.end()
//         }

//         Object.keys(headers).forEach(function (k) {
//           var v = headers[k]
//           res.setHeader(k, v)
//         })

//         return res.end(data)
//       })
//     })
//   })

const ecstatic = require('ecstatic')
const http = require('http')
const url = require('url')
const getport = require('getport')
const path = require('path')
const fs = require('fs')

const argv = require('minimist')(process.argv.slice(2), {
  alias: {
    p: 'port',
    t: 'tiledir'
  },
  default: {
    port: 8080,
    tiledir: 'tiles'
  }
})

const root = path.resolve(process.cwd(), argv._[0] || '')
const styleFile = path.join(root, 'style.json')

getport(argv.port, function (err, port) {
  if (err) throw err

  http.createServer(function (req, res) {
    if (url.parse(req.url).pathname.startsWith('/' + argv.tiledir)) {
      res.setHeader('content-encoding', 'gzip')
    }
    if (url.parse(req.url).pathname === '/style.json') {
      return serveStyleFile(req, res)
    }
    ecstatic({ root: root, cors: true })(req, res)
  }).listen(port, function () {
    console.log('listening on port', port)
  })
})

function serveStyleFile (req, res) {
  fs.stat(styleFile, function (err, stat) {
    if (err) console.error(err)
    fs.readFile(styleFile, 'utf8', function (err, data) {
      if (err) console.error(err)
      data = new Buffer(data.replace(/\{host\}/gm, 'http://' + req.headers.host))
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
