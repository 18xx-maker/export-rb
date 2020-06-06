const handlebars = require("handlebars");
const gameTemplate = require("../templates/game.hbs");

const makerTiles = require("@18xx-maker/games").tiles;

const any = require("ramda/src/any");
const assoc = require("ramda/src/assoc");
const concat = require("ramda/src/concat");
const contains = require("ramda/src/contains");
const curry = require("ramda/src/curry");
const find = require("ramda/src/find");
const keys = require("ramda/src/keys");
const map = require("ramda/src/map");
const mapObjIndexed = require("ramda/src/mapObjIndexed");
const reduce = require("ramda/src/reduce");
const indexOf = require("ramda/src/indexOf");
const is = require("ramda/src/is");
const chain = require("ramda/src/chain");

const resolveHex = curry((hexes, hex) => {
  if (hex.copy) {
    // Find copy
    let copyHex = find((h) => indexOf(hex.copy, h.hexes) > -1, hexes);

    if (copyHex) {
      let merged = mergeHex(hex, resolveHex(hexes, copyHex));

      delete merged.copy;

      return merged;
    }
  }

  // Nothing to copy
  return hex;
});

const getMapHexes = (game, variation) => {
  variation = variation || 0;

  // Get the relevant map
  let gameMap = Array.isArray(game.map) ? game.map[variation] : game.map;

  // If the game is map-less, just return an empty object
  if (!gameMap) {
    return [];
  }

  let hexes = map(assoc("variation", variation), gameMap.hexes || []);
  if (gameMap.copy !== undefined) {
    hexes = concat(
      map(assoc("variation", gameMap.copy), game.map[gameMap.copy].hexes),
      hexes
    );
  }
  if (gameMap.remove !== undefined) {
    hexes = map((hex) => {
      return assoc(
        "hexes",
        reject((coord) => (gameMap.remove || []).includes(coord), hex.hexes),
        hex
      );
    }, hexes);
  }
  hexes = map(resolveHex(hexes), hexes);

  return hexes;
};

// Load helpers
const {
  compileBank,
  compileCertLimit,
  compileStartingCash,
} = require("./data");
const { compileHex, compileColor } = require("./hex");
const { compileMarket } = require("./market");

// Takes a hex and returns the first name we can find on it
const findName = (hex) => {
  let possibles = [
    ...[{ name: hex.name }],
    ...(hex.cities || []),
    ...(hex.centerTowns || []),
    ...(hex.towns || []),
    ...(hex.offBoardRevenue && !hex.offBoardRevenue.hidden
      ? [hex.offBoardRevenue]
      : []),
    ...map((n) => ({ name: n }), hex.names || []),
  ];
  let names = chain((p) => (p.name ? [p.name.name] : []), possibles);
  return names.join(" & ");
};

// Takes a map and returns each name/hex location
const compileLocationNames = (game, opts) => {
  return reduce(
    (names, hex) => {
      let name = findName(hex);
      if (!name) {
        return names;
      }
      return {
        ...names,
        [hex.hexes[0]]: name,
      };
    },
    {},
    getMapHexes(game, opts.map)
  );
};

const compileTiles = (game, isFlat) => {
  return reduce(
    (tiles, id) => {
      if (makerTiles[id] && makerTiles[id].broken) {
        return tiles;
      }

      let tile = game.tiles[id];

      let hex = undefined;
      let color = undefined;

      let count = tile;

      if (is(Object, tile)) {
        // Check if we have a color, this means we go full on definition
        if (tile.color) {
          count = {
            count: tile.quantity
              ? tile.quantity === "∞"
                ? 20
                : tile.quantity
              : 1,
            color: tile.color,
            code: compileHex(tile, isFlat),
          };
        } else {
          // Just quantity
          count = tile.quantity
            ? tile.quantity === "∞"
              ? 20
              : tile.quantity
            : 1;
        }
      }

      return {
        ...tiles,
        [id]: count,
      };
    },
    {},
    keys(game.tiles || {})
  );
};

const compileCurrency = (game) => {
  if (!game.info.currency) {
    return "$%d";
  }

  return game.info.currency.replace(/\#/, "%d");
};

const compileLayout = (game) => {
  if (game.info.orientation === "horizontal") {
    return "flat";
  } else if (game.info.orientation === "vertical") {
    return "pointy";
  } else {
    return "pointy";
  }
};

const compileCapitalization = (game) => {
  if (!game.info.capitalization) {
    return "full";
  }
  return game.info.capitalization;
};

const compileMustSellInBlocks = (game) => {
  if (!game.info.mustSellInBlocks) {
    return false;
  }
  return game.info.mustSellInBlocks;
};

const compilePrivates = (game) => {
  return map(
    (p) => ({
      name: p.name,
      value: p.price,
      debt: p.debt,
      revenue: is(Array, p.revenue) ? p.revenue[0] : p.revenue || 0,
      desc: p.description || "No special abilities.",
      min_players: p.minPlayers,
      sym: p.sym,
      abilities: p.abilities,
    }),
    game.privates || []
  );
};

const findHome = (abbrev, hexes) => {
  let hex = find((hex) => {
    let cities = hex.cities;

    if (!cities) {
      return false;
    }

    return any((city) => {
      return city.companies && city.companies.includes(abbrev);
    }, cities);
  }, hexes);

  return hex && hex.hexes[0];
};

// Hardcode to Rails on Board colors for now
const colors = {
  black: "#37383a",
  blue: "#0189d1",
  brightGreen: "#76a042",
  brown: "#7b352a",
  gold: "#e09001",
  gray: "#9a9a9d",
  green: "#237333",
  lavender: "#baa4cb",
  lightBlue: "#37b2e2",
  lightBrown: "#b58168",
  lime: "#bdbd00",
  natural: "#fbf4de",
  navy: "#004d95",
  orange: "#f48221",
  pink: "rgb(193,60,125)",
  red: "#d81e3e",
  turquoise: "#00a99e",
  violet: "#7f528b",
  white: "#ffffff",
  yellow: "#f8c200",
};

const LOGO_RE = /[& ]/g;

const compileCompanies = (game, name, opts) => {
  let companies = map((company) => {
    if (
      company.minor &&
      !company.tokens &&
      game.tokenTypes &&
      game.tokenTypes["minor"]
    ) {
      company.tokenType = "minor";
      company.tokens = game.tokenTypes["minor"];
    } else if (
      !company.tokens &&
      game.tokenTypes &&
      game.tokenTypes["default"]
    ) {
      company.tokenType = "default";
      company.tokens = game.tokenTypes["default"];
    } else if (is(String, company.tokens)) {
      company.tokenType = company.tokens;
      company.tokens = game.tokenTypes[company.tokens];
    }

    if (
      company.minor &&
      !company.shares &&
      game.shareTypes &&
      game.shareTypes["minor"]
    ) {
      company.shareType = "minor";
      company.shares = game.shareTypes["minor"];
    } else if (
      !company.shares &&
      game.shareTypes &&
      game.shareTypes["default"]
    ) {
      company.shareType = "default";
      company.shares = game.shareTypes["default"];
    } else if (is(String, company.shares)) {
      company.shareType = company.shares;
      company.shares = game.shareTypes[company.shares];
    }

    return company;
  }, game.companies || []);

  return map(
    (c) => ({
      float_percent: c.floatPercent || game.floatPercent,
      sym: c.abbrev,
      name: c.name,
      logo: `${name}/${c.abbrev.replace(LOGO_RE, "")}`,
      tokens: map((t) => (is(Number, t) ? t : 0), c.tokens || []),
      coordinates: findHome(c.abbrev, getMapHexes(game, opts.map)),
      color: c.color,
      text_color: c.textColor,
    }),
    companies
  );
};

const compileTrains = (game) => {
  return map(
    (t) => ({
      name: t.name,
      distance:
        t.distance || (isNaN(parseInt(t.name)) ? 999 : parseInt(t.name)),
      price: t.price || 0,
      rusts_on: t.rust,
      num: t.quantity === "∞" ? 20 : t.quantity,
      available_on: t.available,
      discount: t.discount,
    }),
    game.trains
  );
};

const compileModuleName = (name) => {
  return name.replace(/\ /, "");
};

const compileFileName = (name) => {
  const match = name.match(/^([0-9]*)(.*)$/);
  const numbers = match[1];
  const words = match[2].toLowerCase();
  let filename = numbers;
  if (words !== "") {
    filename += `_${words}`;
  }
  return filename;
};

const tileColors = ["yellow", "green", "brown", "gray"];
const compilePhases = (game) => {
  return map(
    (p) => ({
      name: p.name || p.train,
      on: p.on,
      train_limit: p.limit,
      tiles: tileColors.slice(0, tileColors.indexOf(p.tiles) + 1),
      operating_rounds: p.rounds,
      buy_companies: p.buy_companies,
      events: p.events,
    }),
    game.phases || []
  );
};

const compileHexes = (game, isFlat, opts) => {
  let compiled = {};

  getMapHexes(game, opts.map).forEach((hex) => {
    let color = compileColor(hex);
    let encoding = compileHex(hex, isFlat);
    let locations = hex.hexes;

    if (!compiled[color]) {
      compiled[color] = {};
    }

    if (!compiled[color][encoding]) {
      compiled[color][encoding] = [];
    }

    compiled[color][encoding] = concat(compiled[color][encoding], locations);
  });
  return compiled;

  const templated = map(
    (color) => ({
      color,
      hexes: map(
        (encoding) => ({
          encoding,
          hexes: compiled[color][encoding],
        }),
        keys(compiled[color])
      ),
    }),
    keys(compiled)
  );

  return templated;
};

const compileGame = (game, opts) => {
  const filename = compileFileName(game.info.title);
  const modulename = compileModuleName(game.info.title);

  const layout = compileLayout(game);
  const isFlat = layout === "flat";

  return {
    filename,
    modulename,
    currencyFormatStr: compileCurrency(game),
    bankCash: compileBank(game),
    certLimit: compileCertLimit(game),
    startingCash: compileStartingCash(game),
    capitalization: compileCapitalization(game),
    layout: layout,
    mustSellInBlocks: compileMustSellInBlocks(game),
    locationNames: compileLocationNames(game, opts),
    tiles: compileTiles(game, isFlat),
    market: compileMarket(game),
    companies: compilePrivates(game),
    corporations: compileCompanies(game, filename, opts),
    trains: compileTrains(game),
    hexes: compileHexes(game, isFlat, opts),
    phases: compilePhases(game),
  };
};

// Output the rendered game
const renderGame = (game, opts) => {
  game = compileGame(game, opts);

  // return JSON.stringify(game, null, 2);
  return gameTemplate({
    name: game.modulename,
    data: JSON.stringify(game, null, 2),
  });
};

exports.compileGame = compileGame;
exports.renderGame = renderGame;
