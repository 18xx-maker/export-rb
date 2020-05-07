const handlebars = require("handlebars");
const gameTemplate = require("../templates/game.hbs");

const any = require("ramda/src/any");
const assoc = require("ramda/src/assoc");
const concat = require("ramda/src/concat");
const contains = require("ramda/src/contains");
const find = require("ramda/src/find");
const keys = require("ramda/src/keys");
const map = require("ramda/src/map");
const mapObjIndexed = require("ramda/src/mapObjIndexed");
const reduce = require("ramda/src/reduce");
const is = require("ramda/src/is");
const chain = require("ramda/src/chain");

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
    ...(hex.cities || []),
    ...(hex.centerTowns || []),
    ...(hex.towns || []),
    ...(hex.offBoardRevenue ? [hex.offBoardRevenue] : []),
  ];
  let names = chain((p) => (p.name ? [p.name.name] : []), possibles);
  return names.join(" & ");
};

// Takes a map and returns each name/hex location
const compileLocationNames = (game) => {
  return reduce(
    (names, hex) => {
      let name = findName(hex);
      if (!name) {
        return names;
      }
      return [
        ...names,
        {
          coord: hex.hexes[0],
          name,
        },
      ];
    },
    [],
    game.map.hexes
  );
};

const compileTiles = (game) => {
  return map((id) => {
    let tile = game.tiles[id];

    return {
      id,
      quantity: is(Number, tile) ? tile : tile.quantity || 1,
    };
  }, keys(game.tiles || {}));
};

const compileCurrency = (game) => {
  if (!game.info.currency) {
    return "$%d";
  }

  return {
    currency: game.info.currency.replace(/\#/, "%d"),
  };
};

const compilePrivates = (game) => {
  return map(
    (p) => ({
      name: p.name,
      value: is(String, p.price) ? `'${p.price}'` : p.price,
      revenue: is(Array, p.revenue) ? p.revenue[0] : p.revenue || 0,
      description: (p.description || "").replace(/'/g, "\\'"),
      minPlayers: p.minPlayers,
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

const compileCompanies = (game, name) => {
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
      floatPercent: c.floatPercent || game.floatPercent,
      abbrev: c.abbrev,
      name: c.name,
      logo: c.logo ? `${name}/${c.abbrev.replace(LOGO_RE, "")}` : undefined,
      tokens: map((t) => ({ label: is(Number, t) ? t : 0 }), c.tokens || []),
      home: findHome(c.abbrev, (game.map || {}).hexes || []),
      color: c.color === "white" ? colors["gray"] : colors[c.color],
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
      rusts_on: t.rustsOn,
      num: t.quantity === "∞" ? 99 : t.quantity,
      available_on: t.availableOn,
      discount: t.discount
        ? mapObjIndexed(
            (discount, name) => ({
              name,
              discount,
            }),
            t.discount || {}
          )
        : undefined,
    }),
    game.trains
  );
};

const compileName = (game) => {
  const match = game.match(/^([0-9]*)(.*)$/);
  const numbers = match[1];
  const words = match[2].toLowerCase();
  let name = numbers;
  if (words !== "") {
    name += `_${words}`;
  }
  return name;
};

const tileColors = ["yellow", "green", "brown", "gray"];
const compilePhases = (game) => {
  return map(
    (p) => ({
      name: p.name || p.train,
      on: p.on,
      limit: p.limit,
      tiles: tileColors.slice(0, tileColors.indexOf(p.tiles) + 1),
      rounds: p.rounds,
    }),
    game.phases || []
  );
};

const compileHexes = (game) => {
  let compiled = {};

  game.map.hexes.forEach((hex) => {
    let color = compileColor(hex);
    let encoding = compileHex(hex);
    let locations = hex.hexes;

    if (!compiled[color]) {
      compiled[color] = {};
    }

    if (!compiled[color][encoding]) {
      compiled[color][encoding] = [];
    }

    compiled[color][encoding] = concat(compiled[color][encoding], locations);
  });

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

const compileGame = (game, name) => {
  return {
    ...compileCurrency(game),
    ...compileBank(game),
    ...compileCertLimit(game),
    ...compileStartingCash(game),
    locationNames: compileLocationNames(game),
    tiles: compileTiles(game),
    market: compileMarket(game),
    privates: compilePrivates(game),
    companies: compileCompanies(game, name),
    trains: compileTrains(game),
    hexes: compileHexes(game),
    phases: compilePhases(game),
  };
};

// Output the rendered game
const renderGame = (game) => {
  const name = compileName(game.info.title);
  game = compileGame(game, name);

  return gameTemplate({
    game,
    name,
  });
};

exports.compileGame = compileGame;
exports.renderGame = renderGame;
