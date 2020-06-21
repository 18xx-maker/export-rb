#!/usr/bin/env node

// const chalk = require("chalk");
// const glob = require("glob");
// const path = require("path");
const pkg = require("./package.json");
const { program } = require("commander");
const exportRb = require("./index.games");

// Global program options
program.version(pkg.version, "-v, --version", "output the current version");

// Exports tiles
program.command("tiles").action(() => {
  process.stdout.write(exportRb.renderTiles(exportRb.tiles));
});

// Exports games
program
  .command("game <game>")
  .option("-m, --map <index>", "which map variation to use", 0)
  .action((game, opts) => {
    console.log(exportRb.games[game]);
    let gameData = require(`@18xx-maker/games/games/${exportRb.games[game].file}`);
    process.stdout.write(exportRb.renderGame(gameData, opts));
  });

program.parse();
