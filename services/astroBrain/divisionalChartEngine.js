const { EXALTATION, DEBILITATION } = require('./constants');

const SIGNS = [
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

const MOVABLE = new Set(['Aries', 'Cancer', 'Libra', 'Capricorn']);
const FIXED = new Set(['Taurus', 'Leo', 'Scorpio', 'Aquarius']);
const ODD_SIGNS = new Set(['Aries', 'Gemini', 'Leo', 'Libra', 'Sagittarius', 'Aquarius']);

function normalizeSignIndex(index) {
  return ((index % 12) + 12) % 12;
}

function signIndex(sign) {
  return Math.max(0, SIGNS.indexOf(sign));
}

function navamsaSign(sign, degreeInSign) {
  const part = Math.min(8, Math.floor((degreeInSign % 30) / (30 / 9)));
  const sIdx = signIndex(sign);
  let start = sIdx;
  if (FIXED.has(sign)) {
    start = normalizeSignIndex(sIdx + 8);
  } else if (!MOVABLE.has(sign)) {
    start = normalizeSignIndex(sIdx + 4);
  }
  return SIGNS[normalizeSignIndex(start + part)];
}

function dasamsaSign(sign, degreeInSign) {
  const part = Math.min(9, Math.floor((degreeInSign % 30) / 3));
  const sIdx = signIndex(sign);
  const start = ODD_SIGNS.has(sign) ? sIdx : normalizeSignIndex(sIdx + 8);
  return SIGNS[normalizeSignIndex(start + part)];
}

function buildDivisionalSignals(grahaProfiles = []) {
  const rows = (grahaProfiles || []).map((g) => {
    const natalSign = g.sign;
    const degreeInSign = Number(g.degree) || 0;
    const d9Sign = navamsaSign(g.sign, degreeInSign);
    const d10Sign = dasamsaSign(g.sign, degreeInSign);
    const vargottama = Boolean(natalSign && d9Sign && natalSign === d9Sign);
    const exD1 = EXALTATION[g.planet];
    const debD9 = DEBILITATION[g.planet];
    const hiddenStruggle = Boolean(
      exD1 &&
        debD9 &&
        natalSign === exD1 &&
        d9Sign === debD9 &&
        !['Rahu', 'Ketu'].includes(g.planet)
    );

    return {
      planet: g.planet,
      natalSign,
      degreeInSign,
      d9Sign,
      d10Sign,
      vargottama,
      hiddenStruggle
    };
  });

  const venus = rows.find((r) => r.planet === 'Venus');
  const jupiter = rows.find((r) => r.planet === 'Jupiter');
  const saturn = rows.find((r) => r.planet === 'Saturn');
  const sun = rows.find((r) => r.planet === 'Sun');

  const vargottamaPlanets = rows.filter((r) => r.vargottama).map((r) => r.planet);
  const hiddenStrugglePlanets = rows.filter((r) => r.hiddenStruggle).map((r) => r.planet);

  return {
    divisionalRows: rows,
    vargottamaPlanets,
    hiddenStrugglePlanets,
    d9RelationshipConfirmations: [
      venus ? `Venus D9 in ${venus.d9Sign}` : null,
      jupiter ? `Jupiter D9 in ${jupiter.d9Sign}` : null
    ].filter(Boolean),
    d10CareerConfirmations: [
      saturn ? `Saturn D10 in ${saturn.d10Sign}` : null,
      sun ? `Sun D10 in ${sun.d10Sign}` : null
    ].filter(Boolean),
    caveat:
      'D9/D10 here are lightweight sign-level confirmations used for evidence weighting; full varga judging requires additional classical factors.'
  };
}

module.exports = {
  buildDivisionalSignals
};

