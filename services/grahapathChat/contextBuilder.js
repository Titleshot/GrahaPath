const { buildTransitSnapshotAtUtc } = require('../astrologyService');
const { buildDeterministicAstroContextFromTransit } = require('../currentAstronomyService');
const {
  vimNowFromChart,
  firstNameOnly,
  planetsCompact,
  planetsCompactRows,
  careerSliceTight,
  dominantPlanetsShort,
  challengedShort,
  summaryForGemini,
  remedyContextFromChart,
  yogasTiny,
  planetsInHouses,
  planetsNamed
} = require('../geminiContextBuilder');
const { buildDashaContext } = require('../dasha/dashaContextBuilder');

const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces'
];

function resolveAscendantAbs(chart) {
  const n = Number(chart?.ascendantAbsoluteDegree);
  if (Number.isFinite(n)) return n;
  const idx = SIGNS.indexOf(String(chart?.ascendant || ''));
  if (idx < 0) return null;
  return idx * 30 + 15;
}

async function currentLiveTransit(chart) {
  const asc = resolveAscendantAbs(chart);
  if (!Number.isFinite(asc)) return null;
  try {
    const snapshot = await buildTransitSnapshotAtUtc(new Date().toISOString(), asc);
    return {
      generatedAt: snapshot.generatedAt,
      transitHouseNote: snapshot.transitHouseNote,
      deterministicAstronomy: buildDeterministicAstroContextFromTransit(snapshot),
      planets: (snapshot.planets || []).map((p) => ({
        name: p.name,
        sign: p.sign,
        absoluteDegree: p.absoluteDegree,
        houseFromNatalAsc: p.houseFromNatalAsc,
        houseWholeSign: p.houseWholeSign,
        houseBhavaChalit: p.houseBhavaChalit,
        transitHouseMode: p.transitHouseMode
      }))
    };
  } catch {
    return null;
  }
}

function dominantDriverLabels(chart, cap = 3) {
  const raw = dominantPlanetsShort(chart);
  if (!Array.isArray(raw) || !raw.length) return [];
  return raw.slice(0, cap).map((x) => (typeof x === 'string' ? x : String(x)));
}

/**
 * Slim STRICT_USER_DATA for chat — never includes life-phase report schema.
 */
async function buildChatContext(chart, intent, { dailyWeather, userPlan, premiumUnlocked } = {}) {
  if (!chart || typeof chart !== 'object') {
    return { error: 'invalid_chart' };
  }

  const vim = vimNowFromChart(chart);
  const base = {
    _: 'gp_chat_v2',
    intent,
    nm: firstNameOnly(chart),
    v: { md: vim.mahadasha, ad: vim.antardasha, pt: vim.pratyantar }
  };
  const dashaContext = buildDashaContext(chart, { userPlan, premiumUnlocked });

  switch (intent) {
    case 'small_talk': {
      const dw = dailyWeather;
      return {
        ...base,
        moodHint: dw
          ? { primaryPattern: dw.primaryPattern, timingSummary: dw.timingSummary }
          : null,
        drivers: dominantDriverLabels(chart, 2)
      };
    }
    case 'capability_question':
      return { ...base, chartLoaded: true };
    case 'daily_forecast': {
      const transit = await currentLiveTransit(chart);
      return {
        ...base,
        dailyWeather: dailyWeather || null,
        dasha: dashaContext,
        Current_Live_Transit: transit,
        L: chart.ascendant || null,
        M: chart.moonSign || null
      };
    }
    case 'natal_rashi_question':
      return {
        ...base,
        L: chart.ascendant || null,
        M: chart.moonSign || null,
        S: chart.sunSign || null,
        moon: planetsCompactRows(planetsNamed(chart.planets, ['Moon'])),
        lagnaLordSet: planetsCompactRows(planetsInHouses(chart.planets, [1]))
      };
    case 'dasha_question':
      return {
        ...base,
        dasha: dashaContext,
        moon: planetsCompactRows(planetsNamed(chart.planets, ['Moon'])),
        saturnMercury: planetsCompactRows(planetsNamed(chart.planets, ['Saturn', 'Mercury'])),
        Current_Live_Transit: await currentLiveTransit(chart)
      };
    case 'career_question':
      return {
        ...base,
        cw: careerSliceTight(chart.careerWealth),
        dasha: dashaContext,
        h10: planetsCompactRows(planetsInHouses(chart.planets, [10])),
        sunMercSatJup: planetsCompactRows(
          planetsNamed(chart.planets, ['Sun', 'Mercury', 'Saturn', 'Jupiter'])
        ),
        ab: { sum: summaryForGemini(chart), dom: dominantPlanetsShort(chart) }
      };
    case 'relationship_question':
      return {
        ...base,
        h7: planetsCompactRows(planetsInHouses(chart.planets, [7])),
        venusMoon: planetsCompactRows(planetsNamed(chart.planets, ['Venus', 'Moon', 'Mars', 'Jupiter']))
      };
    case 'emotional_pattern':
      return {
        ...base,
        dasha: dashaContext,
        moon: planetsCompactRows(planetsNamed(chart.planets, ['Moon'])),
        mind: planetsCompactRows(planetsNamed(chart.planets, ['Mercury', 'Saturn', 'Rahu', 'Ketu'])),
        M: chart.moonSign || null
      };
    case 'remedy_question':
      return {
        ...base,
        rm: remedyContextFromChart(chart),
        chal: challengedShort(chart)
      };
    case 'deep_analysis': {
      const transit = await currentLiveTransit(chart);
      return {
        _: 'gp_chat_v2',
        intent: 'deep_analysis',
        nm: firstNameOnly(chart),
        v: base.v,
        angles: {
          L: chart.ascendant || null,
          LD: Number.isFinite(Number(chart.ascendantDegree)) ? Number(chart.ascendantDegree) : null,
          M: chart.moonSign || null,
          S: chart.sunSign || null
        },
        p: planetsCompact(chart),
        cw: careerSliceTight(chart.careerWealth),
        ab: {
          sum: summaryForGemini(chart),
          dom: dominantPlanetsShort(chart),
          chal: challengedShort(chart),
          y: yogasTiny(chart?.astroBrain, 6)
        },
        dasha: dashaContext,
        Current_Live_Transit: transit
      };
    }
    case 'general_question':
    default: {
      const transit = await currentLiveTransit(chart);
      return {
        ...base,
        L: chart.ascendant || null,
        M: chart.moonSign || null,
        S: chart.sunSign || null,
        p: planetsCompact(chart).slice(0, 8),
        cw: careerSliceTight(chart.careerWealth),
        dasha: dashaContext,
        ab: { sum: summaryForGemini(chart), dom: dominantPlanetsShort(chart) },
        Current_Live_Transit: transit
      };
    }
  }
}

module.exports = { buildChatContext, currentLiveTransit };
