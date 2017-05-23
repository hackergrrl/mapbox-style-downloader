#!/usr/bin/env node

const request = require('request')
const mkdirp = require('mkdirp')
const path = require('path')
const queue = require('d3-queue').queue
const assign = require('object-assign')
const fs = require('fs')

const normalizeStyleURL = require('../lib/mapbox').normalizeStyleURL
const downloadGlyphs = require('../lib/glyphs')
const downloadSprites = require('../lib/sprites')
const downloadTiles = require('../lib/tiles')

const argv = require('minimist')(process.argv.slice(2))
const styleUrl = argv._[0]
const outDir = path.resolve(process.cwd(), argv.o)
const accessToken = argv.token || process.env.MAPBOX_TOKEN
const all = !argv.glyphs && !argv.sprites && !argv.tiles

if (!styleUrl) onError(new Error('must provide a style url'))

request(normalizeStyleURL(styleUrl, accessToken), {json: true}, function (err, res, stylesheet) {
  if (err) return onError(err)
  var offlineStylesheet = assign({}, stylesheet)
  var q = queue(1)

  mkdirp.sync(outDir)
  if (argv.glyphs || all) {
    q.defer(downloadGlyphs, stylesheet, path.join(outDir, 'fonts'), accessToken)
    offlineStylesheet.glyphs = '/fonts/{fontstack}/{range}.pbf'
  }
  if (argv.sprites || all) {
    q.defer(downloadSprites, stylesheet.sprite, path.join(outDir, 'sprites'), accessToken)
    offlineStylesheet.sprite = '/sprites/sprite'
  }
  if (argv.tiles || all) {
    var opts = {bounds: argv.b.split(','), minzoom: argv.z, maxzoom: argv.Z}
    q.defer(downloadSources, opts)
  }
  q.awaitAll(function (err) {
    if (err) return onError(err)
    fs.writeFileSync(path.join(outDir, 'style.json'), JSON.stringify(offlineStylesheet, null, 2))
    console.log('Style resources successfully downloaded to ', outDir)
  })

  function downloadSources (opts, cb) {
    var sourceQ = queue(1)
    var sourceIds = Object.keys(stylesheet.sources)
    sourceIds
      .filter(function (s) {
        if (!argv.sources) return true
        return argv.sources.split(',').indexOf(s) > -1
      })
      .forEach(function (s) {
        var sourceUrl = stylesheet.sources[s].url
        sourceQ.defer(downloadTiles, sourceUrl, path.join(outDir, 'tiles', s), accessToken, opts)
      })
    sourceQ.awaitAll(function (err, tilejsons) {
      if (err) return cb(err)
      offlineStylesheet.sources = sourceIds.reduce(function (acc, s, i) {
        acc[s] = tilejsons[i]
        acc[s].tiles = acc[s].tiles.map(function (url) { return '/tiles/' + s + url })
        acc[s].type = stylesheet.sources[s].type
        return acc
      }, {})
      cb()
    })
  }
})

function onError (err) {
  console.error(err)
  process.exit(1)
}
