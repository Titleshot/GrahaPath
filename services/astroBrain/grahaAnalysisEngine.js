const {
  FIRE,
  EARTH,
  AIR,
  WATER,
  CARDINAL,
  FIXED,
  MUTABLE,
  EXALTATION,
  DEBILITATION,
  OWN_SIGNS,
  FRIEND_SIGNS,
  ENEMY_SIGNS,
  HOUSE_MEANING
} = require('./constants');

function elementOf(sign) {
  if (FIRE.has(sign)) return 'Fire';
  if (EARTH.has(sign)) return 'Earth';
  if (AIR.has(sign)) return 'Air';
  if (WATER.has(sign)) return 'Water';
  return 'Unknown';
}

function modalityOf(sign) {
  if (CARDINAL.has(sign)) return 'Cardinal';
  if (FIXED.has(sign)) return 'Fixed';
  if (MUTABLE.has(sign)) return 'Mutable';
  return 'Unknown';
}

function dignityCategory(planet, sign) {
  if (planet === 'Rahu' || planet === 'Ketu') {
    return 'shadow';
  }
  if (EXALTATION[planet] === sign) return 'exalted';
  if (DEBILITATION[planet] === sign) return 'debilitated';
  if (OWN_SIGNS[planet]?.includes(sign)) return 'own';
  if (FRIEND_SIGNS[planet]?.has(sign)) return 'friendly';
  if (ENEMY_SIGNS[planet]?.has(sign)) return 'enemy';
  return 'neutral';
}

function naturalNature(planet) {
  const map = {
    Sun: 'mild malefic / authority',
    Moon: 'benefic when strong, unstable when afflicted',
    Mars: 'malefic / energy',
    Mercury: 'neutral / analytical',
    Jupiter: 'benefic / wisdom',
    Venus: 'benefic / pleasure and relationship',
    Saturn: 'malefic / discipline and delay',
    Rahu: 'shadow malefic / obsession and amplification',
    Ketu: 'shadow malefic / detachment and spiritualization'
  };
  return map[planet] || 'neutral / mixed';
}

function lifeDomainsFromHouse(house) {
  return HOUSE_MEANING[house] || 'general life themes';
}

function expressionStyle(planet, sign, element) {
  return `${planet} in ${sign} (${element}) tends to express through the tone of that sign while coloring the life area of the house it occupies.`;
}

function positiveExpression(planet, sign) {
  const hints = {
    Sun: 'may suggest clarity of purpose and visible integrity when balanced.',
    Moon: 'may suggest emotional intelligence and adaptability when supported.',
    Mars: 'may suggest courage and decisive follow-through when channeled.',
    Mercury: 'may suggest learning agility and practical communication.',
    Jupiter: 'may suggest guidance, ethics, and growth through meaning.',
    Venus: 'may suggest harmony, aesthetics, and relational warmth.',
    Saturn: 'may suggest endurance, maturity, and structured mastery over time.',
    Rahu: 'may suggest innovation and strategic ambition when grounded.',
    Ketu: 'may suggest insight, release, and pattern-breaking perspective.'
  };
  return `${hints[planet] || 'may suggest constructive use of this energy.'} (Pattern; not a guarantee.)`;
}

function challengingExpression(planet, sign) {
  const hints = {
    Sun: 'pressure around ego, visibility, or authority may appear as tension.',
    Moon: 'mood cycles or sensitivity may need steadier routines.',
    Mars: 'impatience or conflict spikes may need pacing and boundaries.',
    Mercury: 'overthinking or scattered focus may need simplification.',
    Jupiter: 'excess optimism or dogma may need practical checks.',
    Venus: 'attachment or avoidance may need honest calibration.',
    Saturn: 'delay, self-doubt, or heaviness may need patience and support.',
    Rahu: 'restlessness or fixation may need containment and strategy.',
    Ketu: 'withdrawal or doubt may need grounding in daily life.'
  };
  return `${hints[planet] || 'this placement may highlight an area to work with consciously.'} (Tendency language; not fate.)`;
}

function coreAstroTruth(planet, house, sign, dignity) {
  if (planet === 'Rahu') {
    return `Rahu may amplify themes of house ${house} in ${sign}; obsession and hunger for experience are possible patterns to observe.`;
  }
  if (planet === 'Ketu') {
    return `Ketu may spiritualize or detach from house ${house} themes in ${sign}; release and insight are possible patterns to observe.`;
  }
  return `${planet} in ${sign} (house ${house}, dignity: ${dignity}) suggests a recurring tone in how this planet’s themes show up in life.`;
}

/**
 * @param {object} chartPayload — same shape as generateBirthChart output (planets, ascendant, houseCusps, …)
 * @returns {object[]}
 */
function analyzeGrahas(chartPayload) {
  const planets = chartPayload.planets || [];

  return planets.map((p) => {
    const planet = p.name;
    const sign = p.sign;
    const house = p.house;
    const degree = p.degree;
    const nakshatra = p.nakshatra;
    const nakshatraPada = p.nakshatraPada;
    const element = elementOf(sign);
    const modality = modalityOf(sign);
    const dignity = dignityCategory(planet, sign);
    const natural = naturalNature(planet);

    return {
      planet,
      sign,
      house,
      absoluteDegree: p.absoluteDegree,
      activeBhavaHouse: p.activeBhavaHouse ?? null,
      degree,
      speed: p.speed ?? null,
      retrograde: p.retrograde === true,
      nakshatra,
      nakshatraPada,
      element,
      modality,
      dignity,
      naturalNature: natural,
      functionalRole: [],
      lifeDomains: lifeDomainsFromHouse(house),
      bhavaLayer:
        p.activeBhavaHouse && p.activeBhavaHouse !== house
          ? `Bhava-chalit may shift practical emphasis toward house ${p.activeBhavaHouse} while rashi house ${house} remains foundational.`
          : `Rashi and active bhava both emphasize house ${house}.`,
      expressionStyle: expressionStyle(planet, sign, element),
      positiveExpression: positiveExpression(planet, sign),
      challengingExpression: challengingExpression(planet, sign),
      coreAstroTruth: coreAstroTruth(planet, house, sign, dignity)
    };
  });
}

module.exports = {
  analyzeGrahas,
  dignityCategory,
  elementOf,
  modalityOf
};
