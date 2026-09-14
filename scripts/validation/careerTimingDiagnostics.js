/**
 * Phase 2A -- diagnostic pass on the 15-person validation run. READ-ONLY:
 * does not change services/dasha/careerTimingService.js, does not add
 * relationship/finance timing, does not feed biography data into prediction.
 *
 * Answers exactly the questions posed for Career Timing Calibration v1:
 *   1. Is the correct historical event usually present in the candidate ranking?
 *   2. If present, how often does it rank #1/#2/#3/etc?
 *   3. Is setback systematically advantaged by the scoring architecture?
 *   4. Is the main problem ranking or classification?
 *   5. Are the six categories structurally comparable?
 *   6. Does score magnitude correlate with correctness?
 *   7. Does confidence correlate with correctness?
 *   8. What are the 3-5 highest-value calibration hypotheses?
 *
 * Usage: node scripts/validation/careerTimingDiagnostics.js
 * Output: console report + scripts/validation/results/diagnostics-<ts>.json
 */
const fs = require('fs');
const path = require('path');
const {
  buildTopCareerWindows,
  scoreCareerEventActivation,
  CAREER_EVENT_TYPES,
  CAREER_MIN_ELIGIBLE_AGE
} = require('../../services/dasha/careerTimingService');
const { calculateDashaAtDate } = require('../../services/dasha/dashaCalculator');
const { chartForTiming, birthDateTime, ageOnDate } = require('../../services/dasha/timelineScanEngine');
const { DateTime } = require('luxon');
const { explainCareerScoreBreakdown } = require('./explainScoringFactors');
const { CAREER_TIMING_VALIDATION_FIXTURES } = require('./careerTimingFixtures');
const { buildChartFromFixture, runOpenTimingQuestions, runDirectYearQuestions } = require('./careerTimingValidationRunner');

// The lifetime scan cap the OPEN_TIMING ranking uses (careerTimingService.js).
// Kept here only to distinguish "excluded by scan range" from "excluded by
// scoring" when an event's age exceeds it -- this is a mechanical limit, not
// a calibration issue, and conflating the two would misdiagnose the cause.
const CAREER_SEGMENT_SCAN_MAX_AGE = 68;

function yearRangeOfWindow(w) {
  const m = String(w?.calendarYears || '').match(/(\d{4})\D+(\d{4})/);
  if (m) return { start: Number(m[1]), end: Number(m[2]) };
  const single = String(w?.calendarYears || '').match(/\d{4}/);
  if (single) return { start: Number(single[0]), end: Number(single[0]) };
  return null;
}

function yearDiffToWindow(window, year) {
  const r = yearRangeOfWindow(window);
  if (!r) return Infinity;
  if (year >= r.start && year <= r.end) return 0;
  return Math.min(Math.abs(r.start - year), Math.abs(r.end - year));
}

/**
 * Self-check: the diagnostic mirror (explainCareerScoreBreakdown) must
 * produce the exact same final score as the real scoring function for every
 * sample used below. If it ever diverges, the report is unreliable -- abort
 * loudly rather than publish a diagnosis built on a stale mirror.
 */
function assertMirrorMatchesReality(chart, md, ad, age, eventType, personId) {
  const real = scoreCareerEventActivation(chart, md, ad, age, eventType).score;
  const mirrored = explainCareerScoreBreakdown(chart, md, ad, age, eventType).finalScore;
  if (real !== mirrored) {
    throw new Error(
      `MIRROR MISMATCH for ${personId} (${eventType}, ${md}-${ad}, age ${age}): real=${real} mirrored=${mirrored}. ` +
        'explainCareerScoreBreakdown() is out of sync with scoreCareerEventTypeActivation() -- fix the mirror before trusting this report.'
    );
  }
}

/** Q1/Q2: for one documented event, find its rank within the FULL candidate list for its own category. */
function analyzeEventRanking(chart, event, personId) {
  const ageExceedsScanCap = event.age > CAREER_SEGMENT_SCAN_MAX_AGE;
  // Use a generous limit so this is effectively the full ranked list, not top-5.
  const fullRanking = buildTopCareerWindows(chart, { eventType: event.category, tense: 'past', limit: 500 });

  let bestIdx = -1;
  let bestDiff = Infinity;
  fullRanking.forEach((w, i) => {
    const d = yearDiffToWindow(w, event.year);
    if (d < bestDiff) {
      bestDiff = d;
      bestIdx = i;
    }
  });

  const matched = bestIdx >= 0 ? fullRanking[bestIdx] : null;
  const winner = fullRanking[0] || null;

  if (matched) assertMirrorMatchesReality(chart, matched.mahaDasha, matched.antarDasha, matched.age, event.category, personId);
  if (winner) assertMirrorMatchesReality(chart, winner.mahaDasha, winner.antarDasha, winner.age, event.category, personId);

  return {
    personId,
    event,
    ageExceedsScanCap,
    totalCandidatesInOwnCategory: fullRanking.length,
    matchedCandidate: matched
      ? { rank: bestIdx + 1, score: matched.careerActivationScore, calendarYears: matched.calendarYears, mahaDasha: matched.mahaDasha, antarDasha: matched.antarDasha, yearDiff: bestDiff }
      : null,
    winningCandidate: winner
      ? { rank: 1, score: winner.careerActivationScore, calendarYears: winner.calendarYears, mahaDasha: winner.mahaDasha, antarDasha: winner.antarDasha }
      : null,
    scoreGapFromWinner: matched && winner ? winner.careerActivationScore - matched.careerActivationScore : null
  };
}

/** Q5: empirical structural comparison across categories -- run every (md,ad) pair from the actual 9 dasha planets, at a neutral fully-weighted age, on every real chart in the set, and see how each category's formula behaves independent of any specific person's real dasha sequence. */
function structuralCategoryDistributions(charts) {
  const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const NEUTRAL_AGE = 35; // inside the full-weight 25-58 band, so age weighting does not distort this structural comparison
  const byCategory = Object.fromEntries(CAREER_EVENT_TYPES.map((c) => [c, []]));

  for (const chart of charts) {
    for (const md of PLANETS) {
      for (const ad of PLANETS) {
        for (const category of CAREER_EVENT_TYPES) {
          const { score } = scoreCareerEventActivation(chart, md, ad, NEUTRAL_AGE, category);
          byCategory[category].push(score);
        }
      }
    }
  }

  const stats = {};
  for (const [category, scores] of Object.entries(byCategory)) {
    const sorted = [...scores].sort((a, b) => a - b);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    stats[category] = {
      sampleSize: scores.length,
      mean: Math.round(mean * 10) / 10,
      median,
      max: sorted[sorted.length - 1],
      min: sorted[0],
      // How often this category alone would hit the 100 ceiling across all (md,ad,chart) combos -- a direct measure of how "easy" that branch is to max out structurally.
      ceilingHitRate: Math.round((scores.filter((s) => s === 100).length / scores.length) * 1000) / 10
    };
  }
  return stats;
}

/** Q6/Q3: for wrong setback wins (setback predicted top but actual category differs), the exact point breakdown. */
function explainWrongSetbackWins(allDirectYearRecords) {
  const wrongWins = allDirectYearRecords.filter((r) => !r.status && r.topPredictedCategory === 'setback' && r.actualEvent.category !== 'setback');
  return wrongWins.map((r) => {
    const breakdown = explainCareerScoreBreakdown(r.chart, r.mahaDasha, r.antarDasha, r.resolvedAge, 'setback');
    assertMirrorMatchesReality(r.chart, r.mahaDasha, r.antarDasha, r.resolvedAge, 'setback', r.personId);
    const actualCategoryBreakdown = explainCareerScoreBreakdown(r.chart, r.mahaDasha, r.antarDasha, r.resolvedAge, r.actualEvent.category);
    return {
      personId: r.personId,
      year: r.actualEvent.year,
      actualCategory: r.actualEvent.category,
      setbackBreakdown: breakdown,
      actualCategoryBreakdown
    };
  });
}

/** Q7: baseline comparisons for event-type classification accuracy. */
function computeBaselines(allDirectYearRecords) {
  const valid = allDirectYearRecords.filter((r) => !r.status);
  const n = valid.length;
  const categoryCounts = {};
  for (const r of valid) categoryCounts[r.actualEvent.category] = (categoryCounts[r.actualEvent.category] || 0) + 1;
  const mostCommonCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const alwaysSetback = valid.filter((r) => r.actualEvent.category === 'setback').length / n;
  const alwaysMostCommon = valid.filter((r) => r.actualEvent.category === mostCommonCategory).length / n;
  const randomSix = 1 / CAREER_EVENT_TYPES.length;
  const grahaPathAccuracy = valid.filter((r) => r.eventTypeMatch).length / n;

  return {
    n,
    note: 'Small N -- treat as directional, not statistically significant.',
    randomSixCategoryBaseline: Math.round(randomSix * 1000) / 10,
    alwaysPredictSetbackBaseline: Math.round(alwaysSetback * 1000) / 10,
    alwaysPredictMostCommonBaseline: { category: mostCommonCategory, accuracyPercent: Math.round(alwaysMostCommon * 1000) / 10 },
    graphPathActualAccuracy: Math.round(grahaPathAccuracy * 1000) / 10,
    categoryDistributionInFixtureSet: categoryCounts
  };
}

/** Q7 (confidence): does confidence correlate with correctness, using OPEN_TIMING's confidence field (the only mode that currently emits one). */
function confidenceVsCorrectness(allOpenTimingRecords) {
  const withMatch = allOpenTimingRecords.flatMap((r) => r.matchedAgainstEvents.map((m) => ({ confidence: r.confidence, points: m.points })));
  const byConfidence = {};
  for (const { confidence, points } of withMatch) {
    byConfidence[confidence] = byConfidence[confidence] || { count: 0, totalPoints: 0 };
    byConfidence[confidence].count += 1;
    byConfidence[confidence].totalPoints += points;
  }
  const table = Object.fromEntries(
    Object.entries(byConfidence).map(([k, v]) => [k, { count: v.count, avgAccuracyPoints: Math.round((v.totalPoints / v.count) * 10) / 10 }])
  );
  const ranked = ['strong', 'moderate', 'possible'].filter((c) => table[c]);
  const monotonic = ranked.every((c, i) => i === 0 || table[c].avgAccuracyPoints <= table[ranked[i - 1]].avgAccuracyPoints);
  return { table, higherConfidenceTracksHigherAccuracy: ranked.length >= 2 ? monotonic : null };
}

async function main() {
  console.log(`Running diagnostics on ${CAREER_TIMING_VALIDATION_FIXTURES.length} fixtures (read-only, no scoring changes)...`);

  const charts = [];
  const allOpenTimingRecords = [];
  const allDirectYearRecords = [];
  const rankingAnalyses = [];

  for (const fixture of CAREER_TIMING_VALIDATION_FIXTURES) {
    const chart = await buildChartFromFixture(fixture.name, fixture.birth);
    charts.push(chart);

    const openTiming = await runOpenTimingQuestions(fixture, chart);
    const directYear = (await runDirectYearQuestions(fixture, chart)).map((r) => ({ ...r, chart, personId: fixture.id }));
    allOpenTimingRecords.push(...openTiming);
    allDirectYearRecords.push(...directYear);

    for (const event of fixture.events) {
      rankingAnalyses.push(analyzeEventRanking(chart, event, fixture.id));
    }
  }

  // --- Q1/Q2: candidate ranking ---
  const rankBuckets = { rank1: 0, rank2: 0, rank3: 0, rank4to10: 0, beyond10: 0, notPresent: 0, excludedByScanCap: 0 };
  for (const r of rankingAnalyses) {
    if (r.ageExceedsScanCap) rankBuckets.excludedByScanCap += 1;
    else if (!r.matchedCandidate) rankBuckets.notPresent += 1;
    else if (r.matchedCandidate.rank === 1) rankBuckets.rank1 += 1;
    else if (r.matchedCandidate.rank === 2) rankBuckets.rank2 += 1;
    else if (r.matchedCandidate.rank === 3) rankBuckets.rank3 += 1;
    else if (r.matchedCandidate.rank <= 10) rankBuckets.rank4to10 += 1;
    else rankBuckets.beyond10 += 1;
  }

  // --- Q5: structural category comparison ---
  const structural = structuralCategoryDistributions(charts);

  // --- Q3/Q6: wrong setback wins, point breakdown ---
  const wrongSetbackWins = explainWrongSetbackWins(allDirectYearRecords);

  // --- Q4: open timing vs direct year comparison ---
  const openTimingMatched = allOpenTimingRecords.flatMap((r) => r.matchedAgainstEvents);
  const openTimingGoodOrBetter = openTimingMatched.filter((m) => m.points >= 50).length;
  const directYearValid = allDirectYearRecords.filter((r) => !r.status);
  const directYearCorrect = directYearValid.filter((r) => r.eventTypeMatch).length;

  // --- Q7: baselines + confidence ---
  const baselines = computeBaselines(allDirectYearRecords);
  const confidenceAnalysis = confidenceVsCorrectness(allOpenTimingRecords);

  console.log('\n=== Q1/Q2: Candidate ranking (does the real event show up, and where?) ===');
  console.log(JSON.stringify(rankBuckets, null, 2));
  console.log(`(${rankingAnalyses.length} total documented events checked against their own category's full ranking)`);

  console.log('\n=== Q5: Structural category score distributions (81 dasha pairs x 15 charts, neutral age 35) ===');
  console.table(structural);

  console.log(`\n=== Q3/Q6: Wrong setback wins -- ${wrongSetbackWins.length} cases where setback won but was NOT the true category ===`);
  for (const w of wrongSetbackWins.slice(0, 5)) {
    console.log(`\n  ${w.personId} / ${w.year} (actual: ${w.actualCategory})`);
    console.log(`  setback score ${w.setbackBreakdown.finalScore} from:`, w.setbackBreakdown.items);
    console.log(`  ${w.actualCategory} score ${w.actualCategoryBreakdown.finalScore} from:`, w.actualCategoryBreakdown.items);
  }
  if (wrongSetbackWins.length > 5) console.log(`  ... and ${wrongSetbackWins.length - 5} more (see JSON report)`);

  console.log('\n=== Q4: Open timing vs Direct year ===');
  console.log(
    `Open timing: ${openTimingGoodOrBetter}/${openTimingMatched.length} predictions scored >=50pts (exact/±1/±2/±3-4 bucket)`
  );
  console.log(`Direct year: ${directYearCorrect}/${directYearValid.length} event-type classifications correct`);

  console.log('\n=== Q7: Baselines ===');
  console.log(JSON.stringify(baselines, null, 2));

  console.log('\n=== Q7: Confidence vs correctness (OPEN_TIMING only -- the only mode with a confidence field) ===');
  console.log(JSON.stringify(confidenceAnalysis, null, 2));

  const report = {
    generatedAt: new Date().toISOString(),
    q1_q2_candidateRanking: { buckets: rankBuckets, detail: rankingAnalyses },
    q5_structuralCategoryDistributions: structural,
    q3_q6_wrongSetbackWins: wrongSetbackWins,
    q4_openTimingVsDirectYear: {
      openTiming: { scoredAtLeastFair: openTimingGoodOrBetter, total: openTimingMatched.length },
      directYear: { correct: directYearCorrect, total: directYearValid.length }
    },
    q7_baselines: baselines,
    q7_confidenceVsCorrectness: confidenceAnalysis
  };

  const outDir = path.join(__dirname, 'results');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `diagnostics-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\nFull diagnostic report written to: ${outFile}`);
}

main().catch((err) => {
  console.error('Diagnostics crashed:', err);
  process.exit(1);
});
