/**
 * Sample run for Ajit / Kathmandu BS date — prints astroBrain summary fields.
 * Usage: node scripts/run-astro-brain-sample.js
 */
const { DateTime } = require('luxon');
const { convertBsToAd } = require('../services/dateConversionService');
const { generateBirthChart } = require('../services/astrologyService');

async function main() {
  const { adDate, bsDate } = convertBsToAd(2054, 4, 1);
  const [y, m, d] = adDate.split('-').map(Number);
  const localDateTime = DateTime.fromObject(
    { year: y, month: m, day: d, hour: 4, minute: 30, second: 0 },
    { zone: 'Asia/Kathmandu' }
  );

  const chart = await generateBirthChart({
    name: 'Ajit',
    place: 'Kathmandu, Nepal',
    location: {
      displayName: 'Kathmandu, Nepal',
      latitude: 27.7172,
      longitude: 85.324
    },
    timezone: 'Asia/Kathmandu',
    localDateTime,
    utcDateTime: localDateTime.toUTC(),
    dateMetadata: {
      inputDateType: 'BS',
      birthDateAD: adDate,
      birthDateBS: bsDate,
      calculatedFrom: 'AD Gregorian date after BS conversion',
      originalBsDate: '2054-04-01'
    },
    includeDebug: false
  });

  const brain = chart.astroBrain;
  if (!brain) {
    console.error('No astroBrain on chart');
    process.exit(1);
  }

  console.log('--- dominantPlanets ---');
  console.log(JSON.stringify(brain.dominantPlanets, null, 2));
  console.log('--- challengedPlanets ---');
  console.log(JSON.stringify(brain.challengedPlanets, null, 2));
  console.log('--- yogas (names) ---');
  console.log(JSON.stringify((brain.yogas || []).map((y) => y.name), null, 2));
  console.log('--- interactionPatterns ---');
  console.log(JSON.stringify(brain.interactionPatterns, null, 2));
  console.log('--- aspects (top 12) ---');
  console.log(JSON.stringify((brain.aspects || []).slice(0, 12), null, 2));
  console.log('--- drishti (top 12) ---');
  console.log(JSON.stringify((brain.drishti || []).slice(0, 12), null, 2));
  console.log('--- divisional ---');
  console.log(JSON.stringify(brain.divisional, null, 2));
  console.log('--- housePolicy ---');
  console.log(JSON.stringify(brain.housePolicy, null, 2));
  console.log('--- panchanga ---');
  console.log(JSON.stringify(brain.panchanga, null, 2));
  console.log('--- ashtakavarga ---');
  console.log(JSON.stringify(brain.ashtakavarga, null, 2));
  console.log('--- charaKarakas ---');
  console.log(JSON.stringify(brain.charaKarakas, null, 2));
  console.log('--- planetState ---');
  console.log(JSON.stringify(brain.planetState, null, 2));
  console.log('--- argala ---');
  console.log(JSON.stringify(brain.argala, null, 2));
  console.log('--- shadbala ---');
  console.log(JSON.stringify(brain.shadbala, null, 2));
  console.log('--- transitWindows ---');
  console.log(JSON.stringify(brain.transitWindows, null, 2));
  console.log('--- guardrailMeta ---');
  console.log(JSON.stringify(brain.guardrailMeta, null, 2));
  console.log('--- guardrail env hint ---');
  console.log(
    'Set GUARDRAIL_PRESET=lenient|balanced|strict (optional overrides: GUARDRAIL_MIN_EVIDENCE_COUNT, GUARDRAIL_STRONG_MIN, GUARDRAIL_WEAK_MAX).'
  );
  console.log('--- currentDasha ---');
  console.log(JSON.stringify(brain.currentDasha, null, 2));
  console.log('--- currentAntardasha ---');
  console.log(JSON.stringify(brain.currentAntardasha, null, 2));
  console.log('--- coreLifePattern ---');
  console.log(JSON.stringify(brain.corePatterns?.coreLifePattern, null, 2));
  console.log('--- careerPattern ---');
  console.log(JSON.stringify(brain.corePatterns?.careerPattern, null, 2));
  console.log('--- wealthPattern ---');
  console.log(JSON.stringify(brain.corePatterns?.wealthPattern, null, 2));
  console.log('--- healthEnergyPattern ---');
  console.log(JSON.stringify(brain.corePatterns?.healthEnergyPattern, null, 2));
  console.log('--- causalInsights (v2) ---');
  console.log(JSON.stringify(brain.causalInsights, null, 2));
  console.log('--- futureSections ---');
  console.log(JSON.stringify(brain.futureSections, null, 2));
  console.log('--- predictionQuality ---');
  console.log(JSON.stringify(chart.predictionQuality, null, 2));
  console.log('--- timeSensitivity ---');
  console.log(JSON.stringify(chart.timeSensitivity || null, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
