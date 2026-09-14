/**
 * Pure, deterministic measurement rules for the career-timing validation
 * framework. These functions score/bucket PREDICTIONS against KNOWN events --
 * they are evaluation-only and are never imported by the astrology engine
 * itself (services/dasha/*). Defined once, before looking at any results,
 * per the validation methodology: buckets are fixed in advance, not tuned
 * to make numbers look good afterward.
 */

/** Fixed timing-accuracy buckets, decided BEFORE running any validation. */
const TIMING_BUCKETS = [
  { key: 'exact', label: 'Exact year', maxDiff: 0, points: 100 },
  { key: 'within_1', label: '±1 year', maxDiff: 1, points: 90 },
  { key: 'within_2', label: '±2 years', maxDiff: 2, points: 75 },
  { key: 'within_4', label: '±3–4 years', maxDiff: 4, points: 50 }
];

/**
 * Scores how close a single predicted year is to the actual event year.
 * - If within the fixed diff buckets above: that bucket.
 * - Else if the actual year appears within `candidateWindows` (the full
 *   ranked list, not just the winner) at some other rank: 'beyond_4_ranked'
 *   (the engine's scan reached the right period, just did not rank it top) --
 *   this is the operational meaning of "correct life phase but far away."
 * - Else: 'no_meaningful_match' (0 points) -- the actual year never showed
 *   up anywhere in the engine's own candidate list.
 *
 * @param {number} predictedYear - the TOP-ranked window's representative year
 * @param {number} actualYear
 * @param {Array<{calendarYear?: number, ageRangeLabel?: string, calendarYears?: string, age?: number, ageStart?: number, ageEnd?: number}>} candidateWindows - full ranked list (topCareerWindows or rankedEventTypes-derived), each with a resolvable year/range
 * @param {(window: object) => {start: number, end: number}} yearRangeOf - extracts a {start,end} year span from one candidate window (callers pass this since window shapes differ between OPEN_TIMING and DIRECT_YEAR modes)
 */
function scoreTimingAccuracy(predictedYear, actualYear, candidateWindows = [], yearRangeOf = null) {
  if (predictedYear == null || actualYear == null) {
    return { bucket: 'no_meaningful_match', points: 0, yearDiff: null, rankOfActual: null };
  }
  const diff = Math.abs(predictedYear - actualYear);
  for (const b of TIMING_BUCKETS) {
    if (diff <= b.maxDiff) {
      return { bucket: b.key, label: b.label, points: b.points, yearDiff: diff, rankOfActual: 1 };
    }
  }

  // Not the top pick -- check if the actual year shows up anywhere else in
  // the engine's own ranked candidate list (proves the scan reached the
  // right period; the ranking just didn't surface it as strongest).
  if (Array.isArray(candidateWindows) && typeof yearRangeOf === 'function') {
    for (let i = 0; i < candidateWindows.length; i += 1) {
      const range = yearRangeOf(candidateWindows[i]);
      if (!range) continue;
      if (actualYear >= range.start - 1 && actualYear <= range.end + 1) {
        return {
          bucket: 'beyond_4_ranked',
          label: 'Correct period, ranked lower (>4yr from top pick)',
          points: 25,
          yearDiff: diff,
          rankOfActual: i + 1
        };
      }
    }
  }

  return { bucket: 'no_meaningful_match', label: 'No meaningful match', points: 0, yearDiff: diff, rankOfActual: null };
}

/** Does the engine's chosen category match the fixture's documented category for that exact period? */
function scoreEventTypeMatch(predictedCategory, actualCategory) {
  if (!predictedCategory || !actualCategory) return { match: null };
  return { match: String(predictedCategory).toLowerCase() === String(actualCategory).toLowerCase() };
}

/**
 * A prediction is a candidate false positive when the engine asserts a
 * fairly confident answer (confidence strong/moderate, or -- for modes with
 * no confidence field -- a top score that clears a floor with a real gap
 * over the runner-up) but the predicted period does not fall near ANY
 * documented event for that person, of any category. toleranceYears default
 * mirrors the "±3-4 years" bucket boundary already used for timing scoring.
 */
function isFalsePositive({ confidence, isConfidentByScore, predictedYear, allActualYears = [], toleranceYears = 4 }) {
  const confident = confidence === 'strong' || confidence === 'moderate' || isConfidentByScore === true;
  if (!confident || predictedYear == null) return false;
  const nearAnyRealEvent = allActualYears.some((y) => Math.abs(y - predictedYear) <= toleranceYears);
  return !nearAnyRealEvent;
}

module.exports = {
  TIMING_BUCKETS,
  scoreTimingAccuracy,
  scoreEventTypeMatch,
  isFalsePositive
};
