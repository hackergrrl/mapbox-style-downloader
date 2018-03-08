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
  console.log(`USAGE: mapbox-style <command> [options]

  download STYLE_URL [options]
    -b, --bounds        bounding box in the form of "lat, lon, lat, lon"
    -o, --output        the output path for the styles
    -z, --minzoom       the minimum zoom for tile downloading [1,16]
    -Z, --maxzoom       the maximum zoom for tile downloading [1,16]
    -t, --token         your MapBox API token

  serve
    -p, --port          the port to use for the server

  help
    see this help text
`)
}

function onError (err) {
  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    process.exit()
  }
}
