const is = require("ramda/src/is");
const reduce = require("ramda/src/reduce");

const compileBank = (game) => {
  if (game.bank) {
    return game.bank === "∞" ? 99999 : game.bank;
  }

  return reduce(
    (b, p) => ({
      ...b,
      [p.number]: p.bank,
    }),
    {},
    game.players || []
  );
};

const compileCertLimit = (game) => {
  if (game.certLimit) {
    return game.certLimit;
  }

  return reduce(
    (c, p) => ({
      ...c,
      [p.number]: p.certLimit,
    }),
    {},
    game.players || []
  );
};

const compileStartingCash = (game) => {
  if (game.capital) {
    return game.capital;
  }

  return reduce(
    (c, p) => ({
      ...c,
      [p.number]: p.capital,
    }),
    {},
    game.players || []
  );
};

exports.compileBank = compileBank;
exports.compileCertLimit = compileCertLimit;
exports.compileStartingCash = compileStartingCash;
