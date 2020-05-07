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
program.command("game <game>").action((game) => {
  process.stdout.write(exportRb.renderGame(exportRb.games[game]));
});

program.parse();
