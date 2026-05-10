const { DateTime } = require('luxon');
const { convertBsToAd } = require('../services/dateConversionService');
const { generateBirthChart } = require('../services/astrologyService');

async function buildChartFromBs(name, year, month, day, time, place, lat, lon, tz) {
  const { adDate, bsDate } = convertBsToAd(year, month, day);
  const [y, m, d] = adDate.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const localDateTime = DateTime.fromObject(
    { year: y, month: m, day: d, hour: hh, minute: mm, second: 0 },
    { zone: tz }
  );

  return generateBirthChart({
    name,
    place,
    location: { displayName: place, latitude: lat, longitude: lon },
    timezone: tz,
    localDateTime,
    utcDateTime: localDateTime.toUTC(),
    dateMetadata: {
      inputDateType: 'BS',
      birthDateAD: adDate,
      birthDateBS: bsDate,
      calculatedFrom: 'AD Gregorian date after BS conversion',
      originalBsDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    },
    includeDebug: false
  });
}

function causeSignature(chart) {
  const insights = chart.astroBrain?.causalInsights?.insights || [];
  return insights.map((i) => i.cause).join(' | ');
}

function astroTokenSignature(text) {
  const planets = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
  const signs = [
    'aries',
    'taurus',
    'gemini',
    'cancer',
    'leo',
    'virgo',
    'libra',
    'scorpio',
    'sagittarius',
    'capricorn',
    'aquarius',
    'pisces'
  ];
  const houses = [...String(text).matchAll(/house\s+(\d{1,2})/gi)].map((m) => `house${m[1]}`);
  const words = text.split(/\W+/).filter(Boolean).map((x) => x.toLowerCase());
  return new Set([
    ...words.filter((w) => planets.includes(w)),
    ...words.filter((w) => signs.includes(w)),
    ...houses
  ]);
}

function jaccardSet(sa, sb) {
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const union = new Set([...sa, ...sb]).size;
  return union ? inter / union : 1;
}

async function main() {
  const a = await buildChartFromBs(
    'Ajit',
    2054,
    4,
    1,
    '04:30',
    'Kathmandu, Nepal',
    27.7172,
    85.324,
    'Asia/Kathmandu'
  );
  const b = await buildChartFromBs(
    'Sita',
    2057,
    10,
    14,
    '19:10',
    'Pokhara, Nepal',
    28.2096,
    83.9856,
    'Asia/Kathmandu'
  );

  const sigA = causeSignature(a);
  const sigB = causeSignature(b);
  const tokenA = astroTokenSignature(sigA);
  const tokenB = astroTokenSignature(sigB);
  const overlap = jaccardSet(tokenA, tokenB);

  console.log('--- User A causes ---');
  console.log(sigA);
  console.log('--- User B causes ---');
  console.log(sigB);
  console.log('--- swap-test metric ---');
  console.log(
    JSON.stringify(
      {
        astroTokenOverlap: Number(overlap.toFixed(3)),
        verdict:
          overlap > 0.72
            ? 'Too similar; likely swappable'
            : 'Distinct enough; not easily swappable'
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

