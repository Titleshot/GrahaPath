/**
 * Career Timing Calibration v1 -- controlled experiments.
 *
 * Runs Priority 1 (setback re-weighting), Priority 2 (normalization),
 * Priority 3 (combined re-ranking), Priority 4 (two-way classifier
 * diagnostic), and Priority 5 (confidence alternatives) against the 15-person
 * DEVELOPMENT set only. Per the anti-overfitting protocol, the holdout set is
 * deliberately NOT touched here -- see runHoldoutCheck.js, which runs the
 * single chosen candidate (and only that candidate) against it once, after
 * this script's comparisons are done.
 *
 * This script does not modify services/dasha/careerTimingService.js and does
 * not choose a winner automatically -- it prints the full comparison so a
 * human can apply judgment, per the instruction not to optimize solely for
 * headline accuracy.
 *
 * Usage: node scripts/validation/calibration/runCalibrationExperiments.js
 */
const fs = require('fs');
const path = require('path');
const { scoreCareerEventActivation, CAREER_EVENT_TYPES } = require('../../../services/dasha/careerTimingService');
const { CAREER_TIMING_VALIDATION_FIXTURES } = require('../careerTimingFixtures');
const { buildChartFromFixture } = require('../careerTimingValidationRunner');
const { evaluateScorerOnFixtureSet, confidenceFromScoreGap } = require('./evaluationHarness');
const {
  v0_baseline,
  rawCategoryScore,
  v1a_reducedWeights,
  v1b_cappedCombo,
  v1c_diminishingReturns,
  v1d_requireCorroboration,
  computeStructuralAnchors,
  makeMaxScalingVariant,
  makeZScoreVariant,
  makeConditionCountVariant
} = require('./scoringVariants');

const GROWTH = new Set(['breakthrough', 'expansion', 'leadership']);
const DISRUPTION = new Set(['setback', 'restructuring', 'transition']);

function selfCheckMirror(charts) {
  const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  let checked = 0;
  for (const chart of charts.slice(0, 3)) {
    for (const md of PLANETS) {
      for (const ad of PLANETS) {
        for (const category of CAREER_EVENT_TYPES) {
          const real = scoreCareerEventActivation(chart, md, ad, 35, category).score;
          const mirrored = v0_baseline(chart, md, ad, 35, category);
          if (real !== mirrored) {
            throw new Error(`v0 mirror mismatch: ${category} ${md}-${ad} real=${real} mirrored=${mirrored}. Aborting -- do not trust any comparison below until this is fixed.`);
          }
          checked += 1;
        }
      }
    }
  }
  console.log(`Self-check passed: v0_baseline matches production exactly across ${checked} samples.\n`);
}

function printMetricsTable(label, summary) {
  console.log(`\n--- ${label} ---`);
  console.log(`  avgTimingAccuracyPoints: ${summary.avgTimingAccuracyPoints}`);
  console.log(`  timingBucketDistribution: ${JSON.stringify(summary.timingBucketDistribution)}`);
  console.log(`  eventTypeClassificationAccuracyPercent: ${summary.eventTypeClassificationAccuracyPercent}`);
  console.log(`  falsePositiveRatePercent: ${summary.falsePositiveRatePercent}`);
  console.log(`  topPredictedCategoryDistribution: ${JSON.stringify(summary.topPredictedCategoryDistribution)}`);
  console.log(`  confidenceCalibration: ${JSON.stringify(summary.confidenceCalibration)}`);
}

async function main() {
  console.log(`Building ${CAREER_TIMING_VALIDATION_FIXTURES.length} development-set charts...`);
  const devCharts = [];
  for (const f of CAREER_TIMING_VALIDATION_FIXTURES) devCharts.push(await buildChartFromFixture(f.name, f.birth));

  selfCheckMirror(devCharts);

  const report = { generatedAt: new Date().toISOString(), devSetSize: CAREER_TIMING_VALIDATION_FIXTURES.length };

  // ===== Baseline (v0, current production) =====
  console.log('=== BASELINE (current production scoring, v0) ===');
  const baseline = await evaluateScorerOnFixtureSet(CAREER_TIMING_VALIDATION_FIXTURES, buildChartFromFixture, v0_baseline);
  printMetricsTable('v0 baseline', baseline.summary);
  report.baseline = baseline.summary;

  // ===== Priority 1: setback re-weighting variants =====
  console.log('\n\n########## PRIORITY 1: SETBACK RE-WEIGHTING EXPERIMENTS ##########');
  const setbackVariants = {
    v1a_reducedWeights,
    v1b_cappedCombo,
    v1c_diminishingReturns,
    v1d_requireCorroboration
  };
  report.priority1_setbackVariants = {};
  for (const [name, fn] of Object.entries(setbackVariants)) {
    const result = await evaluateScorerOnFixtureSet(CAREER_TIMING_VALIDATION_FIXTURES, buildChartFromFixture, fn);
    printMetricsTable(name, result.summary);
    report.priority1_setbackVariants[name] = result.summary;
  }

  // ===== Priority 2: normalization variants (layered on v0 setback, to isolate normalization's own effect first) =====
  console.log('\n\n########## PRIORITY 2: NORMALIZATION EXPERIMENTS (v0 setback + normalization) ##########');
  console.log('Computing structural anchors (81 dasha pairs x dev charts, per category)...');
  const anchors = computeStructuralAnchors(devCharts, CAREER_EVENT_TYPES, 'v0');
  console.log('Anchors:', JSON.stringify(anchors, null, 2));
  report.structuralAnchors = anchors;

  const normVariants = {
    v2a_maxScaling: makeMaxScalingVariant(anchors, 'v0'),
    v2b_zScore: makeZScoreVariant(anchors, 'v0'),
    v2c_conditionCount: makeConditionCountVariant('v0')
  };
  report.priority2_normalizationVariants = {};
  for (const [name, fn] of Object.entries(normVariants)) {
    const result = await evaluateScorerOnFixtureSet(CAREER_TIMING_VALIDATION_FIXTURES, buildChartFromFixture, fn);
    printMetricsTable(name, result.summary);
    report.priority2_normalizationVariants[name] = result.summary;
  }

  // ===== Priority 4: two-way GROWTH vs DISRUPTION classifier diagnostic (v0 scores, not a scoring change) =====
  console.log('\n\n########## PRIORITY 4: TWO-WAY (GROWTH vs DISRUPTION) DIAGNOSTIC ##########');
  const sixWayRecords = baseline.allRecords.flatMap((p) => p.directYear).filter((r) => r.status === undefined);
  let twoWayCorrect = 0;
  for (const r of sixWayRecords) {
    const actualGroup = GROWTH.has(r.actualEvent.category) ? 'GROWTH' : 'DISRUPTION';
    const growthScore = Math.max(...r.fullRanking.filter((x) => GROWTH.has(x.type)).map((x) => x.score));
    const disruptionScore = Math.max(...r.fullRanking.filter((x) => DISRUPTION.has(x.type)).map((x) => x.score));
    const predictedGroup = growthScore >= disruptionScore ? 'GROWTH' : 'DISRUPTION';
    if (predictedGroup === actualGroup) twoWayCorrect += 1;
  }
  const twoWayAccuracy = Math.round((twoWayCorrect / sixWayRecords.length) * 1000) / 10;
  console.log(`Two-way accuracy: ${twoWayCorrect}/${sixWayRecords.length} = ${twoWayAccuracy}% (six-way baseline was ${baseline.summary.eventTypeClassificationAccuracyPercent}%)`);
  report.priority4_twoWayDiagnostic = { correct: twoWayCorrect, total: sixWayRecords.length, accuracyPercent: twoWayAccuracy, sixWayAccuracyPercent: baseline.summary.eventTypeClassificationAccuracyPercent };

  // ===== Priority 5: confidence alternatives =====
  console.log('\n\n########## PRIORITY 5: CONFIDENCE ALTERNATIVES ##########');
  // B: evidence-count based -- how many independent conditions fired for the winning category, not just its score margin.
  function confidenceFromEvidenceCount(top, second, chart, mahaDasha, antarDasha, eventType) {
    const { items } = rawCategoryScore(chart, mahaDasha, antarDasha, eventType, 'v0');
    const positiveConditionCount = items.filter((i) => i.points > 0).length;
    if (positiveConditionCount >= 4) return 'strong';
    if (positiveConditionCount >= 2) return 'moderate';
    return 'possible';
  }
  // C: combined -- require BOTH a real score margin AND at least 3 corroborating conditions for "strong".
  function confidenceFromMarginAndEvidence(top, second, chart, mahaDasha, antarDasha, eventType) {
    const { items } = rawCategoryScore(chart, mahaDasha, antarDasha, eventType, 'v0');
    const positiveConditionCount = items.filter((i) => i.points > 0).length;
    const gap = (top?.score ?? 0) - (second?.score ?? 0);
    if ((top?.score ?? 0) >= 68 && gap >= 14 && positiveConditionCount >= 3) return 'strong';
    if ((top?.score ?? 0) >= 50 && gap >= 6 && positiveConditionCount >= 2) return 'moderate';
    return 'possible';
  }

  // These need the winning category's (chart, md, ad) at evaluation time, which
  // the generic harness's confidenceFn(top, second) signature doesn't carry --
  // re-derive directly from the already-computed baseline OPEN_TIMING records instead.
  function reconfidenceOpenTiming(confidenceStrategy) {
    const scored = [];
    for (const person of baseline.allRecords) {
      for (const r of person.openTiming) {
        if (!r.topCandidate) continue;
        const chart = devCharts[CAREER_TIMING_VALIDATION_FIXTURES.findIndex((f) => f.id === person.personId)];
        const conf = confidenceStrategy(r.topCandidate, null, chart, r.topCandidate.mahaDasha, r.topCandidate.antarDasha, r.category);
        for (const m of r.matchedAgainstEvents) scored.push({ confidence: conf, points: m.points });
      }
    }
    const buckets = {};
    for (const s of scored) {
      buckets[s.confidence] = buckets[s.confidence] || { count: 0, totalPoints: 0 };
      buckets[s.confidence].count += 1;
      buckets[s.confidence].totalPoints += s.points;
    }
    return Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, { count: v.count, avgAccuracyPoints: Math.round((v.totalPoints / v.count) * 10) / 10 }]));
  }

  const confidenceB = reconfidenceOpenTiming(confidenceFromEvidenceCount);
  const confidenceC = reconfidenceOpenTiming(confidenceFromMarginAndEvidence);
  console.log('Current production method (margin/gap only):', JSON.stringify(baseline.summary.confidenceCalibration));
  console.log('Alternative B (evidence-count only):', JSON.stringify(confidenceB));
  console.log('Alternative C (margin AND evidence-count):', JSON.stringify(confidenceC));
  report.priority5_confidenceAlternatives = {
    current_marginOnly: baseline.summary.confidenceCalibration,
    alternativeB_evidenceCountOnly: confidenceB,
    alternativeC_marginAndEvidence: confidenceC
  };

  const outDir = path.join(__dirname, '..', 'results');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `calibration-experiments-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\n\nFull experiment report written to: ${outFile}`);
}

main().catch((err) => {
  console.error('Calibration experiments crashed:', err);
  process.exit(1);
});
