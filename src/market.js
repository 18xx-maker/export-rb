const any = require("ramda/src/any");
const is = require("ramda/src/is");
const isNil = require("ramda/src/isNil");
const map = require("ramda/src/map");

const compileCell = (cell) =>
  cell
    ? `${cell.value ? cell.value : cell.label ? cell.label : cell}${
        cell.par ? "p" : ""
      }${cell.legend !== undefined ? ["y", "o", "b"][cell.legend] : ""}`
    : "";

const compileRow = (row) => map(compileCell, row);

const compileMarket = (game) => {
  let market = game.stock.market;

  let twoD = is(Array, market[0]);

  if (twoD) {
    return map(compileRow, market);
  }

  return [compileRow(market)];
};

exports.compileMarket = compileMarket;
