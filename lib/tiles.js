process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || Math.ceil(Math.max(4, require('os').cpus().length * 1.5))

const mkdirp = require('mkdirp')
const path = require('path')
const parseUrl = require('url').parse
const tilelive = require('tilelive-streaming')(require('@mapbox/tilelive'))

require('@mapbox/tilejson').registerProtocols(tilelive)
require('tilelive-file').registerProtocols(tilelive)

const normalizeSourceURL = require('./mapbox').normalizeSourceURL

module.exports = function (url, outDir, accessToken, opts, cb) {
  opts = opts || {}
  opts.minzoom = 'minzoom' in opts ? opts.minzoom : 0
  opts.maxzoom = 'maxzoom' in opts ? opts.maxzoom : 16
  if (!opts.bounds) console.warn('warning: no bounds set, downloading entire world')
  opts.bounds = opts.bounds || [-180, -85.0511, 180, 85.0511]

  mkdirp.sync(outDir)

  tilelive.load('tilejson+' + normalizeSourceURL(url, accessToken), function (err, source) {
    if (err) return cb(err)
    var tilejson = source.data
    opts.minzoom = Math.max(opts.minzoom, tilejson.minzoom)
    opts.maxzoom = Math.min(opts.maxzoom, tilejson.maxzoom)
    var tilePath = parseUrl(tilejson.tiles[0] || tilejson.tiles).pathname
    var filetype = path.parse(tilePath).base.replace('%7By%7D', '').replace(/^\./, '')
    return tilelive.load('file://' + outDir, function (err, sink) {
      if (err) return cb(err)
      sink.filetype = filetype
      source.createReadStream(opts)
        .pipe(sink.createWriteStream())
        .on('tile', function (tile) {
          if (!opts.quiet) {
            console.log('%d/%d/%d\t%d', tile.z, tile.x, tile.y, tile.length)
          }
        })
        .on('error', cb)
        .on('end', function () {
          tilejson.tiles = ['/{z}/{x}/{y}.' + filetype]
          cb(null, tilejson)
        })
    })
  })
}
