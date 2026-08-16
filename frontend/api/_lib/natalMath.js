const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const EXALTATION = {
  Sun: 'Aries', Moon: 'Taurus', Mars: 'Capricorn', Mercury: 'Virgo',
  Jupiter: 'Cancer', Venus: 'Pisces', Saturn: 'Libra'
};
const DEBILITATION = {
  Sun: 'Libra', Moon: 'Scorpio', Mars: 'Cancer', Mercury: 'Pisces',
  Jupiter: 'Capricorn', Venus: 'Virgo', Saturn: 'Aries'
};
const OWN_SIGNS = {
  Sun: ['Leo'], Moon: ['Cancer'], Mars: ['Aries', 'Scorpio'],
  Mercury: ['Gemini', 'Virgo'], Jupiter: ['Sagittarius', 'Pisces'],
  Venus: ['Taurus', 'Libra'], Saturn: ['Capricorn', 'Aquarius']
};
const FRIEND_SIGNS = {
  Sun: ['Aries', 'Sagittarius', 'Leo', 'Scorpio'],
  Moon: ['Cancer', 'Taurus', 'Gemini', 'Pisces'],
  Mars: ['Aries', 'Scorpio', 'Leo', 'Sagittarius', 'Capricorn'],
  Mercury: ['Gemini', 'Virgo', 'Taurus', 'Capricorn'],
  Jupiter: ['Sagittarius', 'Pisces', 'Cancer', 'Aries', 'Leo'],
  Venus: ['Taurus', 'Libra', 'Capricorn', 'Pisces'],
  Saturn: ['Capricorn', 'Aquarius', 'Libra', 'Virgo', 'Taurus']
};
const ENEMY_SIGNS = {
  Sun: ['Libra', 'Capricorn'],
  Moon: ['Scorpio', 'Capricorn'],
  Mars: ['Cancer', 'Libra'],
  Mercury: ['Pisces'],
  Jupiter: ['Capricorn', 'Gemini', 'Virgo'],
  Venus: ['Virgo', 'Aries', 'Scorpio'],
  Saturn: ['Aries', 'Cancer', 'Leo']
};
const MOVABLE = new Set(['Aries', 'Cancer', 'Libra', 'Capricorn']);
const FIXED = new Set(['Taurus', 'Leo', 'Scorpio', 'Aquarius']);
const ODD_SIGNS = new Set(['Aries', 'Gemini', 'Leo', 'Libra', 'Sagittarius', 'Aquarius']);

function dignityOf(planet, sign) {
  if (planet === 'Rahu' || planet === 'Ketu') return 'shadow';
  if (EXALTATION[planet] === sign) return 'exalted';
  if (DEBILITATION[planet] === sign) return 'debilitated';
  if (OWN_SIGNS[planet]?.includes(sign)) return 'own';
  if (FRIEND_SIGNS[planet]?.includes(sign)) return 'friendly';
  if (ENEMY_SIGNS[planet]?.includes(sign)) return 'enemy';
  return 'neutral';
}

function navamsaSign(sign, degreeInSign) {
  const part = Math.min(8, Math.floor((Number(degreeInSign) % 30) / (30 / 9)));
  const sIdx = SIGNS.indexOf(sign);
  if (sIdx < 0) return null;
  let start = sIdx;
  if (FIXED.has(sign)) start = (sIdx + 8) % 12;
  else if (!MOVABLE.has(sign)) start = (sIdx + 4) % 12;
  return SIGNS[(start + part) % 12];
}

function dasamsaSign(sign, degreeInSign) {
  const part = Math.min(9, Math.floor((Number(degreeInSign) % 30) / 3));
  const sIdx = SIGNS.indexOf(sign);
  if (sIdx < 0) return null;
  const start = ODD_SIGNS.has(sign) ? sIdx : (sIdx + 8) % 12;
  return SIGNS[(start + part) % 12];
}

function enrichPlanet(p) {
  if (!p || typeof p !== 'object') return null;
  const degree = Number(p.degree);
  const d9 = Number.isFinite(degree) ? navamsaSign(p.sign, degree) : null;
  const d10 = Number.isFinite(degree) ? dasamsaSign(p.sign, degree) : null;
  return {
    ...p,
    dignity: p.dignity || dignityOf(p.name, p.sign),
    d9Sign: p.d9Sign || d9,
    d10Sign: p.d10Sign || d10,
    vargottama: Boolean(p.sign && d9 && p.sign === d9)
  };
}

module.exports = { dignityOf, navamsaSign, dasamsaSign, enrichPlanet };
