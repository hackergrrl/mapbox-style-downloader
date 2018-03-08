#!/usr/bin/env node

const path = require('path')

const download = require('../lib/download')
const serve = require('../lib/serve')

const argv = require('minimist')(process.argv.slice(2), {
  alias: {
    p: 'port',
    t: 'token',
    z: 'minzoom',
    Z: 'maxzoom',
    b: 'bounds',
    o: 'output'
  },
  string: [
    'bounds',
    'token'
  ],
  default: {
    port: 8080
  }
})

const cmd = argv._[0]

if (cmd === 'download') {
  const styleUrl = argv._[1]
  if (!styleUrl) {
    onError(new Error('Missing styleUrl'))
  }
  if (!argv.o) {
    onError(new Error('You must pass an output dir with option -o or --output'))
  }
  const outDir = path.resolve(process.cwd(), argv.o)
  const accessToken = argv.token || process.env.MAPBOX_TOKEN
  if (!accessToken) {
    onError(new Error('missing Mapbox access token, please pass -t or --token'))
  }
  download(styleUrl, accessToken, outDir, argv, onError)
} else if (cmd === 'serve') {
  const root = path.resolve(process.cwd(), argv._[1] || '')
  const styleFile = path.join(root, 'style.json')
  serve(root, styleFile, argv.port)
} else {
  onError(new Error('Must provide an argument `download` or `serve` e.g. `mapbox-style download`'))
}

function onError (err) {
  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    process.exit()
  }
}
