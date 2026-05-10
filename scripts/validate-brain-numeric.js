/**
 * Fails if house net-force, SAV scoring inputs, or impact-tagged payloads contain NaN / non-finite numbers
 * where a finite scalar is required.
 */
const { DateTime } = require('luxon');
const { convertBsToAd } = require('../services/dateConversionService');
const { generateBirthChart } = require('../services/astrologyService');

function assertFinite(value, label) {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`Non-finite number at ${label}: ${value}`);
  }
}

function walkFiniteNumbers(value, path, visitor) {
  if (value === null || value === undefined) return;
  if (typeof value === 'number') {
    visitor(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkFiniteNumbers(item, `${path}[${i}]`, visitor));
    return;
  }
  if (typeof value === 'object') {
    Object.keys(value).forEach((k) => walkFiniteNumbers(value[k], `${path}.${k}`, visitor));
  }
}

async function main() {
  const { adDate, bsDate } = convertBsToAd(2054, 4, 1);
  const [y, m, d] = adDate.split('-').map(Number);
  const localDateTime = DateTime.fromObject(
    { year: y, month: m, day: d, hour: 4, minute: 30, second: 0 },
    { zone: 'Asia/Kathmandu' }
  );
  const chart = await generateBirthChart({
    name: 'NumericGate',
    place: 'Kathmandu, Nepal',
    location: { displayName: 'Kathmandu, Nepal', latitude: 27.7172, longitude: 85.324 },
    timezone: 'Asia/Kathmandu',
    localDateTime,
    utcDateTime: localDateTime.toUTC(),
    dateMetadata: {
      inputDateType: 'BS',
      birthDateAD: adDate,
      birthDateBS: bsDate,
      calculatedFrom: 'AD Gregorian date after BS conversion',
      locationInputMode: 'exact_coordinates',
      timeInputMode: 'exact_time'
    },
    includeDebug: false
  });

  const hnf = chart?.astroBrain?.houseNetForce;
  if (!hnf?.houses?.length) {
    throw new Error('houseNetForce.houses missing');
  }
  hnf.houses.forEach((row, idx) => {
    assertFinite(row.netForce, `houseNetForce.houses[${idx}].netForce`);
    walkFiniteNumbers(row.components, `houseNetForce.houses[${idx}].components`, assertFinite);
  });

  const pq = chart?.predictionQuality;
  if (pq?.ashtakavargaSavScore?.metrics) {
    walkFiniteNumbers(pq.ashtakavargaSavScore.metrics, 'predictionQuality.ashtakavargaSavScore.metrics', assertFinite);
  }
  assertFinite(pq?.ashtakavargaSavScore?.score, 'ashtakavargaSavScore.score');
  assertFinite(pq?.overallQuality?.score, 'overallQuality.score');
  if (chart?.timeCalibration?.timeCertaintyScore != null) {
    assertFinite(chart.timeCalibration.timeCertaintyScore, 'timeCalibration.timeCertaintyScore');
  }

  (chart?.astroBrain?.causalInsights?.insights || []).forEach((ins, i) => {
    if (!ins.impactLevel) throw new Error(`Missing impactLevel on causal insight ${i}`);
  });
  Object.values(chart?.astroBrain?.futureSections || {}).forEach((sec, i) => {
    if (sec && !sec.impactLevel) throw new Error(`Missing impactLevel on future section ${i}`);
  });

  console.log('validate-brain-numeric: OK (finite scalars + impact tags present).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
