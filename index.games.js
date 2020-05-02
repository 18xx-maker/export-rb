const tiles = require("./src/tiles");
const game = require("./src/game");

const makerTiles = require("@18xx-maker/games").tiles;
const makerGames = require("@18xx-maker/games").games;

exports.compileGame = game.compileGame;
exports.renderGame = game.renderGame;
exports.compileTiles = tiles.compileTiles;
exports.renderTiles = tiles.renderTiles;
exports.tiles = makerTiles;
exports.games = makerGames;
