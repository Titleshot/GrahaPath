/**
 * Kundali Milan (marriage matching) -- classical Ashtakoota, 36 gunas.
 *
 * Pure functions: input is the two natal charts we already compute (sidereal Moon longitude,
 * Lagna-relative house of Mars). Convention: the North-Indian / Nepali "Ashtakoot Guna Milan"
 * tables as widely published. A few small cells differ between almanacs; the tables used are
 * listed below so they can be reviewed against a family astrologer's pothi.
 */

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati'
];

const NAK_SPAN = 360 / 27;

// ---- Koota tables ---------------------------------------------------------------------------

// Varna by Moon sign: 4 Brahmin, 3 Kshatriya, 2 Vaishya, 1 Shudra
const VARNA_BY_SIGN = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4];

// Vashya groups: 0 Chatushpada, 1 Manava, 2 Jalachara, 3 Vanachara, 4 Keeta
function vashyaGroup(signIndex, degreeInSign) {
  switch (signIndex) {
    case 0: // Aries
    case 1: // Taurus
      return 0;
    case 2: // Gemini
    case 5: // Virgo
    case 6: // Libra
    case 10: // Aquarius
      return 1;
    case 3: // Cancer
    case 11: // Pisces
      return 2;
    case 4: // Leo
      return 3;
    case 7: // Scorpio
      return 4;
    case 8: // Sagittarius: first half human, second half quadruped
      return degreeInSign < 15 ? 1 : 0;
    case 9: // Capricorn: first half quadruped, second half water
      return degreeInSign < 15 ? 0 : 2;
    default:
      return 1;
  }
}

// rows = groom group, cols = bride group
const VASHYA_MATRIX = [
  [2, 1, 1, 0.5, 1],
  [1, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0, 0, 0, 2, 0],
  [1, 1, 1, 0, 2]
];

const YONI_NAMES = [
  'Horse', 'Elephant', 'Sheep', 'Serpent', 'Dog', 'Cat', 'Rat',
  'Cow', 'Buffalo', 'Tiger', 'Deer', 'Monkey', 'Mongoose', 'Lion'
];

// nakshatra index -> yoni animal index
const YONI_BY_NAKSHATRA = [
  0, 1, 2, 3, 3, 4, 5, 2, 5,
  6, 6, 7, 8, 9, 8, 9, 10, 10,
  4, 11, 12, 11, 13, 0, 13,
  7, 1
];

const YONI_MATRIX = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4]
];

// sign lord: 0 Sun 1 Moon 2 Mars 3 Mercury 4 Jupiter 5 Venus 6 Saturn
const LORD_BY_SIGN = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4];
const LORD_NAMES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

// natural friendship: value is relation of ROW planet towards COLUMN planet (F friend, N neutral, E enemy)
const FRIENDSHIP = [
  /* Sun     */ ['S', 'F', 'F', 'N', 'F', 'E', 'E'],
  /* Moon    */ ['F', 'S', 'N', 'F', 'N', 'N', 'N'],
  /* Mars    */ ['F', 'F', 'S', 'E', 'F', 'N', 'N'],
  /* Mercury */ ['F', 'E', 'N', 'S', 'N', 'F', 'N'],
  /* Jupiter */ ['F', 'F', 'F', 'E', 'S', 'E', 'N'],
  /* Venus   */ ['E', 'E', 'N', 'F', 'N', 'S', 'F'],
  /* Saturn  */ ['E', 'E', 'E', 'F', 'N', 'F', 'S']
];

// Gana: 0 Deva, 1 Manushya, 2 Rakshasa
const GANA_BY_NAKSHATRA = [
  0, 1, 2, 1, 0, 1, 0, 0, 2,
  2, 1, 1, 0, 2, 0, 2, 0, 2,
  2, 1, 1, 0, 2, 2, 1,
  1, 0
];
const GANA_NAMES = ['Deva', 'Manushya', 'Rakshasa'];
// [bride gana][groom gana]
const GANA_MATRIX = [
  [6, 5, 1],
  [6, 6, 0],
  [0, 0, 6]
];

// Nadi: 0 Adi, 1 Madhya, 2 Antya
const NADI_BY_NAKSHATRA = [
  0, 1, 2, 2, 1, 0, 0, 1, 2,
  2, 1, 0, 0, 1, 2, 2, 1, 0,
  0, 1, 2, 2, 1, 0, 0,
  1, 2
];
const NADI_NAMES = ['Adi', 'Madhya', 'Antya'];

const MAX = { varna: 1, vashya: 2, tara: 3, yoni: 4, grahaMaitri: 5, gana: 6, bhakoot: 7, nadi: 8 };

// ---- helpers --------------------------------------------------------------------------------

function norm360(deg) {
  return ((Number(deg) % 360) + 360) % 360;
}

function moonProfile(moonLongitude) {
  const lon = norm360(moonLongitude);
  const signIndex = Math.floor(lon / 30);
  const nakshatraIndex = Math.min(26, Math.floor(lon / NAK_SPAN));
  const pada = Math.min(4, Math.floor((lon % NAK_SPAN) / (NAK_SPAN / 4)) + 1);
  return {
    longitude: lon,
    signIndex,
    sign: SIGNS[signIndex],
    degreeInSign: lon % 30,
    nakshatraIndex,
    nakshatra: NAKSHATRAS[nakshatraIndex],
    pada
  };
}

function relation(a, b) {
  return FRIENDSHIP[a][b];
}

function maitriScore(lordA, lordB) {
  if (lordA === lordB) return 5;
  const ab = relation(lordA, lordB);
  const ba = relation(lordB, lordA);
  const set = [ab, ba].sort().join('');
  switch (set) {
    case 'FF': return 5;
    case 'FN': return 4;
    case 'NN': return 3;
    case 'EF': return 1;
    case 'EN': return 0.5;
    case 'EE': return 0;
    default: return 3;
  }
}

function taraBad(count) {
  const r = count % 9;
  return r === 3 || r === 5 || r === 7;
}

// ---- main ----------------------------------------------------------------------------------

/**
 * @param {number} groomMoon sidereal Moon longitude (0..360)
 * @param {number} brideMoon sidereal Moon longitude (0..360)
 */
function computeAshtakoot(groomMoon, brideMoon) {
  const g = moonProfile(groomMoon);
  const b = moonProfile(brideMoon);

  // 1 Varna: groom's varna must be >= bride's
  const varna = VARNA_BY_SIGN[g.signIndex] >= VARNA_BY_SIGN[b.signIndex] ? 1 : 0;

  // 2 Vashya
  const gVashya = vashyaGroup(g.signIndex, g.degreeInSign);
  const bVashya = vashyaGroup(b.signIndex, b.degreeInSign);
  const vashya = VASHYA_MATRIX[gVashya][bVashya];

  // 3 Tara (counted both ways)
  const countBrideToGroom = ((g.nakshatraIndex - b.nakshatraIndex + 27) % 27) + 1;
  const countGroomToBride = ((b.nakshatraIndex - g.nakshatraIndex + 27) % 27) + 1;
  const badA = taraBad(countBrideToGroom);
  const badB = taraBad(countGroomToBride);
  const tara = badA && badB ? 0 : badA || badB ? 1.5 : 3;

  // 4 Yoni
  const gYoni = YONI_BY_NAKSHATRA[g.nakshatraIndex];
  const bYoni = YONI_BY_NAKSHATRA[b.nakshatraIndex];
  const yoni = YONI_MATRIX[gYoni][bYoni];

  // 5 Graha Maitri (Moon-sign lords)
  const gLord = LORD_BY_SIGN[g.signIndex];
  const bLord = LORD_BY_SIGN[b.signIndex];
  const grahaMaitri = maitriScore(gLord, bLord);

  // 6 Gana
  const gGana = GANA_BY_NAKSHATRA[g.nakshatraIndex];
  const bGana = GANA_BY_NAKSHATRA[b.nakshatraIndex];
  const gana = GANA_MATRIX[bGana][gGana];

  // 7 Bhakoot (Moon-sign distance)
  const dist = ((g.signIndex - b.signIndex + 12) % 12) + 1;
  const bhakootBad = [2, 12, 5, 9, 6, 8].includes(dist);
  const bhakoot = bhakootBad ? 0 : 7;
  // Classical cancellation: same sign lord, or the two lords are mutual friends
  const bhakootCancelled =
    bhakootBad && (gLord === bLord || (relation(gLord, bLord) === 'F' && relation(bLord, gLord) === 'F'));

  // 8 Nadi
  const gNadi = NADI_BY_NAKSHATRA[g.nakshatraIndex];
  const bNadi = NADI_BY_NAKSHATRA[b.nakshatraIndex];
  const nadiBad = gNadi === bNadi;
  const nadi = nadiBad ? 0 : 8;
  // Cancellation commonly accepted: same nakshatra with different pada, or same rashi with different nakshatra
  const nadiCancelled =
    nadiBad &&
    ((g.nakshatraIndex === b.nakshatraIndex && g.pada !== b.pada) ||
      (g.signIndex === b.signIndex && g.nakshatraIndex !== b.nakshatraIndex));

  const kootas = [
    { id: 'varna', score: varna, max: MAX.varna, groom: String(VARNA_BY_SIGN[g.signIndex]), bride: String(VARNA_BY_SIGN[b.signIndex]) },
    { id: 'vashya', score: vashya, max: MAX.vashya, groom: String(gVashya), bride: String(bVashya) },
    { id: 'tara', score: tara, max: MAX.tara, groom: String(countBrideToGroom), bride: String(countGroomToBride) },
    { id: 'yoni', score: yoni, max: MAX.yoni, groom: YONI_NAMES[gYoni], bride: YONI_NAMES[bYoni] },
    { id: 'grahaMaitri', score: grahaMaitri, max: MAX.grahaMaitri, groom: LORD_NAMES[gLord], bride: LORD_NAMES[bLord] },
    { id: 'gana', score: gana, max: MAX.gana, groom: GANA_NAMES[gGana], bride: GANA_NAMES[bGana] },
    { id: 'bhakoot', score: bhakoot, max: MAX.bhakoot, groom: g.sign, bride: b.sign, cancelled: bhakootCancelled },
    { id: 'nadi', score: nadi, max: MAX.nadi, groom: NADI_NAMES[gNadi], bride: NADI_NAMES[bNadi], cancelled: nadiCancelled }
  ];

  const total = kootas.reduce((sum, k) => sum + k.score, 0);

  let verdict;
  if (total >= 33) verdict = 'excellent';
  else if (total >= 25) verdict = 'good';
  else if (total >= 18) verdict = 'average';
  else verdict = 'low';

  return {
    total,
    max: 36,
    verdict,
    kootas,
    doshas: {
      nadi: nadiBad ? (nadiCancelled ? 'cancelled' : 'present') : 'none',
      bhakoot: bhakootBad ? (bhakootCancelled ? 'cancelled' : 'present') : 'none'
    },
    groomMoon: g,
    brideMoon: b
  };
}

const MANGLIK_HOUSES = [1, 2, 4, 7, 8, 12];

function manglikFromChart(chart) {
  const planets = Array.isArray(chart?.planets) ? chart.planets : [];
  const mars = planets.find((p) => p.name === 'Mars');
  const moon = planets.find((p) => p.name === 'Moon');
  if (!mars || !Number.isFinite(Number(mars.house))) return { known: false };
  const fromLagna = MANGLIK_HOUSES.includes(Number(mars.house));
  let fromMoon = false;
  if (moon && Number.isFinite(Number(mars.absoluteDegree)) && Number.isFinite(Number(moon.absoluteDegree))) {
    const marsSign = Math.floor(norm360(mars.absoluteDegree) / 30);
    const moonSign = Math.floor(norm360(moon.absoluteDegree) / 30);
    const houseFromMoon = ((marsSign - moonSign + 12) % 12) + 1;
    fromMoon = MANGLIK_HOUSES.includes(houseFromMoon);
  }
  return { known: true, marsHouse: Number(mars.house), fromLagna, fromMoon, manglik: fromLagna || fromMoon };
}

function compareManglik(groomChart, brideChart) {
  const groom = manglikFromChart(groomChart);
  const bride = manglikFromChart(brideChart);
  let status = 'unknown';
  if (groom.known && bride.known) {
    if (groom.manglik && bride.manglik) status = 'both';
    else if (!groom.manglik && !bride.manglik) status = 'none';
    else status = 'one';
  }
  return { groom, bride, status };
}

function moonLongitudeFromChart(chart) {
  const moon = (chart?.planets || []).find((p) => p.name === 'Moon');
  const lon = Number(moon?.absoluteDegree);
  return Number.isFinite(lon) ? lon : null;
}

function matchCharts(groomChart, brideChart) {
  const gl = moonLongitudeFromChart(groomChart);
  const bl = moonLongitudeFromChart(brideChart);
  if (gl === null || bl === null) {
    const error = new Error('Could not read the Moon position from one of the charts.');
    error.statusCode = 422;
    throw error;
  }
  return {
    ...computeAshtakoot(gl, bl),
    manglik: compareManglik(groomChart, brideChart)
  };
}

module.exports = {
  computeAshtakoot,
  matchCharts,
  manglikFromChart,
  moonProfile,
  // exported for tests
  _tables: { YONI_MATRIX, YONI_BY_NAKSHATRA, GANA_BY_NAKSHATRA, NADI_BY_NAKSHATRA, VASHYA_MATRIX }
};
