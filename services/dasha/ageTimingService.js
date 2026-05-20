const { DateTime } = require('luxon');
const { calculateDashaAtDate, getVimshottariTimeline } = require('./dashaCalculator');

const SIGN_LORD = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter'
};

function parseIsoDate(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const dt = DateTime.fromISO(value, { setZone: true });
  return dt.isValid ? dt : null;
}

function birthDateTime(chart) {
  const ad = chart?.birthDateAD;
  if (!ad || typeof ad !== 'string') return null;
  const zone = chart?.timezone || 'UTC';
  const dt = DateTime.fromISO(ad, { zone });
  return dt.isValid ? dt : DateTime.fromISO(`${ad}T12:00:00`, { zone });
}

function houseLordMap(chart) {
  const rows = chart?.astroBrain?.houseLords?.houses || chart?.astroBrain?.debug?.houseLords?.houses || [];
  const out = {};
  for (const h of rows) {
    if (h?.house != null) out[h.house] = h.lord || null;
  }
  if (Object.keys(out).length) return out;
  const asc = chart?.ascendant;
  if (!asc) return out;
  const ascIdx = [
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
  ].indexOf(asc);
  if (ascIdx < 0) return out;
  for (let house = 1; house <= 12; house += 1) {
    const sign = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][
      (ascIdx + house - 1) % 12
    ];
    out[house] = SIGN_LORD[sign] || null;
  }
  return out;
}

function planetsInHouse(chart, houseNum) {
  return (chart?.planets || []).filter((p) => p?.house === houseNum).map((p) => p.name);
}

/**
 * 0–100 visibility / public-recognition activation for a dasha pair.
 */
function scoreRecognitionActivation(chart, mahaDasha, antarDasha) {
  const lords = houseLordMap(chart);
  const tenthLord = lords[10] || null;
  const eleventhLord = lords[11] || null;
  let score = 28;

  const md = mahaDasha || null;
  const ad = antarDasha || null;

  if (md && (md === tenthLord || md === eleventhLord)) score += 22;
  if (ad && (ad === tenthLord || ad === eleventhLord)) score += 18;
  if (md && ['Sun', 'Jupiter', 'Venus', 'Rahu'].includes(md)) score += 12;
  if (ad && ['Sun', 'Mercury', 'Venus', 'Rahu', 'Jupiter'].includes(ad)) score += 10;
  if (md === 'Jupiter' && ad === 'Saturn') score += 6;
  if (md === 'Rahu' && ['Mercury', 'Venus', 'Jupiter'].includes(ad)) score += 8;

  const h10 = planetsInHouse(chart, 10);
  const h11 = planetsInHouse(chart, 11);
  const h1 = planetsInHouse(chart, 1);
  if (h10.includes('Sun') || h1.includes('Sun')) score += 12;
  if (h10.includes('Rahu') || h11.includes('Rahu')) score += 10;
  if (h10.includes('Jupiter') || h11.includes('Jupiter')) score += 6;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function ageOnDate(birth, when) {
  if (!birth?.isValid || !when?.isValid) return null;
  const years = when.diff(birth, 'years').years;
  if (!Number.isFinite(years)) return null;
  return Math.max(0, Math.round(years * 10) / 10);
}

function buildAgeTimingRow(chart, ageYears) {
  const birth = birthDateTime(chart);
  if (!birth?.isValid) return null;
  const when = birth.plus({ years: ageYears });
  const dasha = calculateDashaAtDate(chart, when, { preferEngine: true });
  const score = scoreRecognitionActivation(chart, dasha.mahaDasha, dasha.antarDasha);
  return {
    age: ageYears,
    calendarDate: when.toISODate(),
    calendarYear: when.year,
    mahaDasha: dasha.mahaDasha,
    antarDasha: dasha.antarDasha,
    antarStart: dasha.startDate,
    antarEnd: dasha.endDate,
    recognitionScore: score
  };
}

function extractAgesFromMessage(text) {
  const t = String(text || '');
  const ages = new Set();

  for (const m of t.matchAll(/\bat\s+age\s+(\d{1,2})\b/gi)) {
    ages.add(Number(m[1]));
  }
  for (const m of t.matchAll(/\bage[s]?\s+(\d{1,2})\s*[-–]\s*(\d{1,2})\b/gi)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i += 1) ages.add(i);
  }
  if (
    /(?:age|ages|successful|success|famous|fame|recognition|when|कति उमेर|उमेर)/i.test(t) &&
    /(?:\d{1,2}\s*[,/|]\s*)+\d{1,2}|\bor\b.*\d{1,2}/i.test(t)
  ) {
    for (const m of t.matchAll(/\b(\d{1,2})\b/g)) {
      const n = Number(m[1]);
      if (n >= 5 && n <= 70) ages.add(n);
    }
  }

  return [...ages].sort((a, b) => a - b);
}

function iterAntardashaSegments(chart, maxAge = 55) {
  const birth = birthDateTime(chart);
  if (!birth?.isValid) return [];
  const timeline = getVimshottariTimeline(chart);
  const endLimit = birth.plus({ years: maxAge });
  const segments = [];

  for (const maha of timeline) {
    const antars = Array.isArray(maha.antardasha) ? maha.antardasha : [];
    for (const antar of antars) {
      const start = parseIsoDate(antar.startDateApprox);
      const end = parseIsoDate(antar.endDateApprox);
      if (!start?.isValid || !end?.isValid) continue;
      if (end < birth || start > endLimit) continue;
      const mid = start.plus({ milliseconds: Math.floor(end.diff(start).milliseconds / 2) });
      if (mid < birth || mid > endLimit) continue;
      const age = ageOnDate(birth, mid);
      if (age == null || age > maxAge) continue;
      segments.push({
        age,
        calendarDate: mid.toISODate(),
        calendarYear: mid.year,
        mahaDasha: maha.planet || null,
        antarDasha: antar.antarLord || null,
        antarStart: antar.startDateApprox,
        antarEnd: antar.endDateApprox,
        recognitionScore: scoreRecognitionActivation(chart, maha.planet, antar.antarLord)
      });
    }
  }
  return segments;
}

function buildTopRecognitionWindows(chart, limit = 5) {
  const segments = iterAntardashaSegments(chart, 55);
  const ranked = [...segments].sort((a, b) => b.recognitionScore - a.recognitionScore);
  const picked = [];
  const used = new Set();

  for (const row of ranked) {
    const key = `${row.mahaDasha}|${row.antarDasha}|${Math.floor(row.age)}`;
    if (used.has(key)) continue;
    used.add(key);
    picked.push(row);
    if (picked.length >= limit) break;
  }

  return picked.map((row, index) => ({
    rank: index + 1,
    age: row.age,
    ageLabel: `${Math.floor(row.age)}`,
    calendarYear: row.calendarYear,
    calendarDate: row.calendarDate,
    mahaDasha: row.mahaDasha,
    antarDasha: row.antarDasha,
    antarWindow: `${row.antarStart || '?'} – ${row.antarEnd || '?'}`,
    recognitionScore: row.recognitionScore
  }));
}

function matchLabel(score, topScore) {
  if (topScore == null || score == null) return 'unknown';
  if (score >= topScore - 8) return 'strong_match';
  if (score >= topScore - 20) return 'partial_match';
  return 'weak_match';
}

/**
 * Precomputed timing facts for fame / age questions (injected into chat context).
 */
function buildFameTimingContext(chart, userMessage = '') {
  const birth = birthDateTime(chart);
  const lords = houseLordMap(chart);
  const currentOnly = calculateDashaAtDate(chart, DateTime.now(), { preferEngine: true });

  const topWindows = buildTopRecognitionWindows(chart, 5);
  const topScore = topWindows[0]?.recognitionScore ?? null;

  const defaultAges = [7, 9, 16, 18, 25, 30];
  const fromMsg = extractAgesFromMessage(userMessage);
  const ageList = fromMsg.length ? fromMsg : defaultAges;

  const queriedAges = ageList
    .map((age) => buildAgeTimingRow(chart, age))
    .filter(Boolean)
    .map((row) => ({
      ...row,
      matchVsTopWindow: matchLabel(row.recognitionScore, topScore)
    }));

  const primary = topWindows[0] || null;

  return {
    birthYear: birth?.isValid ? birth.year : null,
    tenthLord: lords[10] || null,
    eleventhLord: lords[11] || null,
    sunHouse: (chart?.planets || []).find((p) => p.name === 'Sun')?.house ?? null,
    currentDashaOnly: {
      note: 'For TODAY only — never use for childhood or past-age questions',
      mahaDasha: currentOnly.mahaDasha,
      antarDasha: currentOnly.antarDasha,
      startDate: currentOnly.startDate,
      endDate: currentOnly.endDate
    },
    primaryRecognitionWindow: primary
      ? {
          age: primary.age,
          calendarYears: String(primary.calendarYear),
          mahaDasha: primary.mahaDasha,
          antarDasha: primary.antarDasha,
          recognitionScore: primary.recognitionScore,
          antarWindow: primary.antarWindow
        }
      : null,
    topRecognitionWindows: topWindows,
    queriedAges,
    rules: [
      'Answer past ages using queriedAges and topRecognitionWindows only.',
      'Never assign currentDashaOnly to a past age.',
      'If user names a success age, compare recognitionScore and matchVsTopWindow — do not invent a new story.',
      'Give one primary age or narrow window (e.g. 17–19) when asked "tell me the age".'
    ]
  };
}

module.exports = {
  buildFameTimingContext,
  buildAgeTimingRow,
  extractAgesFromMessage,
  scoreRecognitionActivation,
  buildTopRecognitionWindows
};
