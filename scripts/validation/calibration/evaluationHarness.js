/**
 * Pluggable-scorer evaluation harness for Career Timing Calibration v1.
 *
 * Re-implements the OPEN_TIMING (mode A) and DIRECT_YEAR (mode C) evaluation
 * flow already used by careerTimingValidationRunner.js, but accepts an
 * INJECTED scoring function instead of calling the fixed production
 * scoreCareerEventActivation. This lets every calibration experiment run
 * through the exact same measurement code, so results are only ever
 * different because of the scoring formula being tested -- never because of
 * a difference in how candidates are found or scored.
 *
 * Never imports from or modifies services/dasha/careerTimingService.js's
 * production scoring; only reuses its domain-agnostic, unchanged plumbing
 * (timelineScanEngine.js, dashaCalculator.js) that was always designed to be
 * reusable across scoring strategies.
 */
const { DateTime } = require('luxon');
const {
  birthDateTime,
  chartForTiming,
  currentAgeYears,
  ageOnDate,
  iterAntardashaSegments,
  lifeEventAgeBoosts,
  applyBoostsToSegments,
  formatAgeRangeLabel,
  formatYearRange
} = require('../../../services/dasha/timelineScanEngine');
const { calculateDashaAtDate } = require('../../../services/dasha/dashaCalculator');
const { CAREER_EVENT_TYPES, CAREER_MIN_ELIGIBLE_AGE } = require('../../../services/dasha/careerTimingService');
const { scoreTimingAccuracy, scoreEventTypeMatch, isFalsePositive } = require('../scoringBuckets');

const CAREER_SEGMENT_SCAN_MAX_AGE = 68;

/** scoreFn signature every variant must implement: (chart, mahaDasha, antarDasha, age, eventType) -> number (0-100 or otherwise bounded, comparable across categories). */

function yearRangeOfCandidate(c) {
  const m = String(c?.calendarYears || '').match(/(\d{4})\D+(\d{4})/);
  if (m) return { start: Number(m[1]), end: Number(m[2]) };
  const single = String(c?.calendarYears || '').match(/\d{4}/);
  if (single) return { start: Number(single[0]), end: Number(single[0]) };
  return null;
}

function representativeYear(candidate) {
  const r = yearRangeOfCandidate(candidate);
  if (!r) return null;
  return Math.round((r.start + r.end) / 2);
}

/** Same shape/thresholds as production confidenceFromCareerWindows, but as a standalone function so experiment 5 can swap it out. */
function confidenceFromScoreGap(top, second) {
  if (!top) return 'possible';
  const best = top.score;
  const gap = best - (second?.score ?? 0);
  if (best >= 68 && gap >= 14) return 'strong';
  if (best >= 50 && gap >= 6) return 'moderate';
  return 'possible';
}

/** Builds the full ranked OPEN_TIMING candidate list for one category using an injected scorer -- mirrors buildTopCareerWindows's mechanics exactly, just with a pluggable score function. */
function rankOpenTimingCandidates(chart, scoreFn, eventType, tense, limit = 500) {
  const scoreWrap = (c, md, ad, age) => scoreFn(c, md, ad, age, eventType);
  let segments = applyBoostsToSegments(
    iterAntardashaSegments(chart, scoreWrap, CAREER_SEGMENT_SCAN_MAX_AGE),
    lifeEventAgeBoosts(chart)
  ).filter((s) => s.age >= CAREER_MIN_ELIGIBLE_AGE);

  const age = currentAgeYears(chart);
  if (age != null) {
    segments = tense === 'future' ? segments.filter((s) => s.age >= age - 0.5) : segments.filter((s) => s.age <= age + 0.5);
  }

  const ranked = [...segments].sort((a, b) => b.recognitionScore - a.recognitionScore);
  const picked = [];
  const used = new Set();
  for (const row of ranked) {
    const key = `${row.mahaDasha}|${row.antarDasha}|${row.antarStart}`;
    if (used.has(key)) continue;
    used.add(key);
    picked.push(row);
    if (picked.length >= limit) break;
  }

  return picked.map((row, i) => ({
    rank: i + 1,
    age: row.age,
    ageRangeLabel: formatAgeRangeLabel(row.ageStart, row.ageEnd),
    calendarYears: formatYearRange(row),
    mahaDasha: row.mahaDasha,
    antarDasha: row.antarDasha,
    score: row.recognitionScore
  }));
}

/** Full 6-category ranking for one exact resolved date (DIRECT_YEAR mode) using an injected scorer. */
function rankDirectYearCategories(chart, scoreFn, mahaDasha, antarDasha, age) {
  return CAREER_EVENT_TYPES.map((type) => ({ type, score: scoreFn(chart, mahaDasha, antarDasha, age, type) })).sort(
    (a, b) => b.score - a.score
  );
}

/** Runs both OPEN_TIMING (breakthrough/setback) and DIRECT_YEAR (per documented event) evaluations for one fixture with one scorer. */
async function evaluatePersonWithScorer(fixture, chart, scoreFn, confidenceFn = confidenceFromScoreGap) {
  const openTiming = [];
  for (const category of ['breakthrough', 'setback']) {
    const candidates = rankOpenTimingCandidates(chart, scoreFn, category, 'past');
    const top = candidates[0] || null;
    const confidence = confidenceFn(top, candidates[1]);
    const matchingEvents = fixture.events.filter((e) => e.category === category);
    const scored = matchingEvents.map((event) => ({
      actualEvent: event,
      ...scoreTimingAccuracy(top ? representativeYear(top) : null, event.year, candidates, yearRangeOfCandidate)
    }));
    openTiming.push({
      category,
      topCandidate: top,
      confidence,
      candidateCount: candidates.length,
      matchedAgainstEvents: scored,
      hasMatchingActualEvent: matchingEvents.length > 0
    });
  }

  const directYear = [];
  const chartCtx = chartForTiming(chart);
  const birth = birthDateTime(chartCtx);
  for (const event of fixture.events) {
    const midDate = DateTime.fromObject({ year: event.year, month: 7, day: 1 }, { zone: chartCtx?.timezone || birth?.zone || 'UTC' });
    const age = ageOnDate(birth, midDate);
    const dasha = calculateDashaAtDate(chartCtx, midDate, { preferEngine: true });
    if (!dasha?.mahaDasha) {
      directYear.push({ actualEvent: event, status: 'dasha_unavailable' });
      continue;
    }
    const ranking = rankDirectYearCategories(chartCtx, scoreFn, dasha.mahaDasha, dasha.antarDasha, age);
    const top = ranking[0];
    directYear.push({
      actualEvent: event,
      mahaDasha: dasha.mahaDasha,
      antarDasha: dasha.antarDasha,
      age,
      topPredictedCategory: top.type,
      topScore: top.score,
      fullRanking: ranking,
      eventTypeMatch: scoreEventTypeMatch(top.type, event.category).match
    });
  }

  return { personId: fixture.id, fixture, openTiming, directYear };
}

/** Runs a scorer against an entire fixture set and computes the full 8-point evaluation protocol. */
async function evaluateScorerOnFixtureSet(fixtures, buildChartFn, scoreFn, confidenceFn = confidenceFromScoreGap) {
  const allRecords = [];
  for (const fixture of fixtures) {
    const chart = await buildChartFn(fixture.name, fixture.birth);
    allRecords.push(await evaluatePersonWithScorer(fixture, chart, scoreFn, confidenceFn));
  }
  return { allRecords, summary: summarizeEvaluation(allRecords) };
}

function summarizeEvaluation(allRecords) {
  const openTimingScored = allRecords
    .flatMap((p) => p.openTiming)
    .flatMap((r) => r.matchedAgainstEvents.map((m) => ({ ...m, confidence: r.confidence })));

  const bucketCounts = {};
  let totalPoints = 0;
  for (const s of openTimingScored) {
    bucketCounts[s.bucket] = (bucketCounts[s.bucket] || 0) + 1;
    totalPoints += s.points;
  }
  const avgTimingAccuracyPoints = openTimingScored.length ? Math.round((totalPoints / openTimingScored.length) * 10) / 10 : null;

  const directYear = allRecords.flatMap((p) => p.directYear).filter((r) => r.status === undefined);
  const eventTypeAccuracy = directYear.length
    ? Math.round((directYear.filter((r) => r.eventTypeMatch).length / directYear.length) * 1000) / 10
    : null;

  const categoryCounts = {};
  for (const r of directYear) categoryCounts[r.actualEvent.category] = (categoryCounts[r.actualEvent.category] || 0) + 1;

  const topPredictedCounts = {};
  for (const r of directYear) topPredictedCounts[r.topPredictedCategory] = (topPredictedCounts[r.topPredictedCategory] || 0) + 1;

  let fpCount = 0;
  let fpEligible = 0;
  for (const person of allRecords) {
    const allActualYears = person.fixture.events.map((e) => e.year);
    for (const r of person.openTiming) {
      if (!r.topCandidate) continue;
      fpEligible += 1;
      const predictedYear = representativeYear(r.topCandidate);
      if (isFalsePositive({ confidence: r.confidence, predictedYear, allActualYears })) fpCount += 1;
    }
  }
  const falsePositiveRatePercent = fpEligible ? Math.round((fpCount / fpEligible) * 1000) / 10 : null;

  const confidenceBuckets = {};
  for (const s of openTimingScored) {
    confidenceBuckets[s.confidence] = confidenceBuckets[s.confidence] || { count: 0, totalPoints: 0 };
    confidenceBuckets[s.confidence].count += 1;
    confidenceBuckets[s.confidence].totalPoints += s.points;
  }
  const confidenceCalibration = Object.fromEntries(
    Object.entries(confidenceBuckets).map(([k, v]) => [k, { count: v.count, avgAccuracyPoints: Math.round((v.totalPoints / v.count) * 10) / 10 }])
  );

  return {
    sampleSize: allRecords.length,
    openTimingPredictionsScored: openTimingScored.length,
    avgTimingAccuracyPoints,
    timingBucketDistribution: bucketCounts,
    directYearQuestionsAsked: directYear.length,
    eventTypeClassificationAccuracyPercent: eventTypeAccuracy,
    falsePositiveRatePercent,
    categoryDistributionInFixtureSet: categoryCounts,
    topPredictedCategoryDistribution: topPredictedCounts,
    confidenceCalibration
  };
}

module.exports = {
  rankOpenTimingCandidates,
  rankDirectYearCategories,
  evaluatePersonWithScorer,
  evaluateScorerOnFixtureSet,
  summarizeEvaluation,
  confidenceFromScoreGap,
  representativeYear,
  yearRangeOfCandidate,
  CAREER_SEGMENT_SCAN_MAX_AGE
};
