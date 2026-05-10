const KEY_HOUSES = [2, 9, 10, 11];
const CORE_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const ALL_PLANETS = [...CORE_PLANETS, 'Rahu', 'Ketu'];

// Table-driven, classical-style bindu support matrix (v3 stricter form).
// For each target graha, each contributing graha supports specific relative houses.
const BINDU_TABLE = {
  Sun: {
    default: [1, 2, 4, 7, 8, 9, 10, 11],
    Sun: [1, 2, 4, 7, 8, 9, 10, 11],
    Moon: [3, 6, 10, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [3, 5, 6, 9, 10, 11],
    Jupiter: [5, 6, 9, 11],
    Venus: [6, 7, 10, 11],
    Saturn: [3, 6, 10, 11]
  },
  Moon: {
    default: [1, 3, 6, 7, 10, 11],
    Sun: [3, 6, 7, 10, 11],
    Moon: [1, 3, 6, 7, 10, 11],
    Mars: [2, 3, 5, 6, 9, 10, 11],
    Mercury: [2, 4, 6, 8, 10, 11],
    Jupiter: [1, 4, 7, 8, 10, 11],
    Venus: [3, 4, 5, 7, 9, 10, 11],
    Saturn: [3, 5, 6, 11]
  },
  Mars: {
    default: [1, 2, 4, 7, 8, 10, 11],
    Sun: [3, 5, 6, 10, 11],
    Moon: [3, 6, 10, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [3, 6, 11],
    Jupiter: [5, 6, 9, 10, 11],
    Venus: [5, 6, 9, 11],
    Saturn: [3, 6, 10, 11]
  },
  Mercury: {
    default: [1, 2, 4, 5, 6, 8, 9, 10, 11],
    Sun: [5, 6, 9, 11],
    Moon: [2, 4, 6, 8, 10, 11],
    Mars: [3, 6, 11],
    Mercury: [1, 2, 4, 5, 6, 8, 9, 10, 11],
    Jupiter: [6, 8, 11, 12],
    Venus: [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn: [3, 6, 10, 11]
  },
  Jupiter: {
    default: [1, 2, 4, 5, 7, 8, 9, 10, 11],
    Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11],
    Moon: [2, 5, 7, 9, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [2, 4, 5, 6, 9, 10, 11],
    Jupiter: [1, 2, 4, 5, 7, 8, 9, 10, 11],
    Venus: [2, 5, 6, 9, 10, 11],
    Saturn: [3, 5, 6, 10, 11]
  },
  Venus: {
    default: [1, 2, 3, 4, 5, 8, 9, 11],
    Sun: [1, 2, 3, 4, 8, 9, 10, 11],
    Moon: [1, 2, 3, 4, 5, 8, 9, 11],
    Mars: [3, 6, 11, 12],
    Mercury: [3, 5, 6, 9, 10, 11],
    Jupiter: [5, 8, 9, 10, 11],
    Venus: [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn: [3, 4, 5, 8, 9, 10, 11]
  },
  Saturn: {
    default: [1, 2, 4, 7, 8, 10, 11],
    Sun: [3, 5, 6, 10, 11],
    Moon: [3, 6, 11],
    Mars: [3, 5, 6, 10, 11],
    Mercury: [6, 8, 9, 10, 11],
    Jupiter: [5, 6, 10, 11],
    Venus: [6, 10, 11, 12],
    Saturn: [1, 2, 4, 7, 8, 10, 11]
  },
  Rahu: {
    default: [1, 2, 4, 5, 7, 8, 9, 10, 11],
    Rahu: [1, 2, 4, 5, 7, 8, 9, 10, 11]
  },
  Ketu: {
    default: [1, 2, 4, 5, 7, 8, 9, 10, 11],
    Ketu: [1, 2, 4, 5, 7, 8, 9, 10, 11]
  }
};

function houseDistance(fromHouse, toHouse) {
  if (!Number.isFinite(fromHouse) || !Number.isFinite(toHouse)) return null;
  return ((toHouse - fromHouse + 12) % 12) + 1;
}

function allowedHouses(target, contributor) {
  const row = BINDU_TABLE[target] || BINDU_TABLE.Sun;
  return row[contributor] || row.default || [];
}

function binduFromContributor(target, contributor, contributorProfile, targetHouse) {
  const rel = houseDistance(contributorProfile?.house, targetHouse);
  if (!rel) return 0;
  const allowed = allowedHouses(target, contributor);
  if (!allowed.includes(rel)) return 0;
  if (contributorProfile?.dignity === 'debilitated') return 0.5; // weakened support
  return 1;
}

function buildAshtakavarga(grahaProfiles = []) {
  const byPlanet = {};
  (grahaProfiles || []).forEach((g) => {
    byPlanet[g.planet] = g;
  });
  const contributors = ALL_PLANETS.filter((p) => byPlanet[p]);
  const targets = ALL_PLANETS.filter((p) => byPlanet[p]);

  const planetHouseScores = {};
  const contributorBreakdown = {};

  targets.forEach((target) => {
    planetHouseScores[target] = {};
    contributorBreakdown[target] = {};
    for (let house = 1; house <= 12; house += 1) {
      let total = 0;
      contributors.forEach((src) => {
        const b = binduFromContributor(target, src, byPlanet[src], house);
        total += b;
        contributorBreakdown[target][`${src}:${house}`] = b;
      });
      planetHouseScores[target][house] = Number(total.toFixed(2)); // 0..8-ish
    }
  });

  const sarvashtakavarga = {};
  for (let house = 1; house <= 12; house += 1) {
    const total = CORE_PLANETS.reduce((sum, p) => sum + (planetHouseScores[p]?.[house] || 0), 0);
    sarvashtakavarga[house] = Number(total.toFixed(2)); // classical SAV more commonly core 7
  }

  const keyHouseAvg = KEY_HOUSES.reduce((sum, h) => sum + (sarvashtakavarga[h] || 0), 0) / KEY_HOUSES.length;

  return {
    version: 'v2_table_driven',
    planetHouseScores,
    sarvashtakavarga,
    contributorBreakdown,
    luckOpportunity: {
      keyHouses: KEY_HOUSES,
      averageScore: Number(keyHouseAvg.toFixed(2)),
      level: keyHouseAvg >= 34 ? 'high' : keyHouseAvg >= 28 ? 'moderate' : 'developing',
      note:
        'Luck/opportunity uses Sarvashtakavarga density over houses 2, 9, 10, 11, which represent resources, fortune, career, and gains.'
    },
    caveat:
      'Ashtakavarga v2 is table-driven and closer to classical bindu logic, but remains a pragmatic computational form for product use.'
  };
}

module.exports = {
  buildAshtakavarga
};

