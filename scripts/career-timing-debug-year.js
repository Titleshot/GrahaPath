/**
 * Debug harness for a targeted historical year (e.g. "what happened in 2008?").
 * Prints every layer of the pipeline without changing any scoring logic:
 *   dasha at that year -> raw score per event type -> which conditions fired
 *   -> which classifier(s) the candidate question text would trigger
 *   -> the actual intent processChatV2Request returns for each candidate text.
 *
 * Public birth data (e.g. Elon Musk) is used ONLY as a test fixture here, the
 * same way the career-timing-regression.js Steve Jobs fixture is used --
 * NEVER inside services/dasha/careerTimingService.js itself.
 *
 * Usage: node scripts/career-timing-debug-year.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { DateTime } = require('luxon');
const { generateBirthChart } = require('../services/astrologyService');
const { calculateDashaAtDate } = require('../services/dasha/dashaCalculator');
const {
  houseLordMap,
  planetsInHouse,
  birthDateTime,
  chartForTiming,
  ageOnDate
} = require('../services/dasha/timelineScanEngine');
const {
  isCareerTimingQuery,
  isCareerEventInterpretationQuery,
  detectCareerEventType,
  scoreCareerEventActivation,
  CAREER_EVENT_TYPES
} = require('../services/dasha/careerTimingService');
const { detectIntent } = require('../services/grahapathChat/intentDetector');
const { processChatV2Request } = require('../services/grahapathChat/chatService');

const MALEFICS = new Set(['Saturn', 'Rahu', 'Ketu', 'Mars']);
const BENEFICS = new Set(['Jupiter', 'Venus', 'Mercury', 'Sun', 'Moon']);

async function buildChart(name, { year, month, day, hour, minute, lat, lon, zone, place }) {
  const localDateTime = DateTime.fromObject({ year, month, day, hour, minute, second: 0 }, { zone });
  return generateBirthChart({
    name,
    place,
    location: { displayName: place, latitude: lat, longitude: lon },
    timezone: zone,
    localDateTime,
    utcDateTime: localDateTime.toUTC(),
    dateMetadata: { inputDateType: 'AD', birthDateAD: localDateTime.toISODate() }
  });
}

/** Re-derives WHICH individual conditions are true for this chart, mirroring
 * (not modifying) the branches in careerTimingService.js's
 * scoreCareerEventTypeActivation, purely for inspection. */
function explainConditions(chart, md, ad, age) {
  const lords = houseLordMap(chart);
  const tenthLord = lords[10] || null;
  const eleventhLord = lords[11] || null;
  const sixthLord = lords[6] || null;
  const eighthLord = lords[8] || null;
  const twelfthLord = lords[12] || null;
  const h1 = planetsInHouse(chart, 1);
  const h6 = planetsInHouse(chart, 6);
  const h10 = planetsInHouse(chart, 10);
  const h11 = planetsInHouse(chart, 11);
  const sun = (chart?.planets || []).find((p) => p.name === 'Sun');
  const cw = chart?.careerWealth;
  const careerPoints = cw?.meters?.careerPoints;
  const tenthLordRow = (chart?.planets || []).find((p) => p.name === tenthLord);
  const tenthLordInDusthana = tenthLordRow?.house === 6 || tenthLordRow?.house === 8 || tenthLordRow?.house === 12;
  const onDisruptionAxis = (p) => p && (p === sixthLord || p === eighthLord || p === twelfthLord);
  const onGrowthAxis = (p) => p && (p === tenthLord || p === eleventhLord);

  return {
    facts: {
      tenthLord,
      eleventhLord,
      sixthLord,
      eighthLord,
      twelfthLord,
      mahaDasha: md,
      antarDasha: ad,
      age,
      mdOnGrowthAxis: onGrowthAxis(md),
      adOnGrowthAxis: onGrowthAxis(ad),
      mdOnDisruptionAxis: onDisruptionAxis(md),
      adOnDisruptionAxis: onDisruptionAxis(ad),
      mdIsBenefic: md ? BENEFICS.has(md) : null,
      adIsBenefic: ad ? BENEFICS.has(ad) : null,
      mdIsMalefic: md ? MALEFICS.has(md) : null,
      adIsMalefic: ad ? MALEFICS.has(ad) : null,
      sunInH10OrH1: h10.includes('Sun') || h1.includes('Sun') || sun?.house === 10 || sun?.house === 1,
      tenthLordInDusthana,
      h10occupants: h10,
      h11occupants: h11,
      careerPoints: careerPoints ?? null
    }
  };
}

async function main() {
  console.log('Building test fixture chart (public birth data used only as a test case, not baked into the engine)...');
  // Commonly cited public birth data; exact birth time is not officially
  // confirmed and varies by source -- used here purely as an evaluation
  // fixture, same caveat as the Steve Jobs fixture in career-timing-regression.js.
  const chart = await buildChart('Debug Subject (Musk)', {
    year: 1971,
    month: 6,
    day: 28,
    hour: 7,
    minute: 30,
    lat: -25.7461,
    lon: 28.1881,
    zone: 'Africa/Johannesburg',
    place: 'Pretoria, South Africa'
  });

  const chartCtx = chartForTiming(chart);
  const birth = birthDateTime(chartCtx);
  const targetDate = DateTime.fromObject({ year: 2008, month: 7, day: 1 }, { zone: chartCtx.timezone || 'UTC' });
  const age = ageOnDate(birth, targetDate);

  console.log('\n=== 1. Dasha active in 2008 ===');
  const dasha = calculateDashaAtDate(chartCtx, targetDate, { preferEngine: true });
  console.log(JSON.stringify({ ...dasha, ageAtTarget: age }, null, 2));

  console.log('\n=== 2. Raw score per event type for that exact dasha/age ===');
  const scores = {};
  for (const type of CAREER_EVENT_TYPES) {
    scores[type] = scoreCareerEventActivation(chartCtx, dasha.mahaDasha, dasha.antarDasha, age, type);
  }
  const general = scoreCareerEventActivation(chartCtx, dasha.mahaDasha, dasha.antarDasha, age, 'general');
  console.log(JSON.stringify({ perType: scores, generalResolvesTo: general }, null, 2));

  console.log('\n=== 3. Underlying chart facts each rule reads (to see which conditions fired) ===');
  console.log(JSON.stringify(explainConditions(chartCtx, dasha.mahaDasha, dasha.antarDasha, age), null, 2));

  console.log('\n=== 4. Which category wins, ranked ===');
  const ranked = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
  ranked.forEach(([type, r], i) => console.log(`  ${i + 1}. ${type}: score ${r.score}`));

  console.log('\n=== 5. Classifier routing for candidate question phrasings ===');
  const candidates = [
    '2008 मा मेरो career मा के भयो?',
    'What happened to my career in 2008?',
    'What was the event in my career during 2008?',
    'Was 2008 a setback year for my career?',
    'Tell me about 2008 in my career.'
  ];
  for (const text of candidates) {
    const topIntent = detectIntent(text);
    const timingHit = isCareerTimingQuery(text);
    const interpHit = isCareerEventInterpretationQuery(text);
    const eventTypeIfTiming = timingHit ? detectCareerEventType(text) : null;
    console.log(
      `  "${text}"\n    detectIntent=${topIntent} | isCareerTimingQuery=${timingHit} | isCareerEventInterpretationQuery=${interpHit}${eventTypeIfTiming ? ` | eventType=${eventTypeIfTiming}` : ''}`
    );
  }

  console.log('\n=== 6. Actual end-to-end intent + answer processChatV2Request returns for each candidate ===');
  for (const text of candidates) {
    const result = await processChatV2Request({
      chart,
      message: text,
      userPlan: 'free',
      conversationHistory: [],
      surfaceMode: 'message',
      premiumUnlocked: false,
      mode: 'message'
    }).catch((e) => ({ intent: `ERROR: ${e.message}`, answer: '' }));
    console.log(`  "${text}"\n    -> intent="${result.intent}"`);
    if (result.intent === 'career_question' || String(result.intent).startsWith('ERROR')) {
      console.log('    (falls through to the normal LLM path -- no deterministic career-timing table used)');
    } else {
      console.log(`    answer: ${result.answer}`);
    }
  }
}

main().catch((err) => {
  console.error('Debug script crashed:', err);
  process.exit(1);
});
