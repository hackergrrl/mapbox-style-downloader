const request = require('request')
const traverse = require('traverse')
const queue = require('d3-queue').queue
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const pump = require('pump')

const normalizeURL = require('./mapbox').normalizeGlyphsURL

module.exports = function (style, outDir, accessToken, range, cb) {
  if (!style.glyphs) return cb(new Error('no glyph url defined in style'))
  console.log('Downloading glyphs for UTF char range ' + range[0] + '-' + range[1] + '...')
  mkdirp(outDir)
  var fontStacks = getFontStacks(style)
  downloadGlyphs(style.glyphs, fontStacks, outDir, accessToken, range, cb)
}

function getFontStacks (style) {
  var fontStacks = {}
  traverse(style).forEach(function (x) {
    if (this.key === 'text-font') {
      if (Array.isArray(x)) {
        fontStacks[x.join(',')] = true
      } else if (typeof x === 'string') {
        fontStacks[x] = true
      } else if (x.stops) {
        x.stops.forEach(stop => {
          var stack = Array.isArray(stop[1]) ? stop[1].join(',') : stop[1]
          fontStacks[stack] = true
        })
      }
    }
  })
  return Object.keys(fontStacks)
}

function downloadGlyphs (urlTemplate, fontStacks, outDir, accessToken, range, cb) {
  urlTemplate = normalizeURL(urlTemplate, accessToken)
  var q = queue(10)
  fontStacks.forEach(stack => {
    var stackDir = path.join(outDir, stack)
    mkdirp.sync(stackDir)
    var rangeStr
    var url
    var outFilepath
    for (var i = 0; i < 65536; (i = i + 256)) {
      if (range[1] < i || range[0] > i + 256) continue
      rangeStr = i + '-' + (i + 255)
      url = glyphUrl(stack, rangeStr, urlTemplate)
      outFilepath = path.join(stackDir, rangeStr + '.pbf')
      q.defer(downloadToFile, url, outFilepath)
    }
  })
  q.awaitAll(cb)
}

function downloadToFile (url, filepath, cb) {
  console.log(url)
  var req = request({url: url, gzip: true})
  pump(req, fs.createWriteStream(filepath), cb)
}

/**
 * Use CNAME sharding to load a specific glyph range over a randomized
 * but consistent subdomain.
 * @param {string} fontstack comma-joined fonts
 * @param {string} range comma-joined range
 * @param {url} url templated url
 * @param {string} [subdomains=abc] subdomains as a string where each letter is one.
 * @returns {string} a url to load that section of glyphs
 * @private
 */
function glyphUrl (fontstack, range, url, subdomains) {
  subdomains = subdomains || 'abc'

  return url
        .replace('{s}', subdomains[fontstack.length % subdomains.length])
        .replace('{fontstack}', fontstack)
        .replace('{range}', range)
}
