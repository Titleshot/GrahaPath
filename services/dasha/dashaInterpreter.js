const { DEBILITATION, EXALTATION, SIGN_LORD } = require('../astroBrain/constants');

const PLANET_THEMES = {
  Sun: ['identity', 'leadership', 'visibility'],
  Moon: ['emotional regulation', 'home rhythm', 'inner security'],
  Mars: ['action', 'assertion', 'execution pressure'],
  Mercury: ['communication', 'learning', 'analysis'],
  Jupiter: ['guidance', 'growth', 'belief systems'],
  Venus: ['relationships', 'comfort', 'aesthetics'],
  Saturn: ['discipline', 'responsibility', 'long-term structure'],
  Rahu: ['ambition', 'unconventional direction', 'intensity'],
  Ketu: ['detachment', 'inner recalibration', 'simplification']
};

function findPlanet(chart, name) {
  return (chart?.planets || []).find((p) => p?.name === name) || null;
}

function dignityFor(planet) {
  if (!planet || !planet.sign) return 'unknown';
  if (EXALTATION[planet.name] === planet.sign) return 'exalted';
  if (DEBILITATION[planet.name] === planet.sign) return 'debilitated';
  const ownLord = SIGN_LORD[planet.sign];
  if (ownLord && ownLord === planet.name) return 'own_sign';
  return 'neutral';
}

function signSequenceFromAsc(ascSign) {
  const signs = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces'
  ];
  const i = signs.indexOf(ascSign);
  if (i < 0) return signs;
  return [...signs.slice(i), ...signs.slice(0, i)];
}

function ruledHouses(chart, planetName) {
  const seq = signSequenceFromAsc(chart?.ascendant);
  const out = [];
  for (let i = 0; i < seq.length; i += 1) {
    if (SIGN_LORD[seq[i]] === planetName) out.push(i + 1);
  }
  return out;
}

function conjunctionCount(chart, targetName) {
  const target = findPlanet(chart, targetName);
  if (!target || !Number.isFinite(target.house)) return 0;
  return (chart?.planets || []).filter((p) => p?.name !== targetName && p?.house === target.house).length;
}

function transitReinforcement(chart, planetName) {
  const natal = findPlanet(chart, planetName);
  const transit = (chart?.transitsNow?.planets || []).find((p) => p?.name === planetName);
  if (!natal || !transit) return null;
  return natal.house === transit.houseFromNatalAsc ? 'reinforced' : 'background';
}

function buildActiveThemes(maha, antar) {
  const a = PLANET_THEMES[maha] || [];
  const b = PLANET_THEMES[antar] || [];
  return [...new Set([...a.slice(0, 2), ...b.slice(0, 2)])].slice(0, 4);
}

function interpretDashaTiming(chart, dashaData, options = {}) {
  const premiumUnlocked = options.premiumUnlocked === true || String(options.userPlan || '').toLowerCase() === 'full';
  const maha = dashaData?.mahaDasha || null;
  const antar = dashaData?.antarDasha || null;
  const mahaP = findPlanet(chart, maha);
  const antarP = findPlanet(chart, antar);
  const themes = buildActiveThemes(maha, antar);

  const mahaDignity = dignityFor(mahaP);
  const antarDignity = dignityFor(antarP);
  const mahaHouses = ruledHouses(chart, maha);
  const antarHouses = ruledHouses(chart, antar);
  const mahaTransitSignal = transitReinforcement(chart, maha);
  const antarTransitSignal = transitReinforcement(chart, antar);

  const timingSummary = [
    `${maha || 'Unknown'}-${antar || 'Unknown'} timing tends to emphasize ${themes.join(', ') || 'phase transition'}.`,
    mahaP
      ? `${maha} operates through house ${mahaP.house}${mahaHouses.length ? ` and rules houses ${mahaHouses.join('/')}` : ''}.`
      : `${maha || 'Mahadasha lord'} placement is unavailable in this snapshot.`,
    antarP
      ? `${antar} refines this via house ${antarP.house}${antarHouses.length ? ` and rulership ${antarHouses.join('/')}` : ''}.`
      : `${antar || 'Antardasha lord'} placement is unavailable in this snapshot.`
  ].join(' ');

  const out = {
    activeThemes: themes,
    timingSummary
  };

  if (premiumUnlocked) {
    out.premium = {
      maha: {
        dignity: mahaDignity,
        conjunctions: conjunctionCount(chart, maha),
        transitReinforcement: mahaTransitSignal
      },
      antar: {
        dignity: antarDignity,
        conjunctions: conjunctionCount(chart, antar),
        transitReinforcement: antarTransitSignal
      }
    };
  }

  return out;
}

module.exports = {
  interpretDashaTiming
};
