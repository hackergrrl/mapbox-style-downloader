## mapbox-style-downloader

Download mapbox styles, tiles, glyphs, and sprites for offline use.

```
npm install -g mapbox-style
```

## Usage

To download, you need to get a MapBox API Token. You can get one by signing up
for mapbox and requesting a public key from them. It is free. It should start
with `pk`. This is your `token` to be used with mapbox-style-downloader.


To download, use the `download` command like so:

```sh
mapbox-style download mapbox://styles/mapbox/streets-v9 \
  --token='MAPBOX_API_TOKEN' \
  -o styledir \
  -z 8 \
  -Z 13 \
  -b '-60.1364 1.5626 -58.0627 3.475'
```

## Seve styles

To serve the styles, you can use a static http server. MapBox isn't that picky
on how you serve your tiles. There is a built-in example with this command-line
tool. Just give the path to your `styledir` like so:

```
mapbox-style serve styledir
```

And you will be able to see your map, being served offline from the tiles,
sprites, and glyphs you just downloaded.

## Options

```
mapbox-style
```
