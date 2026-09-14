/**
 * Priority 3 -- per-event ranking comparison: v0 (production) vs the chosen
 * Priority 1 candidate. Normalization (Priority 2) is deliberately NOT
 * layered in here -- all three normalization variants reduced real accuracy
 * in runCalibrationExperiments.js, so the honest, evidence-based candidate
 * carried forward is v1a_reducedWeights alone, not a "combine everything"
 * stack. For every documented event: previous rank/score, calibrated
 * rank/score, score gap, and event-type match, both before and after.
 *
 * Usage: node scripts/validation/calibration/priority3RankingComparison.js
 */
const fs = require('fs');
const path = require('path');
const { CAREER_TIMING_VALIDATION_FIXTURES } = require('../careerTimingFixtures');
const { buildChartFromFixture } = require('../careerTimingValidationRunner');
const { rankOpenTimingCandidates } = require('./evaluationHarness');
const { v0_baseline, v1a_reducedWeights } = require('./scoringVariants');

function yearDiffToWindow(window, year) {
  const m = String(window?.calendarYears || '').match(/(\d{4})\D+(\d{4})/);
  const range = m ? { start: Number(m[1]), end: Number(m[2]) } : null;
  if (!range) return Infinity;
  if (year >= range.start && year <= range.end) return 0;
  return Math.min(Math.abs(range.start - year), Math.abs(range.end - year));
}

function findRankForEvent(chart, scoreFn, event) {
  const ranking = rankOpenTimingCandidates(chart, scoreFn, event.category, 'past', 500);
  let bestIdx = -1;
  let bestDiff = Infinity;
  ranking.forEach((w, i) => {
    const d = yearDiffToWindow(w, event.year);
    if (d < bestDiff) {
      bestDiff = d;
      bestIdx = i;
    }
  });
  return {
    matched: bestIdx >= 0 ? { rank: bestIdx + 1, score: ranking[bestIdx].score } : null,
    winner: ranking[0] ? { rank: 1, score: ranking[0].score, category: event.category } : null
  };
}

async function main() {
  const rows = [];
  for (const fixture of CAREER_TIMING_VALIDATION_FIXTURES) {
    const chart = await buildChartFromFixture(fixture.name, fixture.birth);
    for (const event of fixture.events) {
      const before = findRankForEvent(chart, v0_baseline, event);
      const after = findRankForEvent(chart, v1a_reducedWeights, event);
      rows.push({
        personId: fixture.id,
        year: event.year,
        category: event.category,
        previousRank: before.matched?.rank ?? null,
        previousScore: before.matched?.score ?? null,
        previousWinnerScore: before.winner?.score ?? null,
        calibratedRank: after.matched?.rank ?? null,
        calibratedScore: after.matched?.score ?? null,
        calibratedWinnerScore: after.winner?.score ?? null,
        rankImproved: before.matched && after.matched ? after.matched.rank < before.matched.rank : null,
        rankChange: before.matched && after.matched ? before.matched.rank - after.matched.rank : null
      });
    }
  }

  console.log('personId | year | category | prevRank->calRank | prevScore->calScore | rankChange');
  for (const r of rows) {
    console.log(
      `${r.personId} | ${r.year} | ${r.category} | ${r.previousRank}->${r.calibratedRank} | ${r.previousScore}->${r.calibratedScore} | ${r.rankChange > 0 ? '+' : ''}${r.rankChange}`
    );
  }

  const withBoth = rows.filter((r) => r.previousRank != null && r.calibratedRank != null);
  const improved = withBoth.filter((r) => r.rankChange > 0).length;
  const worsened = withBoth.filter((r) => r.rankChange < 0).length;
  const unchanged = withBoth.filter((r) => r.rankChange === 0).length;
  const avgRankChange = withBoth.length ? Math.round((withBoth.reduce((s, r) => s + r.rankChange, 0) / withBoth.length) * 100) / 100 : null;

  console.log(`\nSummary: ${improved} improved, ${worsened} worsened, ${unchanged} unchanged (of ${withBoth.length}). Avg rank change: ${avgRankChange > 0 ? '+' : ''}${avgRankChange} positions.`);

  const outDir = path.join(__dirname, '..', 'results');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `priority3-ranking-comparison-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ rows, summary: { improved, worsened, unchanged, avgRankChange } }, null, 2));
  console.log(`Full comparison written to: ${outFile}`);
}

main().catch((err) => {
  console.error('Priority 3 comparison crashed:', err);
  process.exit(1);
});
