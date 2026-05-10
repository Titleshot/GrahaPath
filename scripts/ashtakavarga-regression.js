const { DateTime } = require('luxon');
const { convertBsToAd } = require('../services/dateConversionService');
const { generateBirthChart } = require('../services/astrologyService');

const MIN_SAV_SPREAD = Number(process.env.ASHTAKAVARGA_MIN_SAV_SPREAD || 6);
const MIN_KEY_HOUSE_VARIANCE = Number(process.env.ASHTAKAVARGA_MIN_KEY_HOUSE_VARIANCE || 1.2);
const MAX_IDENTICAL_PLANET_ROWS = Number(process.env.ASHTAKAVARGA_MAX_IDENTICAL_ROWS || 1);

const CASES = [
  ['Case01', 2054, 4, 1, '04:30', 27.7172, 85.324],
  ['Case02', 2057, 10, 14, '19:10', 28.2096, 83.9856],
  ['Case03', 2049, 2, 22, '08:42', 26.4525, 87.2718],
  ['Case04', 2060, 11, 7, '23:05', 27.7006, 83.4483],
  ['Case05', 2051, 6, 18, '12:16', 26.814, 87.2797],
  ['Case06', 2053, 12, 3, '16:51', 26.7288, 85.925]
];

function stdDev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const varc = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(varc);
}

async function buildChart(name, y, m, d, time, lat, lon) {
  const { adDate, bsDate } = convertBsToAd(y, m, d);
  const [yy, mm, dd] = adDate.split('-').map(Number);
  const [hh, mi] = time.split(':').map(Number);
  const localDateTime = DateTime.fromObject(
    { year: yy, month: mm, day: dd, hour: hh, minute: mi, second: 0 },
    { zone: 'Asia/Kathmandu' }
  );
  return generateBirthChart({
    name,
    place: 'Nepal',
    location: { displayName: 'Nepal', latitude: lat, longitude: lon },
    timezone: 'Asia/Kathmandu',
    localDateTime,
    utcDateTime: localDateTime.toUTC(),
    dateMetadata: {
      inputDateType: 'BS',
      birthDateAD: adDate,
      birthDateBS: bsDate,
      calculatedFrom: 'AD Gregorian date after BS conversion',
      originalBsDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  });
}

function countIdenticalRows(planetHouseScores = {}) {
  const rows = Object.entries(planetHouseScores).map(([planet, values]) => ({
    planet,
    sig: Object.keys(values)
      .sort((a, b) => Number(a) - Number(b))
      .map((h) => `${h}:${values[h]}`)
      .join('|')
  }));
  let dup = 0;
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      if (rows[i].sig === rows[j].sig) dup += 1;
    }
  }
  return dup;
}

async function main() {
  const charts = [];
  for (const c of CASES) {
    charts.push(await buildChart(...c));
  }

  const reports = charts.map((chart) => {
    const av = chart?.astroBrain?.ashtakavarga || {};
    const savVals = Object.values(av.sarvashtakavarga || {}).map(Number);
    const savSpread = savVals.length ? Math.max(...savVals) - Math.min(...savVals) : 0;
    return {
      name: chart.name,
      savSpread: Number(savSpread.toFixed(2)),
      keyAvg: Number(av?.luckOpportunity?.averageScore || 0),
      identicalRows: countIdenticalRows(av.planetHouseScores || {})
    };
  });

  const keyHouseVariance = stdDev(reports.map((r) => r.keyAvg));
  const minSpread = Math.min(...reports.map((r) => r.savSpread));
  const maxIdentical = Math.max(...reports.map((r) => r.identicalRows));

  const summary = {
    charts: reports,
    thresholds: {
      minSavSpread: MIN_SAV_SPREAD,
      minKeyHouseVariance: MIN_KEY_HOUSE_VARIANCE,
      maxIdenticalPlanetRows: MAX_IDENTICAL_PLANET_ROWS
    },
    metrics: {
      observedMinSavSpread: Number(minSpread.toFixed(2)),
      observedKeyHouseVariance: Number(keyHouseVariance.toFixed(3)),
      observedMaxIdenticalPlanetRows: maxIdentical
    }
  };

  console.log(JSON.stringify(summary, null, 2));

  const failed =
    minSpread < MIN_SAV_SPREAD ||
    keyHouseVariance < MIN_KEY_HOUSE_VARIANCE ||
    maxIdentical > MAX_IDENTICAL_PLANET_ROWS;

  if (failed) {
    console.error('Ashtakavarga regression FAILED: spread/variance/uniqueness constraints not satisfied.');
    process.exit(1);
  }

  console.log('Ashtakavarga regression PASSED.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

