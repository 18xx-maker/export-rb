#!/usr/bin/env node

// const chalk = require("chalk");
// const glob = require("glob");
// const path = require("path");
const pkg = require("./package.json");
const { program } = require("commander");
const exportRb = require("./index");

// Global program options
program.version(pkg.version, "-v, --version", "output the current version");

// Exports tiles
program
  .command("tiles")
  .option("-o, --output <output>", "Output to a file, defaults to STDOUT", "-")
  .action(({ output }) => {
    console.log(exportRb.renderTiles());
  });

// Exports games
program
  .command("game <game>")
  .option("-o, --output <output>", "Output to a file, defaults to STDOUT", "-")
  .action((game) => {
    console.log(exportRb.renderGame(game));
  });

program.parse();
