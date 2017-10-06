const request = require('request')
const mkdirp = require('mkdirp')
const path = require('path')
const queue = require('d3-queue').queue
const assign = require('object-assign')
const fs = require('fs')

const normalizeStyleURL = require('./mapbox').normalizeStyleURL
const downloadGlyphs = require('./glyphs')
const downloadSprites = require('./sprites')
const downloadTiles = require('./tiles')

const defaults = {
  glyphs: false,
  sprites: false,
  tiles: false,
  style: false,
  minzoom: 1,
  maxzoom: 14,
  bounds: '-180.0 -85.06 180.0 85.06',
  sources: null
}

module.exports = download

function download (styleUrl, accessToken, outDir, opts, cb) {
  console.log(opts)
  opts = Object.assign({}, defaults, opts)
  console.log(opts)
  opts.bounds = opts.bounds.split(/,|\s/)
  const all = !opts.glyphs && !opts.sprites && !opts.tiles && !opts.style

  request(normalizeStyleURL(styleUrl, accessToken), {json: true}, function (err, res, stylesheet) {
    if (err) return cb(err)
    var offlineStylesheet = assign({}, stylesheet)
    var q = queue(1)

    mkdirp.sync(outDir)
    if (opts.glyphs || all) {
      q.defer(downloadGlyphs, stylesheet, path.join(outDir, 'fonts'), accessToken)
      offlineStylesheet.glyphs = '{host}/fonts/{fontstack}/{range}.pbf'
    }
    if (opts.sprites || all) {
      q.defer(downloadSprites, stylesheet.sprite, path.join(outDir, 'sprites'), accessToken)
      offlineStylesheet.sprite = '{host}/sprites/sprite'
    }
    if (opts.tiles || all) {
      q.defer(downloadSources)
    }
    q.awaitAll(function (err) {
      if (err) return cb(err)
      fs.writeFileSync(path.join(outDir, 'style.json'), JSON.stringify(offlineStylesheet, null, 2))
      console.log('Style resources successfully downloaded to ', outDir)
    })

    function downloadSources (cb) {
      var sourceQ = queue(1)
      var sourceIds = Object.keys(stylesheet.sources)
      sourceIds
        .filter(function (s) {
          if (!opts.sources) return true
          return opts.sources.split(',').indexOf(s) > -1
        })
        .forEach(function (s) {
          var sourceUrl = stylesheet.sources[s].url
          sourceQ.defer(downloadTiles, sourceUrl, path.join(outDir, 'tiles', s), accessToken, opts)
        })
      sourceQ.awaitAll(function (err, tilejsons) {
        if (err) return cb(err)
        offlineStylesheet.sources = sourceIds.reduce(function (acc, s, i) {
          acc[s] = tilejsons[i]
          acc[s].tiles = acc[s].tiles.map(function (url) { return '{host}/tiles/' + s + url })
          acc[s].type = stylesheet.sources[s].type
          return acc
        }, {})
        cb()
      })
    }
  })
}
