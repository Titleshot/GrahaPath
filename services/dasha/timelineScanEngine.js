const { DateTime } = require('luxon');
const { getVimshottariTimeline } = require('./dashaCalculator');

/**
 * Domain-agnostic Vimshottari timeline scanning shared by every timing engine
 * (fame/recognition in ageTimingService.js, career in careerTimingService.js,
 * and future relationship/finance engines). Extracted verbatim from
 * ageTimingService.js so fame_timing behavior is unchanged -- only the scoring
 * function is now injected by the caller instead of being hardcoded here.
 */

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

const SIGNS_ORDER = [
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
  const ascIdx = SIGNS_ORDER.indexOf(asc);
  if (ascIdx < 0) return out;
  for (let house = 1; house <= 12; house += 1) {
    out[house] = SIGN_LORD[SIGNS_ORDER[(ascIdx + house - 1) % 12]] || null;
  }
  return out;
}

function planetsInHouse(chart, houseNum) {
  return (chart?.planets || []).filter((p) => p?.house === houseNum).map((p) => p.name);
}

function ageOnDate(birth, when) {
  if (!birth?.isValid || !when?.isValid) return null;
  const years = when.diff(birth, 'years').years;
  if (!Number.isFinite(years)) return null;
  return Math.max(0, Math.round(years * 10) / 10);
}

/** Current age in years (fractional), or null if birth date is unavailable. */
function currentAgeYears(chart) {
  const birth = birthDateTime(chart);
  if (!birth?.isValid) return null;
  return ageOnDate(birth, DateTime.now());
}

/**
 * Scan every antardasha segment across the lifetime and score it with the
 * caller-supplied domain scoring function: scoreFn(chart, mahaLord, antarLord, ageMid) -> number (0-100).
 * This is the exact loop previously hardcoded to scoreRecognitionActivation in
 * ageTimingService.js -- behavior for that caller is unchanged, only the score
 * function is now a parameter so other domains (career, later relationship/finance)
 * can reuse the same scan without duplicating it.
 */
function iterAntardashaSegments(chart, scoreFn, maxAge) {
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
      const baseScore = scoreFn(chart, maha.planet, antar.antarLord, ageMid);
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

/** Life-event anchors -> age at event + boost, generic across domains. */
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

module.exports = {
  SIGN_LORD,
  SIGNS_ORDER,
  parseIsoDate,
  birthDateTime,
  chartForTiming,
  houseLordMap,
  planetsInHouse,
  ageOnDate,
  currentAgeYears,
  iterAntardashaSegments,
  lifeEventAgeBoosts,
  boostForAge,
  applyBoostsToSegments,
  formatAgeRangeLabel,
  formatYearRange,
  segmentCoversAge
};
