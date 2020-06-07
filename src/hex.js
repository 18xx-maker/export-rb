const is = require("ramda/src/is");
const addIndex = require("ramda/src/addIndex");
const concat = require("ramda/src/concat");
const map = require("ramda/src/map");
const chain = require("ramda/src/chain");
const find = require("ramda/src/find");
const any = require("ramda/src/any");
const has = require("ramda/src/has");

const terrainMapping = {
  river: "water",
  stream: "water",
};

const getValues = (hex) => {
  if (!hex.values) {
    return [];
  }

  return map((v) => v.value, hex.values);
};

const compileValue = (hex) => {
  if (!hex.values) {
    return [];
  }
};

const compileTowns = (hex) => {
  if (!hex.centerTowns && !hex.towns) {
    return [];
  }

  let values = getValues(hex);

  return addIndex(map)((t, i) => {
    let revenue;
    if (hex.offBoardRevenue) {
      revenue = compileMultiRevenue(hex.offBoardRevenue);
    } else {
      revenue = values[i] || values[0] || 0;
    }

    let town = `town=revenue:${revenue}`;
    town += compileGroups(t.groups);

    return town;
  }, concat(hex.centerTowns || [], hex.towns || []));
};

const compileGroups = (groups) => {
  if (!groups) {
    return "";
  }
  return `,groups:${groups.join("|")}`;
};

const compileMultiRevenue = (offboardRevenue) => {
  const colors = map((r) => {
    if (`${r.value || r.revenue || r.cost || 0}`.match(/^D/)) {
      return `diesel_${r.cost.replace(/^D/, "")}`;
    }
    return `${r.color}_${r.value || r.revenue || r.cost || 0}`;
  }, offboardRevenue.revenues);

  let multiRevenue = colors.join("|");
  if (offboardRevenue.hidden) {
    multiRevenue += ",hide:1";
  }

  return multiRevenue;
};

const compileCities = (hex) => {
  if (!hex.cities) {
    return [];
  }

  let values = getValues(hex);

  return addIndex(map)((c, i) => {
    let revenue;
    if (hex.offBoardRevenue) {
      revenue = compileMultiRevenue(hex.offBoardRevenue);
    } else {
      revenue = values[i] || values[0] || 0;
    }

    let city = `city=revenue:${revenue}`;
    if (c.size > 1) {
      city += `,slots:${c.size}`;
    }
    city += compileGroups(c.groups);
    return city;
  }, hex.cities);
};

const compileTerrain = (hex) => {
  if (!hex.terrain) {
    return [];
  }

  let types = chain((t) => {
    if (t.type) {
      return [terrainMapping[t.type] || t.type];
    }
    return [];
  }, hex.terrain);

  let result = [];
  let cost = find((t) => t.cost, hex.terrain);
  if (cost) {
    result.push(`upgrade=cost:${cost.cost}`);
  }

  if (types.length > 0) {
    result.push(`terrain:${types.join("+")}`);
  }

  return [result.join(",")];
};

const compileOffboard = (hex) => {
  if (!hex.offBoardRevenue || hex.cities || hex.towns || hex.centerTowns) {
    return [];
  }

  const revenue = compileMultiRevenue(hex.offBoardRevenue);

  const g = compileGroups(hex.offBoardRevenue.groups);

  return [`offboard=revenue:${revenue}${g}`];
};

const compileLabels = (hex) => {
  if (!hex.labels) {
    return [];
  }

  return map((l) => {
    return `label=${l.label}`;
  }, hex.labels);
};

const abrev = (a, b, rev) => {
  a = (a - 1) % 6;
  b = (b - 1) % 6;
  return [`a:${Math.min(a, b)},b:_${rev}`, `a:_${rev},b:${Math.max(a, b)}`];
};

const arev = (a, rev) => {
  a = (a - 1) % 6;
  return [`a:${a},b:_${rev}`];
};

const ab = (a, b) => {
  a = (a - 1) % 6;
  b = (b - 1) % 6;

  return [`a:${Math.min(a, b)},b:${Math.max(a, b)}`];
};

const aj = (a) => {
  a = (a - 1) % 6;
  return [`a:${a},b:_0`];
};

const compileTrackGauge = (gauge) => {
  if (!gauge) {
    return "";
  }
  return `,track:${gauge}`;
};

const compileTrackSides = (t, r, isFlat) => {
  // Check if we have a revenue center to deal with
  const hasRevenue = !isNaN(r);
  const side = (t.side || 1) + (isFlat ? 0 : 1);

  // Now switch on type
  switch (t.type) {
    case "sharp":
      return hasRevenue ? abrev(side, side + 1, r) : ab(side, side + 1);
    case "gentle":
      return hasRevenue ? abrev(side, side + 2, r) : ab(side, side + 2);
    case "straight":
      return hasRevenue ? abrev(side, side + 3, r) : ab(side, side + 3);
    default:
      return hasRevenue ? arev(side, r) : aj(side);
  }
};

const compileTrack = (hex, isFlat) => {
  if (!hex.track) {
    return [];
  }

  // Hack for now. If there are values on the hex than cut the track in half
  let numRevenue = (hex.values || []).length + (hex.offBoardRevenue ? 1 : 0);

  return addIndex(chain)((t, i) => {
    // Simple for now, just let every track cycle
    // between revenue locations
    let revenue = i % numRevenue;
    let sides = compileTrackSides(t, revenue, isFlat);

    return map((s) => {
      return `path=${s}${compileTrackGauge(t.gauge)}`;
    }, sides);
  }, hex.track);
};

const compileColor = (hex) => {
  switch (hex.color) {
    case "water":
      return "blue";
    case "offboard":
      return "red";
    case "plain":
      return "white";
    default:
      return hex.color;
  }
};

const compileRemoveBorders = (hex, isFlat) => {
  if (!hex.removeBorders) {
    return [];
  }
  const edge = (hex.removeBorders[0] - (isFlat ? 1 : 0)) % 6;

  return [`border=edge:${edge}`];
};

const compileJunction = (hex) => {
  if (!hex.track) {
    return [];
  }

  if (hex.cities || hex.towns || hex.centerTowns || hex.offBoardRevenue) {
    return [];
  }

  if (any(has("type"), hex.track)) {
    return [];
  }

  return ["junction"];
};

const compileHex = (hex, isFlat) => {
  if (hex.encoding) {
    return hex.encoding;
  }

  let all = [
    ...compileJunction(hex),
    ...compileOffboard(hex),
    ...compileCities(hex),
    ...compileTowns(hex),
    ...compileTrack(hex, isFlat),
    ...compileLabels(hex),
    ...compileTerrain(hex),
    ...compileRemoveBorders(hex, isFlat),
  ];

  let result = all.join(";");

  return result;
};

exports.compileColor = compileColor;
exports.compileHex = compileHex;
