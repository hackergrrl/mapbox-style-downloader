const request = require('request')
const queue = require('d3-queue').queue
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const pump = require('pump')

const normalizeSpriteURL = require('./mapbox').normalizeSpriteURL

module.exports = function (spriteUrl, outDir, accessToken, cb) {
  mkdirp.sync(outDir)
  var q = queue(10)
  var resources = [
    {format: '', extension: '.png'},
    {format: '', extension: '.json'},
    {format: '@2x', extension: '.png'},
    {format: '@2x', extension: '.json'}
  ]
  resources.forEach(function (r) {
    var url = normalizeSpriteURL(spriteUrl, r.format, r.extension, accessToken)
    var filepath = path.join(outDir, 'sprite' + r.format + r.extension)
    q.defer(downloadToFile, url, filepath)
  })
  q.awaitAll(cb)
}

function downloadToFile (url, filepath, cb) {
  var req = request({url: url, gzip: true})
  pump(req, fs.createWriteStream(filepath), cb)
}
