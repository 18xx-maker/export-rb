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
  console.log(exportRb.renderTiles(exportRb.tiles));
});

// Exports games
program.command("game <game>").action((game) => {
  console.log(exportRb.renderGame(exportRb.games[game]));
});

program.parse();
