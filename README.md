# 18xx-maker/export-rb

[![build](https://travis-ci.org/18xx-maker/export-rb.svg?branch=master)](https://travis-ci.org/18xx-maker/export-rb)
![version](https://img.shields.io/npm/v/@18xx-maker/export-rb)
![downloads](https://img.shields.io/npm/dt/@18xx-maker/export-rb)
![license](https://img.shields.io/npm/l/@18xx-maker/export-rb)

This package exports files needed to load 18xx-maker data into ruby projects,
specifically in the format that [18xx.games](https://www.18xx.games/) requires.

## Usage

You can use this package from node, from a browser or via the command line.

### CLI

When you npm install this package globaly:

```shell
npm install -g @18xx-maker/export-rb
```

you end up with a script that can output all tiles, or game files directly:

```shell
# Render the tiles file
18xx-export-rb tiles

# Render some games
18xx-export-rb game 1830
18xx-export-rb game 1889
```

### Node

To use this package in node:

```javascript
const exportRb = require("@18xx-maker/export-rb");

// All tiles are in exportRb.tiles
// All games are in exportRb.games

// Render tiles
const tilesRb = exportRb.renderTiles(exportRb.tiles);

// Render a game
const gameRb = exportRb.renderGame(exportRb.games["1830"]);

// If you have a game json that's not from @18xx-maker/games
// you can render that too:
const otherGameRb = exportRb.renderGame(require("./18Awesome.json"));
```

### Browser

In this repo we have two browser builds of this package in the `dist` folder:

- [18xx-maker.export-rb.games.js](https://raw.githubusercontent.com/18xx-maker/export-rb/master/dist/18xx-maker.export-rb.games.js)
- [18xx-maker.export-rb.js](https://raw.githubusercontent.com/18xx-maker/export-rb/master/dist/18xx-maker.export-rb.js)

_Note:_ Neither of these files exist in the npm package.

The first is pretty large and includes ALL
[@18xx-maker/games](https://github.com/18xx-maker/games) data. Please make sure
this is what you want if you choose to use that file.

The other just has the rendering functions. Both are UMD browserify bundles that
can export a global `xxMaker` that can be used just like the node package above.
Feel free to check out the (incredibly basic) example
[index.html](https://raw.githubusercontent.com/18xx-maker/export-rb/master/dist/index.html)
for an example.
