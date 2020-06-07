const handlebars = require("handlebars");
const tilesTemplate = require("../templates/tiles.hbs");

const forEachObjIndexed = require("ramda/src/forEachObjIndexed");
const keys = require("ramda/src/keys");
const map = require("ramda/src/map");

const hex = require("./hex");

const toSymbol = (name) => name.replace(/\//, "").toLowerCase();
const toModule = (name) =>
  hex.compileColor({ color: name }).replace(/\//, "").toUpperCase();

// Create the json structure needed for our tiles template
const compileTiles = (tiles) => {
  let colors = {};

  forEachObjIndexed((tile, id) => {
    let color = hex.compileColor(tile);

    if (!colors[color]) {
      colors[color] = {};
    }

    colors[color][id] = {
      id,
      encoding: hex.compileHex(tile),
      broken: tile.broken,
    };
  }, tiles);

  return {
    colors: map(
      (c) => ({
        name: toModule(c),
        tiles: map((t) => colors[c][t], keys(colors[c])),
      }),
      keys(colors)
    ),
    symbols: map(toSymbol, keys(colors)).join(" "),
  };
};

// Output the rendered tiles
const renderTiles = (tiles) => {
  let data = compileTiles(tiles);

  return tilesTemplate(data);
};

exports.compileTiles = compileTiles;
exports.renderTiles = renderTiles;
