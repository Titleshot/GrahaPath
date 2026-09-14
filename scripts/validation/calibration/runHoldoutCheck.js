/**
 * The ONE-TIME holdout check for Career Timing Calibration v1.
 *
 * Per the anti-overfitting protocol: this is the only script that touches
 * holdoutFixtures.js, and it runs exactly two scorers -- v0 (production,
 * unchanged) and v1a_reducedWeights (the single candidate carried forward
 * from the dev-set experiments in runCalibrationExperiments.js, chosen
 * BEFORE this script ever ran, on dev-set evidence alone). No other variant
 * is evaluated here, and this script does not feed back into choosing
 * anything -- it only reports whether the dev-set improvement (if any)
 * generalizes to genuinely unseen people.
 *
 * Usage: node scripts/validation/calibration/runHoldoutCheck.js
 */
const fs = require('fs');
const path = require('path');
const { CAREER_TIMING_HOLDOUT_FIXTURES } = require('./holdoutFixtures');
const { CAREER_TIMING_VALIDATION_FIXTURES } = require('../careerTimingFixtures');
const { buildChartFromFixture } = require('../careerTimingValidationRunner');
const { evaluateScorerOnFixtureSet } = require('./evaluationHarness');
const { v0_baseline, v1a_reducedWeights } = require('./scoringVariants');

function printMetrics(label, summary) {
  console.log(`\n--- ${label} ---`);
  console.log(`  avgTimingAccuracyPoints: ${summary.avgTimingAccuracyPoints}`);
  console.log(`  eventTypeClassificationAccuracyPercent: ${summary.eventTypeClassificationAccuracyPercent}`);
  console.log(`  falsePositiveRatePercent: ${summary.falsePositiveRatePercent}`);
  console.log(`  topPredictedCategoryDistribution: ${JSON.stringify(summary.topPredictedCategoryDistribution)}`);
}

async function main() {
  console.log(`Development set: ${CAREER_TIMING_VALIDATION_FIXTURES.length} people (already used to choose v1a)`);
  console.log(`Holdout set: ${CAREER_TIMING_HOLDOUT_FIXTURES.length} people (touched for the first time now)\n`);

  console.log('=== DEV SET (reference, already reported) ===');
  const devV0 = await evaluateScorerOnFixtureSet(CAREER_TIMING_VALIDATION_FIXTURES, buildChartFromFixture, v0_baseline);
  const devV1a = await evaluateScorerOnFixtureSet(CAREER_TIMING_VALIDATION_FIXTURES, buildChartFromFixture, v1a_reducedWeights);
  printMetrics('dev v0 baseline', devV0.summary);
  printMetrics('dev v1a (chosen candidate)', devV1a.summary);

  console.log('\n\n=== HOLDOUT SET (first and only touch) ===');
  const holdoutV0 = await evaluateScorerOnFixtureSet(CAREER_TIMING_HOLDOUT_FIXTURES, buildChartFromFixture, v0_baseline);
  const holdoutV1a = await evaluateScorerOnFixtureSet(CAREER_TIMING_HOLDOUT_FIXTURES, buildChartFromFixture, v1a_reducedWeights);
  printMetrics('holdout v0 baseline', holdoutV0.summary);
  printMetrics('holdout v1a (chosen candidate)', holdoutV1a.summary);

  console.log('\n\n=== GENERALIZATION CHECK ===');
  const devDelta = devV1a.summary.eventTypeClassificationAccuracyPercent - devV0.summary.eventTypeClassificationAccuracyPercent;
  const holdoutDelta = holdoutV1a.summary.eventTypeClassificationAccuracyPercent - holdoutV0.summary.eventTypeClassificationAccuracyPercent;
  console.log(`Dev-set event-type accuracy change from v1a: ${devDelta >= 0 ? '+' : ''}${devDelta.toFixed(1)}pp`);
  console.log(`Holdout event-type accuracy change from v1a: ${holdoutDelta >= 0 ? '+' : ''}${holdoutDelta.toFixed(1)}pp`);
  console.log(
    Math.sign(devDelta) === Math.sign(holdoutDelta) && Math.abs(holdoutDelta) > 0.5
      ? 'Direction of improvement is CONSISTENT between dev and holdout -- some evidence this is a real (if small) effect, not dev-set noise.'
      : 'Direction of improvement is NOT consistent (or holdout effect is negligible) -- the dev-set gain does not clearly generalize; treat v1a as unproven, not adopted.'
  );

  const report = {
    generatedAt: new Date().toISOString(),
    dev: { v0: devV0.summary, v1a: devV1a.summary },
    holdout: { v0: holdoutV0.summary, v1a: holdoutV1a.summary },
    generalization: { devDeltaPercentPoints: devDelta, holdoutDeltaPercentPoints: holdoutDelta }
  };
  const outDir = path.join(__dirname, '..', 'results');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `holdout-check-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\nFull holdout check written to: ${outFile}`);
}

main().catch((err) => {
  console.error('Holdout check crashed:', err);
  process.exit(1);
});
