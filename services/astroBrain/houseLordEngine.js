const { SIGN_LORD, HOUSE_MEANING } = require('./constants');

function planetProfileByName(grahaProfiles, name) {
  return grahaProfiles.find((g) => g.planet === name) || null;
}

function scoreForPlanet(strengthScores, planetName) {
  const row = strengthScores?.scores?.find((s) => s.planet === planetName);
  return row ? row.totalScore : null;
}

/**
 * @param {object} chartPayload
 * @param {object[]} grahaProfiles
 * @param {object} strength — output of scoreGrahas
 */
function analyzeHouseLords(chartPayload, grahaProfiles, strength) {
  const ascendant = chartPayload.ascendant;
  const houseCusps = chartPayload.houseCusps || [];
  const strengthScores = strength;

  const houses = houseCusps.map((cusp) => {
    const sign = cusp.sign;
    const house = cusp.house;
    const lord = SIGN_LORD[sign];
    const lordProfile = planetProfileByName(grahaProfiles, lord);
    const dignity = lordProfile?.dignity || 'neutral';
    const lordPlanet = (chartPayload.planets || []).find((p) => p.name === lord);

    return {
      house,
      sign,
      lord,
      lordPlacement: lordPlanet
        ? {
            house: lordPlanet.house,
            sign: lordPlanet.sign,
            dignity,
            strengthScore: scoreForPlanet(strengthScores, lord)
          }
        : {
            house: null,
            sign: null,
            dignity: 'not enough data',
            strengthScore: null
          },
      meaning: HOUSE_MEANING[house] || ''
    };
  });

  const pickLordHouse = (h) => houses.find((x) => x.house === h)?.lordPlacement?.house;

  const highlights = {
    tenthLordPlacement: pickLordHouse(10),
    secondLordPlacement: pickLordHouse(2),
    eleventhLordPlacement: pickLordHouse(11),
    seventhLordPlacement: pickLordHouse(7),
    sixthLordPlacement: pickLordHouse(6),
    eighthLordPlacement: pickLordHouse(8),
    twelfthLordPlacement: pickLordHouse(12),
    notes: {
      tenthLord: 'Tenth lord placement may suggest career direction tone (pattern, not prediction).',
      secondLord: 'Second lord placement may suggest resources and values themes.',
      eleventhLord: 'Eleventh lord placement may suggest gains and network themes.',
      seventhLord: 'Seventh lord placement may suggest partnership pattern themes.',
      sixthLord: 'Sixth lord placement may suggest discipline and health-routine themes.',
      eighthLord: 'Eighth lord placement may suggest transformation and research themes.',
      twelfthLord: 'Twelfth lord placement may suggest rest, closure, or foreign themes.'
    }
  };

  const lordshipsByPlanet = {};
  houses.forEach((h) => {
    if (!lordshipsByPlanet[h.lord]) {
      lordshipsByPlanet[h.lord] = [];
    }
    lordshipsByPlanet[h.lord].push(h.house);
  });

  return {
    ascendant,
    houses,
    highlights,
    lordshipsByPlanet
  };
}

function enrichGrahaFunctionalRoles(grahaProfiles, houseLordData) {
  const map = houseLordData.lordshipsByPlanet || {};
  grahaProfiles.forEach((g) => {
    const ruled = map[g.planet] || [];
    g.functionalRole = ruled.length
      ? [`Sign lord of house(s): ${ruled.join(', ')}`]
      : ['Not a sign lord of an ascendant-based whole-sign house in this chart frame.'];
  });
}

module.exports = {
  analyzeHouseLords,
  enrichGrahaFunctionalRoles
};
