/**
 * Phase 2 -- blind validation runner for the career-timing engine.
 *
 * This is a MEASUREMENT tool, not a pass/fail regression suite: it builds a
 * chart from each fixture's birth data ONLY, asks the engine standardized
 * questions, captures the full deterministic output (not just the rendered
 * English reply), and scores it against each fixture's independently
 * documented events using scoringBuckets.js's fixed-in-advance rules.
 *
 * It never modifies services/dasha/careerTimingService.js's scoring, and it
 * never lets fixture.events reach chart generation or the scoring engine --
 * see buildChartFromFixture() and the leakage assertion in main().
 *
 * Usage: node scripts/validation/careerTimingValidationRunner.js
 * Output: scripts/validation/results/<timestamp>.json (machine-readable) and
 * a console summary table.
 */
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const { generateBirthChart } = require('../../services/astrologyService');
const {
  buildCareerTimingContext,
  buildCareerEventInterpretationContext
} = require('../../services/dasha/careerTimingService');
const { explainScoringFactors } = require('./explainScoringFactors');
const { scoreTimingAccuracy, scoreEventTypeMatch, isFalsePositive } = require('./scoringBuckets');
const { CAREER_TIMING_VALIDATION_FIXTURES } = require('./careerTimingFixtures');

const CATEGORY_QUESTION_WORD = {
  breakthrough: 'breakthrough',
  setback: 'setback',
  transition: 'transition',
  expansion: 'expansion',
  leadership: 'leadership',
  restructuring: 'restructuring'
};

/** Builds a chart from ONLY the fixture's birth fields. fixture.events is
 * never read here -- this function's argument list makes that structurally
 * explicit rather than just a promise in a comment. */
async function buildChartFromFixture(name, birth) {
  const localDateTime = DateTime.fromObject(
    {
      year: Number(birth.date.slice(0, 4)),
      month: Number(birth.date.slice(5, 7)),
      day: Number(birth.date.slice(8, 10)),
      hour: Number(birth.time.slice(0, 2)),
      minute: Number(birth.time.slice(3, 5)),
      second: 0
    },
    { zone: birth.zone }
  );
  return generateBirthChart({
    name,
    place: birth.place,
    location: { displayName: birth.place, latitude: birth.lat, longitude: birth.lon },
    timezone: birth.zone,
    localDateTime,
    utcDateTime: localDateTime.toUTC(),
    dateMetadata: { inputDateType: 'AD', birthDateAD: localDateTime.toISODate() }
  });
}

/** Middle year of a "calendarYears" style string/window, or its own calendarYear. */
function representativeYear(window) {
  if (!window) return null;
  if (Number.isFinite(window.calendarYear)) return window.calendarYear;
  const m = String(window.calendarYears || '').match(/(\d{4})\D+(\d{4})/);
  if (m) return Math.round((Number(m[1]) + Number(m[2])) / 2);
  const single = String(window.calendarYears || '').match(/\d{4}/);
  return single ? Number(single[0]) : null;
}

function yearRangeOfOpenWindow(window) {
  const m = String(window?.calendarYears || '').match(/(\d{4})\D+(\d{4})/);
  if (m) return { start: Number(m[1]), end: Number(m[2]) };
  const single = String(window?.calendarYears || '').match(/\d{4}/);
  if (single) return { start: Number(single[0]), end: Number(single[0]) };
  return null;
}

/** Runs the two OPEN_TIMING (mode A) questions and scores them against the fixture's matching-category events, if any. */
async function runOpenTimingQuestions(fixture, chart) {
  const records = [];
  for (const category of ['breakthrough', 'setback']) {
    const message =
      category === 'breakthrough'
        ? 'When was my biggest career breakthrough?'
        : 'When was my biggest career setback or failure?';
    const ctx = buildCareerTimingContext(chart, message);
    const primary = ctx.primaryCareerWindow;
    const predictedYear = representativeYear(primary);
    const factors = primary
      ? explainScoringFactors(chart, primary.mahaDasha, primary.antarDasha, primary.age)
      : null;

    const matchingEvents = fixture.events.filter((e) => e.category === category);
    const scoredAgainst = matchingEvents.map((event) => ({
      actualEvent: event,
      ...scoreTimingAccuracy(predictedYear, event.year, ctx.topCareerWindows, yearRangeOfOpenWindow)
    }));

    records.push({
      mode: 'OPEN_TIMING',
      question: message,
      category,
      timingDataStatus: ctx.timingDataStatus,
      predictedWindow: primary
        ? {
            ageRangeLabel: primary.displayAgeLabel || primary.ageRangeLabel,
            calendarYears: primary.calendarYears,
            mahaDasha: primary.mahaDasha,
            antarDasha: primary.antarDasha,
            activationScore: primary.careerActivationScore,
            resolvedEventType: primary.resolvedEventType
          }
        : null,
      confidence: ctx.confidence,
      candidateRanking: ctx.topCareerWindows,
      scoringFactors: factors,
      matchedAgainstEvents: scoredAgainst,
      hasMatchingActualEvent: matchingEvents.length > 0
    });
  }
  return records;
}

/** Runs one DIRECT_YEAR (mode C) question per documented event and scores classification + timing precision. */
async function runDirectYearQuestions(fixture, chart) {
  const records = [];
  for (const event of fixture.events) {
    const word = CATEGORY_QUESTION_WORD[event.category] || event.category;
    const message = `Was ${event.year} a ${word} year for my career?`;
    const ctx = buildCareerEventInterpretationContext(chart, message, []);

    if (ctx.status !== 'ok') {
      records.push({
        mode: 'DIRECT_YEAR',
        question: message,
        actualEvent: event,
        status: ctx.status,
        note: 'Engine could not resolve this year -- see status.'
      });
      continue;
    }

    const ranked = ctx.rankedEventTypes; // full 6-type ranking for this exact year
    const top = ranked[0];
    const typeMatch = scoreEventTypeMatch(top.type, event.category);
    const factors = explainScoringFactors(chart, ctx.mahaDasha, ctx.antarDasha, ctx.age);

    records.push({
      mode: 'DIRECT_YEAR',
      question: message,
      actualEvent: event,
      resolvedAge: ctx.age,
      mahaDasha: ctx.mahaDasha,
      antarDasha: ctx.antarDasha,
      topPredictedCategory: top.type,
      topScore: top.score,
      scoreMarginOverRunnerUp: top.score - (ranked[1]?.score ?? 0),
      fullCategoryRanking: ranked,
      scoringFactors: factors,
      eventTypeMatch: typeMatch.match,
      rankOfActualCategory: ranked.findIndex((r) => r.type === event.category) + 1 // 0 if not found (shouldn't happen, all 6 types are always ranked)
    });
  }
  return records;
}

function summarize(allRecords) {
  const openTimingScored = allRecords
    .flatMap((p) => p.openTiming)
    .flatMap((r) => r.matchedAgainstEvents.map((m) => ({ ...m, personId: r.personId, confidence: r.confidence })));

  const bucketCounts = {};
  let totalPoints = 0;
  for (const s of openTimingScored) {
    bucketCounts[s.bucket] = (bucketCounts[s.bucket] || 0) + 1;
    totalPoints += s.points;
  }
  const avgTimingScore = openTimingScored.length ? Math.round((totalPoints / openTimingScored.length) * 10) / 10 : null;

  const directYear = allRecords.flatMap((p) => p.directYear).filter((r) => r.status === undefined);
  const typeMatches = directYear.filter((r) => r.eventTypeMatch != null);
  const eventTypeAccuracy = typeMatches.length
    ? Math.round((typeMatches.filter((r) => r.eventTypeMatch).length / typeMatches.length) * 1000) / 10
    : null;

  let fpCount = 0;
  let fpEligible = 0;
  for (const person of allRecords) {
    const allActualYears = person.fixture.events.map((e) => e.year);
    for (const r of person.openTiming) {
      if (!r.predictedWindow) continue;
      fpEligible += 1;
      const predictedYear = representativeYear({ calendarYears: r.predictedWindow.calendarYears });
      if (isFalsePositive({ confidence: r.confidence, predictedYear, allActualYears })) {
        fpCount += 1;
      }
    }
  }
  const falsePositiveRate = fpEligible ? Math.round((fpCount / fpEligible) * 1000) / 10 : null;

  const confidenceBuckets = {};
  for (const s of openTimingScored) {
    const conf = s.confidence;
    if (!conf) continue;
    confidenceBuckets[conf] = confidenceBuckets[conf] || { count: 0, totalPoints: 0 };
    confidenceBuckets[conf].count += 1;
    confidenceBuckets[conf].totalPoints += s.points;
  }
  const confidenceCalibration = Object.fromEntries(
    Object.entries(confidenceBuckets).map(([k, v]) => [k, { count: v.count, avgAccuracyPoints: Math.round((v.totalPoints / v.count) * 10) / 10 }])
  );

  return {
    sampleSize: allRecords.length,
    openTimingPredictionsScored: openTimingScored.length,
    avgTimingAccuracyPoints: avgTimingScore,
    timingBucketDistribution: bucketCounts,
    directYearQuestionsAsked: directYear.length,
    eventTypeClassificationAccuracyPercent: eventTypeAccuracy,
    falsePositiveRatePercent: falsePositiveRate,
    falsePositiveEligiblePredictions: fpEligible,
    confidenceCalibration,
    caveat:
      `Sample size is ${allRecords.length} fixtures -- these numbers describe performance on THIS controlled set only, ` +
      'not a general accuracy claim about the engine. See report notes for methodology and known limitations.'
  };
}

async function main() {
  console.log(`Running career-timing validation on ${CAREER_TIMING_VALIDATION_FIXTURES.length} fixtures...`);
  const allRecords = [];

  for (const fixture of CAREER_TIMING_VALIDATION_FIXTURES) {
    console.log(`\n=== ${fixture.name} (${fixture.id}) ===`);
    const chart = await buildChartFromFixture(fixture.name, fixture.birth);

    // Leakage assertion: fixture.events must never have reached the chart.
    if (chart.lifeEventVerification !== undefined) {
      throw new Error(
        `LEAKAGE DETECTED for ${fixture.id}: chart.lifeEventVerification is set even though buildChartFromFixture() ` +
          'only passed birth fields. This would let known events bias the score via lifeEventAgeBoosts(). Aborting.'
      );
    }

    const openTiming = await runOpenTimingQuestions(fixture, chart);
    const directYear = await runDirectYearQuestions(fixture, chart);

    for (const r of openTiming) {
      console.log(
        `  [OPEN_TIMING/${r.category}] predicted ${r.predictedWindow?.calendarYears || 'n/a'} (score ${r.predictedWindow?.activationScore ?? 'n/a'}, confidence ${r.confidence}) vs actual: ${
          r.matchedAgainstEvents.map((m) => `${m.actualEvent.year} -> ${m.bucket} (${m.points}pts, diff ${m.yearDiff}yr)`).join('; ') || 'no documented event of this category'
        }`
      );
    }
    for (const r of directYear) {
      if (r.status) {
        console.log(`  [DIRECT_YEAR ${r.actualEvent.year}] ${r.status}`);
        continue;
      }
      console.log(
        `  [DIRECT_YEAR ${r.actualEvent.year}] actual=${r.actualEvent.category} | predicted top=${r.topPredictedCategory} (score ${r.topScore}, margin +${r.scoreMarginOverRunnerUp}) | match=${r.eventTypeMatch}`
      );
    }

    allRecords.push({ personId: fixture.id, fixture, openTiming, directYear });
  }

  const summary = summarize(allRecords);
  console.log('\n=== SUMMARY (measurement system output -- not a general accuracy claim) ===');
  console.log(JSON.stringify(summary, null, 2));

  const outDir = path.join(__dirname, 'results');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `validation-${Date.now()}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary,
        perPerson: allRecords.map((r) => ({
          personId: r.personId,
          birthTimeReliability: r.fixture.birth.timeReliability,
          openTiming: r.openTiming,
          directYear: r.directYear
        }))
      },
      null,
      2
    )
  );
  console.log(`\nFull machine-readable report written to: ${outFile}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Validation runner crashed:', err);
    process.exit(1);
  });
}

module.exports = { buildChartFromFixture, runOpenTimingQuestions, runDirectYearQuestions, summarize };
