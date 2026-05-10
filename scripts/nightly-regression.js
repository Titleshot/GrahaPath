const { DateTime } = require('luxon');
const { convertBsToAd } = require('../services/dateConversionService');
const { generateBirthChart } = require('../services/astrologyService');
const { spawnSync } = require('child_process');

const MAX_PAIR_SIMILARITY = Number(process.env.MAX_PAIR_SIMILARITY || 0.75);
const MAX_AVG_SIMILARITY = Number(process.env.MAX_AVG_SIMILARITY || 0.58);
const MIN_PERSONALIZATION_AVG = Number(process.env.MIN_PERSONALIZATION_AVG || 55);

const CASES = [
  { name: 'Case01', bs: [2054, 4, 1], time: '04:30', place: 'Kathmandu, Nepal', lat: 27.7172, lon: 85.324, tz: 'Asia/Kathmandu' },
  { name: 'Case02', bs: [2057, 10, 14], time: '19:10', place: 'Pokhara, Nepal', lat: 28.2096, lon: 83.9856, tz: 'Asia/Kathmandu' },
  { name: 'Case03', bs: [2049, 2, 22], time: '08:42', place: 'Biratnagar, Nepal', lat: 26.4525, lon: 87.2718, tz: 'Asia/Kathmandu' },
  { name: 'Case04', bs: [2060, 11, 7], time: '23:05', place: 'Butwal, Nepal', lat: 27.7006, lon: 83.4483, tz: 'Asia/Kathmandu' },
  { name: 'Case05', bs: [2051, 6, 18], time: '12:16', place: 'Dharan, Nepal', lat: 26.814, lon: 87.2797, tz: 'Asia/Kathmandu' },
  { name: 'Case06', bs: [2053, 12, 3], time: '16:51', place: 'Janakpur, Nepal', lat: 26.7288, lon: 85.925, tz: 'Asia/Kathmandu' },
  { name: 'Case07', bs: [2058, 5, 27], time: '06:14', place: 'Hetauda, Nepal', lat: 27.4286, lon: 85.0322, tz: 'Asia/Kathmandu' },
  { name: 'Case08', bs: [2050, 9, 9], time: '21:32', place: 'Nepalgunj, Nepal', lat: 28.05, lon: 81.6167, tz: 'Asia/Kathmandu' },
  { name: 'Case09', bs: [2055, 1, 30], time: '02:11', place: 'Lalitpur, Nepal', lat: 27.6644, lon: 85.3188, tz: 'Asia/Kathmandu' },
  { name: 'Case10', bs: [2048, 7, 13], time: '14:40', place: 'Bharatpur, Nepal', lat: 27.6766, lon: 84.435, tz: 'Asia/Kathmandu' },
  { name: 'Case11', bs: [2052, 3, 11], time: '10:02', place: 'Dhangadhi, Nepal', lat: 28.6958, lon: 80.583, tz: 'Asia/Kathmandu' },
  { name: 'Case12', bs: [2059, 8, 21], time: '18:24', place: 'Itahari, Nepal', lat: 26.6637, lon: 87.2718, tz: 'Asia/Kathmandu' },
  { name: 'Case13', bs: [2056, 2, 5], time: '07:08', place: 'Tulsipur, Nepal', lat: 28.1309, lon: 82.2973, tz: 'Asia/Kathmandu' },
  { name: 'Case14', bs: [2047, 11, 24], time: '00:46', place: 'Bhaktapur, Nepal', lat: 27.671, lon: 85.4298, tz: 'Asia/Kathmandu' },
  { name: 'Case15', bs: [2061, 4, 19], time: '15:27', place: 'Kirtipur, Nepal', lat: 27.6782, lon: 85.2776, tz: 'Asia/Kathmandu' },
  { name: 'Case16', bs: [2058, 9, 2], time: '20:57', place: 'Banepa, Nepal', lat: 27.6298, lon: 85.5214, tz: 'Asia/Kathmandu' },
  { name: 'Case17', bs: [2053, 5, 16], time: '11:49', place: 'Gorkha, Nepal', lat: 28.0, lon: 84.6333, tz: 'Asia/Kathmandu' },
  { name: 'Case18', bs: [2050, 1, 28], time: '05:39', place: 'Damauli, Nepal', lat: 27.9753, lon: 84.2669, tz: 'Asia/Kathmandu' },
  { name: 'Case19', bs: [2057, 7, 10], time: '13:36', place: 'Dhankuta, Nepal', lat: 26.9833, lon: 87.3333, tz: 'Asia/Kathmandu' },
  { name: 'Case20', bs: [2052, 10, 26], time: '09:21', place: 'Birgunj, Nepal', lat: 27.0104, lon: 84.8774, tz: 'Asia/Kathmandu' }
];

function astroTokenSignature(text) {
  const planets = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
  const signs = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  ];
  const houses = [...String(text).matchAll(/house\s+(\d{1,2})/gi)].map((m) => `house${m[1]}`);
  const words = String(text).match(/[a-z0-9_]+/gi) || [];
  const normalizedWords = words.map((x) => x.toLowerCase());
  const structural = normalizedWords.filter((w) =>
    ['asc_', 'moon_', 'sun_', 'dom_', 'ch_', 'md_', 'ad_', 'asp_', 'pl_'].some((prefix) => w.startsWith(prefix))
  );
  return new Set([
    ...normalizedWords.filter((w) => planets.includes(w)),
    ...normalizedWords.filter((w) => signs.includes(w)),
    ...houses
    ,
    ...structural
  ]);
}

function jaccardSet(sa, sb) {
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const union = new Set([...sa, ...sb]).size;
  return union ? inter / union : 1;
}

function chartSignature(chart) {
  const insights = chart?.astroBrain?.causalInsights?.insights || [];
  const causes = insights.map((i) => i.cause).join(' | ');
  const interactions = (chart?.astroBrain?.interactionPatterns || [])
    .map((p) => `${p.type} ${p.evidence?.join(' ') || ''}`)
    .join(' | ');
  const future = Object.values(chart?.astroBrain?.futureSections || {})
    .map((s) => `${s?.observation || ''} ${s?.cause || ''}`)
    .join(' | ');
  const structuralTokens = [];
  structuralTokens.push(`asc_${String(chart?.ascendant || '').toLowerCase()}`);
  structuralTokens.push(`moon_${String(chart?.moonSign || '').toLowerCase()}`);
  structuralTokens.push(`sun_${String(chart?.sunSign || '').toLowerCase()}`);

  const topDominant = (chart?.astroBrain?.dominantPlanets || []).slice(0, 3);
  topDominant.forEach((d) => structuralTokens.push(`dom_${String(d.planet || '').toLowerCase()}`));
  const topChallenged = (chart?.astroBrain?.challengedPlanets || []).slice(0, 2);
  topChallenged.forEach((d) => structuralTokens.push(`ch_${String(d.planet || '').toLowerCase()}`));

  const currentDasha = chart?.astroBrain?.currentDasha?.planet;
  const currentAntar = chart?.astroBrain?.currentAntardasha?.antarLord;
  if (currentDasha) structuralTokens.push(`md_${String(currentDasha).toLowerCase()}`);
  if (currentAntar) structuralTokens.push(`ad_${String(currentAntar).toLowerCase()}`);

  (chart?.astroBrain?.aspects || []).slice(0, 8).forEach((a) => {
    structuralTokens.push(
      `asp_${String(a.planetA || '').toLowerCase()}_${String(a.aspectType || '').toLowerCase()}_${String(a.planetB || '').toLowerCase()}`
    );
  });

  (chart?.planets || []).forEach((p) => {
    structuralTokens.push(
      `pl_${String(p.name || '').toLowerCase()}_${String(p.sign || '').toLowerCase()}_h${p.house}_p${p.nakshatraPada}`
    );
  });

  return astroTokenSignature(`${causes} | ${interactions} | ${future} | ${structuralTokens.join(' | ')}`);
}

async function buildChartFromCase(item) {
  const { adDate, bsDate } = convertBsToAd(item.bs[0], item.bs[1], item.bs[2]);
  const [y, m, d] = adDate.split('-').map(Number);
  const [hh, mm] = item.time.split(':').map(Number);
  const localDateTime = DateTime.fromObject(
    { year: y, month: m, day: d, hour: hh, minute: mm, second: 0 },
    { zone: item.tz }
  );

  return generateBirthChart({
    name: item.name,
    place: item.place,
    location: { displayName: item.place, latitude: item.lat, longitude: item.lon },
    timezone: item.tz,
    localDateTime,
    utcDateTime: localDateTime.toUTC(),
    dateMetadata: {
      inputDateType: 'BS',
      birthDateAD: adDate,
      birthDateBS: bsDate,
      calculatedFrom: 'AD Gregorian date after BS conversion',
      originalBsDate: `${item.bs[0]}-${String(item.bs[1]).padStart(2, '0')}-${String(item.bs[2]).padStart(2, '0')}`,
      locationInputMode: 'exact_coordinates',
      timeInputMode: 'exact_time'
    },
    includeDebug: false
  });
}

function pairwiseSimilarities(charts) {
  const signatures = charts.map((c) => ({ name: c.name, sig: chartSignature(c) }));
  const pairs = [];
  for (let i = 0; i < signatures.length; i += 1) {
    for (let j = i + 1; j < signatures.length; j += 1) {
      const similarity = jaccardSet(signatures[i].sig, signatures[j].sig);
      pairs.push({ a: signatures[i].name, b: signatures[j].name, similarity });
    }
  }
  return pairs;
}

async function main() {
  if (process.env.SKIP_ASHTAKAVARGA_GATE !== '1') {
    const gate = spawnSync(process.execPath, ['scripts/ashtakavarga-regression.js'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    if (gate.status !== 0) {
      console.error('Nightly regression aborted: Ashtakavarga gate failed.');
      process.exit(gate.status === null ? 1 : gate.status);
    }
  }

  console.log(`Running nightly regression on ${CASES.length} charts...`);
  const charts = [];
  for (const c of CASES) {
    // Sequential for stable native-module load on Windows CI.
    const chart = await buildChartFromCase(c);
    charts.push(chart);
  }

  const pairs = pairwiseSimilarities(charts);
  const avgSimilarity = pairs.reduce((sum, p) => sum + p.similarity, 0) / (pairs.length || 1);
  const maxPair = pairs.reduce(
    (best, p) => (p.similarity > best.similarity ? p : best),
    { a: '-', b: '-', similarity: -1 }
  );

  const personalizationAvg =
    charts.reduce((sum, c) => sum + (c?.predictionQuality?.personalizationScore?.score || 0), 0) /
    (charts.length || 1);

  const verdict = {
    charts: charts.length,
    pairs: pairs.length,
    avgSimilarity: Number(avgSimilarity.toFixed(3)),
    maxPairSimilarity: Number(maxPair.similarity.toFixed(3)),
    maxPair,
    personalizationAvg: Number(personalizationAvg.toFixed(1)),
    thresholds: {
      maxPairSimilarity: MAX_PAIR_SIMILARITY,
      maxAvgSimilarity: MAX_AVG_SIMILARITY,
      minPersonalizationAvg: MIN_PERSONALIZATION_AVG
    }
  };

  console.log(JSON.stringify(verdict, null, 2));

  const failed =
    verdict.maxPairSimilarity > MAX_PAIR_SIMILARITY ||
    verdict.avgSimilarity > MAX_AVG_SIMILARITY ||
    verdict.personalizationAvg < MIN_PERSONALIZATION_AVG;

  if (failed) {
    console.error(
      'Nightly regression FAILED: outputs are too similar or personalization quality dropped below threshold.'
    );
    process.exit(1);
  }

  console.log('Nightly regression PASSED.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

