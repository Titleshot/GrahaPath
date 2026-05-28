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

const FIRST_BREAKOUT_AGE_MIN = 10;
const FIRST_BREAKOUT_AGE_MAX = 32;
const SEGMENT_SCAN_MAX_AGE = 55;

function parseIsoDate(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const dt = DateTime.fromISO(value, { setZone: true });
  return dt.isValid ? dt : null;
}

function birthDateTime(chart) {
  const core = chart?.timingCore;
  const zone = chart?.timezone || core?.timezone || 'UTC';
  const ad = chart?.birthDateAD || core?.birthDateAD;
  if (ad && typeof ad === 'string') {
    const dt = DateTime.fromISO(ad, { zone });
    if (dt.isValid) return dt;
    const fallback = DateTime.fromISO(`${ad}T12:00:00`, { zone });
    if (fallback.isValid) return fallback;
  }
  const local = chart?.localDateTime || core?.localDateTime;
  if (local && typeof local === 'string') {
    const dt = DateTime.fromISO(local, { setZone: true });
    if (dt.isValid) return dt;
  }
  return null;
}

/**
 * Free-tier API strips Moon absoluteDegree; timingCore restores it for Vimshottari only.
 */
function chartForTiming(chart) {
  const core = chart?.timingCore;
  if (!core) return chart;
  const planets = Array.isArray(chart.planets)
    ? chart.planets.map((p) => {
        if (p?.name !== 'Moon') return p;
        return {
          ...p,
          absoluteDegree: Number.isFinite(Number(p.absoluteDegree))
            ? Number(p.absoluteDegree)
            : core.moonAbsoluteDegree,
          nakshatra: p.nakshatra || core.moonNakshatra
        };
      })
    : [];
  return {
    ...chart,
    birthDateAD: chart.birthDateAD || core.birthDateAD,
    localDateTime: chart.localDateTime || core.localDateTime,
    timezone: chart.timezone || core.timezone,
    planets
  };
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
  for (let house = 1; house <= 12; house += 1) {
    out[house] = SIGN_LORD[signs[(ascIdx + house - 1) % 12]] || null;
  }
  return out;
}

function planetsInHouse(chart, houseNum) {
  return (chart?.planets || []).filter((p) => p?.house === houseNum).map((p) => p.name);
}

function detectFameQueryMode(userMessage) {
  const t = String(userMessage || '').toLowerCase();
  if (
    /(first|begin|beginning|start|started|debut|breakout|break\s*through|initial|when\s+did|at\s+what\s+age)/i.test(t) &&
    /(recognition|famous|fame|success|public|visibility|mass)/i.test(t)
  ) {
    return 'first_breakout';
  }
  if (/(successful|succeeded|got\s+famous|success\s+at|which\s+age|ages?\s+\d|,\s*\d|\bor\b\s*\d)/i.test(t)) {
    return 'compare_ages';
  }
  return 'general';
}

/**
 * Life-event anchors → age at event + boost for recognition scoring.
 */
function lifeEventAgeBoosts(chart) {
  const ver = chart?.lifeEventVerification;
  const events = Array.isArray(ver?.events) ? ver.events : [];
  const birth = birthDateTime(chart);
  if (!birth?.isValid || !events.length) return [];

  const careerTypes = new Set(['career', 'job', 'finance', 'other']);
  const boosts = [];

  for (const evt of events) {
    const anchor = evt?.anchor;
    if (!anchor || evt.timeAccuracyMatch == null) continue;
    const when = parseIsoDate(anchor.length === 7 ? `${anchor}-15` : anchor);
    if (!when?.isValid) continue;
    const age = ageOnDate(birth, when);
    if (age == null) continue;
    const category = String(evt?.category || evt?.type || '').toLowerCase();
    const isCareerish = careerTypes.has(category) || /career|job|fame|public/i.test(category);
    const match01 = Number(evt.timeAccuracyMatch) || 0;
    let boost = 8 + Math.round(match01 * 22);
    if (isCareerish) boost += 10;
    if (match01 >= 0.52) boost += 6;
    boosts.push({
      age: Math.round(age * 10) / 10,
      calendarYear: when.year,
      anchor,
      boost: Math.min(35, boost),
      mahadashaLord: evt.mahadashaLord || null,
      antarLord: evt.antarLord || null,
      note: evt.note || evt.type || category
    });
  }
  return boosts;
}

function boostForAge(age, boosts) {
  if (age == null || !boosts.length) return 0;
  let extra = 0;
  for (const b of boosts) {
    if (Math.abs(b.age - age) <= 1.25) extra = Math.max(extra, b.boost);
    else if (Math.abs(b.age - age) <= 2.5) extra = Math.max(extra, Math.round(b.boost * 0.45));
  }
  return extra;
}

/**
 * 0–100 visibility / public-recognition activation for a dasha pair.
 */
function scoreRecognitionActivation(chart, mahaDasha, antarDasha, age = null) {
  const lords = houseLordMap(chart);
  const tenthLord = lords[10] || null;
  const eleventhLord = lords[11] || null;
  const sun = (chart?.planets || []).find((p) => p.name === 'Sun');
  const sunHouse = sun?.house ?? null;
  let score = 24;

  const md = mahaDasha || null;
  const ad = antarDasha || null;

  if (md && (md === tenthLord || md === eleventhLord)) score += 24;
  if (ad && (ad === tenthLord || ad === eleventhLord)) score += 20;
  if (md && md === tenthLord && ad && ad === eleventhLord) score += 8;
  if (md && ['Sun', 'Jupiter', 'Venus', 'Rahu'].includes(md)) score += 10;
  if (ad && ['Sun', 'Mercury', 'Venus', 'Rahu', 'Jupiter'].includes(ad)) score += 12;

  if (md === 'Rahu' && ['Mercury', 'Venus', 'Jupiter'].includes(ad)) score += 10;
  if (md === 'Jupiter' && ['Mercury', 'Venus', 'Saturn', 'Sun'].includes(ad)) score += 8;
  if (md === 'Jupiter' && ad === 'Saturn') score += 12;
  if (md === 'Jupiter' && ad === 'Mercury') score += 8;
  if (md === 'Venus' || ad === 'Venus') score += 6;

  const h10 = planetsInHouse(chart, 10);
  const h11 = planetsInHouse(chart, 11);
  const h1 = planetsInHouse(chart, 1);
  if (h10.includes('Sun') || h1.includes('Sun') || sunHouse === 10 || sunHouse === 1) score += 14;
  if (h10.includes('Rahu') || h11.includes('Rahu')) score += 10;
  if (h10.includes('Jupiter') || h11.includes('Jupiter')) score += 8;
  if (h10.includes('Mercury') || h11.includes('Mercury')) score += 6;

  const cw = chart?.careerWealth;
  if (cw?.career?.points != null && cw.career.points >= 58) score += 6;
  if (cw?.visibility?.points != null && cw.visibility.points >= 55) score += 5;

  if (age != null && age >= FIRST_BREAKOUT_AGE_MIN && age <= FIRST_BREAKOUT_AGE_MAX) {
    if (['Rahu', 'Jupiter', 'Venus', 'Mercury', 'Sun'].includes(md) || ['Rahu', 'Jupiter', 'Venus', 'Mercury', 'Sun'].includes(ad)) {
      score += 8;
    }
  }

  if (age != null && age > 38) score -= 12;
  if (age != null && age > 45) score -= 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function ageOnDate(birth, when) {
  if (!birth?.isValid || !when?.isValid) return null;
  const years = when.diff(birth, 'years').years;
  if (!Number.isFinite(years)) return null;
  return Math.max(0, Math.round(years * 10) / 10);
}

function iterAntardashaSegments(chart, maxAge = SEGMENT_SCAN_MAX_AGE) {
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
      if (mid < birth) continue;
      const ageMid = ageOnDate(birth, mid);
      const ageStart = ageOnDate(birth, start);
      const ageEnd = ageOnDate(birth, end);
      if (ageMid == null || ageMid > maxAge) continue;
      const baseScore = scoreRecognitionActivation(chart, maha.planet, antar.antarLord, ageMid);
      segments.push({
        age: ageMid,
        ageStart,
        ageEnd,
        calendarDate: mid.toISODate(),
        calendarYear: mid.year,
        calendarYearStart: start.year,
        calendarYearEnd: end.year,
        mahaDasha: maha.planet || null,
        antarDasha: antar.antarLord || null,
        antarStart: antar.startDateApprox,
        antarEnd: antar.endDateApprox,
        recognitionScore: baseScore
      });
    }
  }
  return segments;
}

function applyBoostsToSegments(segments, boosts) {
  return segments.map((row) => {
    const midBoost = boostForAge(row.age, boosts);
    const startBoost = row.ageStart != null ? boostForAge(row.ageStart, boosts) : 0;
    const endBoost = row.ageEnd != null ? boostForAge(row.ageEnd, boosts) : 0;
    const eventBoost = Math.max(midBoost, startBoost, endBoost);
    return {
      ...row,
      recognitionScore: Math.min(100, row.recognitionScore + eventBoost),
      lifeEventBoost: eventBoost
    };
  });
}

function formatAgeRangeLabel(ageStart, ageEnd) {
  const a = ageStart != null ? Math.floor(ageStart) : null;
  const b = ageEnd != null ? Math.floor(ageEnd) : null;
  if (a == null && b == null) return null;
  if (a != null && b != null) {
    if (a === b) return String(a);
    if (Math.abs(b - a) <= 3) return `${a}–${b}`;
    return `${a}–${b}`;
  }
  return String(a ?? b);
}

function formatYearRange(row) {
  const ys = row.calendarYearStart;
  const ye = row.calendarYearEnd;
  if (ys && ye && ys !== ye) return `${ys}–${ye}`;
  return String(row.calendarYear || ys || ye || '');
}

function segmentCoversAge(segment, age) {
  if (segment.ageStart != null && segment.ageEnd != null) {
    return age >= segment.ageStart - 0.1 && age <= segment.ageEnd + 0.1;
  }
  return Math.abs(segment.age - age) <= 2;
}

function peakTimingForAge(chart, ageYears, segments, boosts) {
  const covering = segments.filter((s) => segmentCoversAge(s, ageYears));
  const pool = covering.length ? covering : segments.filter((s) => Math.abs(s.age - ageYears) <= 2.5);
  if (pool.length) {
    const best = pool.reduce((a, b) => (a.recognitionScore >= b.recognitionScore ? a : b));
    return {
      age: ageYears,
      ageRangeLabel: formatAgeRangeLabel(best.ageStart, best.ageEnd),
      calendarDate: best.calendarDate,
      calendarYear: best.calendarYear,
      calendarYears: formatYearRange(best),
      mahaDasha: best.mahaDasha,
      antarDasha: best.antarDasha,
      antarStart: best.antarStart,
      antarEnd: best.antarEnd,
      recognitionScore: best.recognitionScore,
      scoredFrom: 'antar_window_peak'
    };
  }
  const birth = birthDateTime(chart);
  if (!birth?.isValid) return null;
  const when = birth.plus({ years: ageYears });
  const dasha = calculateDashaAtDate(chart, when, { preferEngine: true });
  let score = scoreRecognitionActivation(chart, dasha.mahaDasha, dasha.antarDasha, ageYears);
  score = Math.min(100, score + boostForAge(ageYears, boosts));
  return {
    age: ageYears,
    ageRangeLabel: String(ageYears),
    calendarDate: when.toISODate(),
    calendarYear: when.year,
    calendarYears: String(when.year),
    mahaDasha: dasha.mahaDasha,
    antarDasha: dasha.antarDasha,
    antarStart: dasha.startDate,
    antarEnd: dasha.endDate,
    recognitionScore: score,
    scoredFrom: 'birthday_snapshot'
  };
}

function buildAgeTimingRow(chart, ageYears, segments, boosts) {
  return peakTimingForAge(chart, ageYears, segments, boosts);
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

function effectiveScore(row, queryMode) {
  let s = row.recognitionScore;
  if (queryMode !== 'first_breakout') return s;
  if (row.age >= 14 && row.age <= 20) s += 14;
  else if (row.age >= 21 && row.age <= 24) s += 4;
  return s;
}

function pickPrimaryWindow(segments, queryMode) {
  let pool = [...segments];
  if (queryMode === 'first_breakout') {
    pool = pool.filter((s) => s.age >= FIRST_BREAKOUT_AGE_MIN && s.age <= FIRST_BREAKOUT_AGE_MAX);
  }
  if (!pool.length) pool = [...segments].filter((s) => s.age <= 40);
  if (!pool.length) pool = [...segments];
  pool.sort((a, b) => effectiveScore(b, queryMode) - effectiveScore(a, queryMode));
  return pool[0] || null;
}

function buildTopRecognitionWindows(chart, options = {}) {
  const limit = options.limit ?? 5;
  const queryMode = options.queryMode ?? 'general';
  const boosts = options.boosts ?? lifeEventAgeBoosts(chart);
  let segments = applyBoostsToSegments(iterAntardashaSegments(chart, SEGMENT_SCAN_MAX_AGE), boosts);

  if (queryMode === 'first_breakout') {
    segments = segments.filter((s) => s.age >= FIRST_BREAKOUT_AGE_MIN && s.age <= FIRST_BREAKOUT_AGE_MAX);
  }

  const ranked = [...segments].sort(
    (a, b) => effectiveScore(b, queryMode) - effectiveScore(a, queryMode) || b.recognitionScore - a.recognitionScore
  );
  const picked = [];
  const used = new Set();

  for (const row of ranked) {
    const key = `${row.mahaDasha}|${row.antarDasha}|${row.antarStart}`;
    if (used.has(key)) continue;
    used.add(key);
    picked.push(row);
    if (picked.length >= limit) break;
  }

  return picked.map((row, index) => ({
    rank: index + 1,
    age: row.age,
    ageRangeLabel: formatAgeRangeLabel(row.ageStart, row.ageEnd),
    calendarYear: row.calendarYear,
    calendarYears: formatYearRange(row),
    calendarDate: row.calendarDate,
    mahaDasha: row.mahaDasha,
    antarDasha: row.antarDasha,
    antarWindow: `${row.antarStart || '?'} – ${row.antarEnd || '?'}`,
    recognitionScore: row.recognitionScore,
    lifeEventBoost: row.lifeEventBoost || 0
  }));
}

function matchLabel(score, topScore) {
  if (topScore == null || score == null) return 'unknown';
  if (score >= topScore - 10) return 'strong_match';
  if (score >= topScore - 22) return 'partial_match';
  return 'weak_match';
}

function mapPrimary(row) {
  if (!row) return null;
  return {
    age: row.age,
    ageRangeLabel: row.ageRangeLabel || formatAgeRangeLabel(row.ageStart, row.ageEnd) || String(Math.floor(row.age)),
    calendarYears: row.calendarYears || formatYearRange(row) || String(row.calendarYear),
    mahaDasha: row.mahaDasha,
    antarDasha: row.antarDasha,
    recognitionScore: row.recognitionScore,
    antarWindow: row.antarWindow || `${row.antarStart || '?'} – ${row.antarEnd || '?'}`
  };
}

/**
 * Precomputed timing facts for fame / age questions (injected into chat context).
 */
function buildFameTimingContext(chart, userMessage = '') {
  const chartCtx = chartForTiming(chart);
  const birth = birthDateTime(chartCtx);
  const lords = houseLordMap(chartCtx);
  const queryMode = detectFameQueryMode(userMessage);
  const boosts = lifeEventAgeBoosts(chartCtx);
  const rawSegments = applyBoostsToSegments(iterAntardashaSegments(chartCtx, SEGMENT_SCAN_MAX_AGE), boosts);
  const timingAvailable = rawSegments.length > 0 && birth?.isValid;

  const topWindows = timingAvailable
    ? buildTopRecognitionWindows(chartCtx, { limit: 6, queryMode, boosts })
    : [];
  const primaryRow = pickPrimaryWindow(rawSegments, queryMode);
  const primaryFromList = topWindows[0] || null;
  const primary = mapPrimary(
    primaryRow && primaryRow.recognitionScore >= (primaryFromList?.recognitionScore ?? 0) - 3
      ? {
          ...primaryRow,
          ageRangeLabel: formatAgeRangeLabel(primaryRow.ageStart, primaryRow.ageEnd),
          calendarYears: formatYearRange(primaryRow),
          antarWindow: `${primaryRow.antarStart || '?'} – ${primaryRow.antarEnd || '?'}`
        }
      : primaryFromList
  );

  const topScore = primary?.recognitionScore ?? topWindows[0]?.recognitionScore ?? null;

  const defaultAges = [7, 9, 16, 18, 25, 30];
  const fromMsg = extractAgesFromMessage(userMessage);
  const ageList = fromMsg.length ? fromMsg : queryMode === 'compare_ages' ? defaultAges : [];

  const queriedAges = timingAvailable
    ? ageList
        .map((age) => buildAgeTimingRow(chartCtx, age, rawSegments, boosts))
        .filter(Boolean)
    : [];
  const queriedAgesRanked = queriedAges
    .map((row) => ({
      ...row,
      matchVsTopWindow: matchLabel(row.recognitionScore, topScore)
    }))
    .sort((a, b) => b.recognitionScore - a.recognitionScore);

  const bestAmongQueried = queriedAgesRanked[0] || null;

  const lifeEventHints =
    boosts.length > 0
      ? boosts.map((b) => ({
          age: b.age,
          year: b.calendarYear,
          boost: b.boost,
          dasha: [b.mahadashaLord, b.antarLord].filter(Boolean).join('–'),
          note: b.note
        }))
      : [];

  return {
    timingDataStatus: timingAvailable ? 'ok' : 'unavailable',
    timingDataNote: timingAvailable
      ? null
      : 'Vimshottari timeline could not be built from this chart payload (often missing timingCore or Moon data). Tell the user to regenerate the chart from birth details — do not claim there is no fame in the chart.',
    queryMode,
    birthYear: birth?.isValid ? birth.year : null,
    tenthLord: lords[10] || null,
    eleventhLord: lords[11] || null,
    sunHouse: (chart?.planets || []).find((p) => p.name === 'Sun')?.house ?? null,
    currentDashaOnly: {
      note: 'For TODAY only — never use for childhood or past-age questions',
      ...(() => {
        const d = calculateDashaAtDate(chartCtx, DateTime.now(), { preferEngine: true });
        return {
          mahaDasha: d.mahaDasha,
          antarDasha: d.antarDasha,
          startDate: d.startDate,
          endDate: d.endDate
        };
      })()
    },
    primaryRecognitionWindow: timingAvailable ? primary : null,
    topRecognitionWindows: topWindows.slice(0, 5),
    queriedAges: queriedAgesRanked,
    bestAmongQueried,
    lifeEventHints,
    lifeEventVerification: chart?.lifeEventVerification
      ? {
          badge: chart.lifeEventVerification.verificationBadge,
          aggregateScore100: chart.lifeEventVerification.aggregateScore100,
          eventCount: chart.lifeEventVerification.validEventCount
        }
      : null,
    answerTemplate:
      queryMode === 'first_breakout'
        ? 'Lead with primaryRecognitionWindow.ageRangeLabel + calendarYears + mahaDasha–antarDasha + score. One paragraph max, then optional 2nd window.'
        : 'Lead with primaryRecognitionWindow; if queriedAges present, rank them with scores and match labels.',
    rules: [
      'Use only precomputed tables for past ages — never currentDashaOnly.',
      'When user states a success age, use queriedAges or add that age to comparison; report matchVsTopWindow honestly.',
      'Do not agree with user correction if recognitionScore is weak_match.',
      'Cite mahaDasha and antarDasha from the table for each age.',
      queryMode === 'first_breakout'
        ? 'For first public recognition, prefer primaryRecognitionWindow in age band 10–32, not later life peaks.'
        : null
    ].filter(Boolean)
  };
}

module.exports = {
  buildFameTimingContext,
  buildAgeTimingRow,
  extractAgesFromMessage,
  scoreRecognitionActivation,
  buildTopRecognitionWindows,
  detectFameQueryMode,
  lifeEventAgeBoosts
};
