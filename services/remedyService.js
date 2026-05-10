const { remediesByKey } = require('./remediesDb');

const REMEDY_LIBRARY = {
  Sun: {
    problem: 'Sun themes need alignment around confidence, direction, and responsible leadership.',
    logic: 'Sun alignment builds clarity, vitality, and principled authority.',
    mantra: remediesByKey.Sun.mantra,
    behavior: remediesByKey.Sun.practical_lifestyle,
    action: remediesByKey.Sun.traditional_rituals.slice(0, 2),
    traditional_rituals: remediesByKey.Sun.traditional_rituals,
    practical_lifestyle: remediesByKey.Sun.practical_lifestyle,
    items_to_donate: remediesByKey.Sun.items_to_donate
  },
  Moon: {
    problem: 'Moon themes need emotional steadiness and mental clarity.',
    logic: 'Moon alignment stabilizes feelings without suppressing sensitivity.',
    mantra: remediesByKey.Moon.mantra,
    behavior: remediesByKey.Moon.practical_lifestyle,
    action: remediesByKey.Moon.traditional_rituals.slice(0, 2),
    traditional_rituals: remediesByKey.Moon.traditional_rituals,
    practical_lifestyle: remediesByKey.Moon.practical_lifestyle,
    items_to_donate: remediesByKey.Moon.items_to_donate
  },
  Mars: {
    problem: 'Mars themes need disciplined action and anger management.',
    logic: 'Mars alignment channels force into constructive execution.',
    mantra: remediesByKey.Mars.mantra,
    behavior: remediesByKey.Mars.practical_lifestyle,
    action: remediesByKey.Mars.traditional_rituals.slice(0, 2),
    traditional_rituals: remediesByKey.Mars.traditional_rituals,
    practical_lifestyle: remediesByKey.Mars.practical_lifestyle,
    items_to_donate: remediesByKey.Mars.items_to_donate
  },
  Mercury: {
    problem: 'Mercury themes need cleaner communication and cognitive discipline.',
    logic: 'Mercury alignment improves analysis, speech, and decision quality.',
    mantra: remediesByKey.Mercury.mantra,
    behavior: remediesByKey.Mercury.practical_lifestyle,
    action: remediesByKey.Mercury.traditional_rituals.slice(0, 2),
    traditional_rituals: remediesByKey.Mercury.traditional_rituals,
    practical_lifestyle: remediesByKey.Mercury.practical_lifestyle,
    items_to_donate: remediesByKey.Mercury.items_to_donate
  },
  Jupiter: {
    problem: 'Jupiter themes need wisdom-led expansion and humility.',
    logic: 'Jupiter alignment strengthens meaning, ethics, and guidance.',
    mantra: remediesByKey.Jupiter.mantra,
    behavior: remediesByKey.Jupiter.practical_lifestyle,
    action: remediesByKey.Jupiter.traditional_rituals.slice(0, 2),
    traditional_rituals: remediesByKey.Jupiter.traditional_rituals,
    practical_lifestyle: remediesByKey.Jupiter.practical_lifestyle,
    items_to_donate: remediesByKey.Jupiter.items_to_donate
  },
  Venus: {
    problem: 'Venus themes need balanced attachment, values, and relationship hygiene.',
    logic: 'Venus alignment supports harmony without indulgent avoidance.',
    mantra: remediesByKey.Venus.mantra,
    behavior: remediesByKey.Venus.practical_lifestyle,
    action: remediesByKey.Venus.traditional_rituals.slice(0, 2),
    traditional_rituals: remediesByKey.Venus.traditional_rituals,
    practical_lifestyle: remediesByKey.Venus.practical_lifestyle,
    items_to_donate: remediesByKey.Venus.items_to_donate
  },
  Saturn: {
    problem: 'Saturn themes need patience, structure, and karmic accountability.',
    logic: 'Saturn alignment turns pressure into long-term stability.',
    mantra: remediesByKey.Saturn.mantra,
    behavior: remediesByKey.Saturn.practical_lifestyle,
    action: remediesByKey.Saturn.traditional_rituals.slice(0, 2),
    traditional_rituals: remediesByKey.Saturn.traditional_rituals,
    practical_lifestyle: remediesByKey.Saturn.practical_lifestyle,
    items_to_donate: remediesByKey.Saturn.items_to_donate
  },
  Rahu: {
    problem: 'Rahu themes need clarity against obsession, confusion, and shortcuts.',
    logic: 'Rahu alignment converts hunger into strategy and discipline.',
    mantra: remediesByKey.Rahu.mantra,
    behavior: remediesByKey.Rahu.practical_lifestyle,
    action: remediesByKey.Rahu.traditional_rituals.slice(0, 2),
    traditional_rituals: remediesByKey.Rahu.traditional_rituals,
    practical_lifestyle: remediesByKey.Rahu.practical_lifestyle,
    items_to_donate: remediesByKey.Rahu.items_to_donate
  },
  Ketu: {
    problem: 'Ketu themes need grounded detachment and practical spiritual integration.',
    logic: 'Ketu alignment converts withdrawal into insight and focus.',
    mantra: remediesByKey.Ketu.mantra,
    behavior: remediesByKey.Ketu.practical_lifestyle,
    action: remediesByKey.Ketu.traditional_rituals.slice(0, 2),
    traditional_rituals: remediesByKey.Ketu.traditional_rituals,
    practical_lifestyle: remediesByKey.Ketu.practical_lifestyle,
    items_to_donate: remediesByKey.Ketu.items_to_donate
  }
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function scorePlanet(planet) {
  const interpretation = planet.interpretation || {};
  let score = 0;

  if ([1, 4, 7, 10].includes(planet.house)) {
    score += 3;
  }

  if (['Saturn', 'Moon', 'Rahu', 'Ketu'].includes(planet.name)) {
    score += 2;
  }

  if (interpretation.challenge) {
    score += 1;
  }

  return score;
}

function generateRemedies(chart, limit = 3) {
  const planets = [...(chart.planets || [])].sort((a, b) => scorePlanet(b) - scorePlanet(a));

  return planets
    .map((planet) => {
      const remedy = REMEDY_LIBRARY[planet.name];

      if (!remedy) {
        return null;
      }

      return {
        planet: planet.name,
        sign: planet.sign,
        house: planet.house,
        problem: remedy.problem,
        logic: remedy.logic,
        remedy: {
          mantra: remedy.mantra,
          repetition: '11 times daily',
          behaviorAlignment: remedy.behavior,
          practicalAction: remedy.action
        },
        note: 'This helps align your energy; it is not a promise to remove every challenge.'
      };
    })
    .filter(Boolean)
    .filter((remedy, index, remedies) => remedies.findIndex((item) => item.planet === remedy.planet) === index)
    .slice(0, limit);
}

module.exports = {
  remediesByKey,
  REMEDY_LIBRARY,
  generateRemedies
};
