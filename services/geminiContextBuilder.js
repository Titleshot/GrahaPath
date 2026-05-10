/**
 * Compresses live chart API output into a compact JSON payload for the GrahaPath AI layer.
 * Keeps placements, timing hooks, and domain indices — drops verbose prose blobs.
 */
const { buildGemstoneContext } = require('./gemstoneService');

function planetAbbrev(planets) {
  return (planets || [])
    .filter((p) => p && p.name)
    .map((p) => ({
      name: p.name,
      sign: p.sign || null,
      house: p.house ?? null,
      degree: Number.isFinite(Number(p.degree)) ? Number(p.degree) : null,
      absoluteDegree: Number.isFinite(Number(p.absoluteDegree)) ? Number(p.absoluteDegree) : null,
      nakshatra: p.nakshatra || null
    }));
}

function vimNowFromChart(chart) {
  const ab = chart?.astroBrain;
  const sum = ab?.summary;
  const md = ab?.currentDasha;
  const ad = ab?.currentAntardasha;
  const pd = ab?.currentPratyantar;
  return {
    mahadasha: md?.planet ?? sum?.currentMahadashaPlanet ?? null,
    antardasha: ad?.antarLord ?? sum?.currentAntardashaLord ?? null,
    pratyantar: pd?.pratyantarLord ?? sum?.currentPratyantarLord ?? null,
    mahadashaWindow:
      md?.startDateApprox && md?.endDateApprox
        ? { start: md.startDateApprox, end: md.endDateApprox }
        : null,
    antardashaWindow:
      ad?.startDateApprox && ad?.endDateApprox
        ? { start: ad.startDateApprox, end: ad.endDateApprox }
        : null,
    pratyantarWindow:
      pd?.startDateApprox && pd?.endDateApprox
        ? { start: pd.startDateApprox, end: pd.endDateApprox }
        : null
  };
}

function truncateText(s, max) {
  if (s == null || typeof s !== 'string') return null;
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function firstNameOnly(chart) {
  const nm = typeof chart?.name === 'string' ? chart.name.trim() : '';
  if (!nm) return null;
  return nm.split(/\s+/)[0] || nm;
}

/**
 * ~0.2–0.4KB stringified — greeting only (no full planet table; slashes TPM).
 */
function formatChartForGreetingGemini(chart) {
  if (!chart || typeof chart !== 'object') {
    return { error: 'invalid_chart' };
  }
  const vim = vimNowFromChart(chart);
  return {
    _: 'gp_greet',
    nm: firstNameOnly(chart),
    L: chart.ascendant || null,
    M: chart.moonSign || null,
    S: chart.sunSign || null,
    md: vim.mahadasha,
    ad: vim.antardasha
  };
}

function planetsCompact(chart) {
  return (chart.planets || [])
    .filter((p) => p && p.name)
    .map((p) => ({
      n: p.name,
      h: p.house ?? null,
      z: p.sign || null,
      d: Number.isFinite(Number(p.degree)) ? Number(p.degree) : null,
      ad: Number.isFinite(Number(p.absoluteDegree)) ? Number(p.absoluteDegree) : null,
      nk: p.nakshatra || null
    }));
}

function planetsCompactLimited(chart, limit = 7) {
  return planetsCompact(chart).slice(0, Math.max(1, limit));
}

function careerSliceTight(cw) {
  const s = careerSlice(cw);
  if (!s) return null;
  const notes = Array.isArray(s.dashaAlign) ? s.dashaAlign : [];
  return {
    tenth: s.tenth || null,
    eleventh: s.eleventh || null,
    dashaAlign: notes.slice(0, 2).map((x) => truncateText(String(x), 120)).filter(Boolean),
    caveat: truncateText(s.caveat, 160)
  };
}

function yogasTiny(ab, cap) {
  const list = Array.isArray(ab?.yogas) ? ab.yogas : [];
  const out = [];
  for (let i = 0; i < list.length && out.length < cap; i += 1) {
    const y = list[i];
    if (y == null) continue;
    if (typeof y === 'string') {
      out.push(truncateText(y, 100));
    } else if (typeof y === 'object') {
      const label = y.name || y.type || y.key || y.title;
      let rest = '';
      try {
        rest = truncateText(JSON.stringify(y), 140);
      } catch {
        rest = '[yoga]';
      }
      out.push(label ? truncateText(String(label), 80) : rest);
    }
  }
  return out.length ? out : null;
}

function careerSlice(cw) {
  if (!cw || typeof cw !== 'object') return null;
  return {
    meters: cw.meters || null,
    tenth: cw.houses?.tenth || null,
    eleventh: cw.houses?.eleventh || null,
    dashaAlign: cw.dasha?.alignmentNotes || [],
    caveat: cw.caveat || null
  };
}

function astroBrainSlice(ab) {
  if (!ab || typeof ab !== 'object') return null;
  const summary = ab.summary || null;
  return {
    summary,
    dominantPlanets: ab.dominantPlanets?.slice?.(0, 5) || ab.dominantPlanets || null,
    timeCertaintyScore: ab.timeCalibration?.timeCertaintyScore ?? summary?.timeCertaintyScore ?? null,
    confluenceLevel: ab.transitWindows?.confluence?.level ?? summary?.confluenceLevel ?? null,
    yogasShort: Array.isArray(ab.yogas) ? ab.yogas.slice(0, 8) : null,
    challengedPlanets: ab.challengedPlanets?.slice?.(0, 4) || null
  };
}

/**
 * @param {object} chart — response object from generate-chart (same shape client holds).
 * @returns {object} concise JSON for model context
 */
function formatChartForGemini(chart) {
  if (!chart || typeof chart !== 'object') {
    return { error: 'invalid_chart' };
  }

  const cw = careerSlice(chart.careerWealth);
  const ab = astroBrainSlice(chart.astroBrain);

  return {
    meta: {
      schemaVersion: 1,
      engineNote:
        'Derived from GrahaPath calculation pipeline (sidereal Lahiri, whole-sign houses unless noted).'
    },
    native: {
      name: chart.name || null,
      birthLocal: chart.localDateTime || null,
      place: chart.place || null,
      timezone: chart.timezone || null
    },
    angles: {
      lagnaSign: chart.ascendant || null,
      lagnaDegree: Number.isFinite(Number(chart.ascendantDegree)) ? Number(chart.ascendantDegree) : null,
      moonSign: chart.moonSign || null,
      sunSign: chart.sunSign || null
    },
    vimshottariNow: vimNowFromChart(chart),
    planets: planetAbbrev(chart.planets),
    astroBrain: ab,
    careerWealth: cw,
    calibration: chart.timeCalibration
      ? {
          timeCertaintyScore: chart.timeCalibration.timeCertaintyScore ?? null
        }
      : null,
    predictionQuality: chart.predictionQuality?.overallQuality?.score
      ? { overallScore: chart.predictionQuality.overallQuality.score }
      : null
  };
}

/**
 * Tiny JSON for greeting only — minimizes free-tier input tokens (full chart stays on chat turns).
 */
function formatChartForGeminiBrief(chart) {
  if (!chart || typeof chart !== 'object') {
    return { error: 'invalid_chart' };
  }
  const moon = (chart.planets || []).find((p) => p && p.name === 'Moon');
  const planetsTiny = (chart.planets || [])
    .filter((p) => p && p.name)
    .map((p) => ({ n: p.name, h: p.house, sign: p.sign }));

  return {
    scope: 'greeting_snippet_only',
    name: chart.name || null,
    lagnaSign: chart.ascendant || null,
    lagnaDegree: Number.isFinite(Number(chart.ascendantDegree)) ? Number(chart.ascendantDegree) : null,
    moonSign: chart.moonSign || null,
    sunSign: chart.sunSign || null,
    moonDegree: Number.isFinite(Number(moon?.degree)) ? Number(moon.degree) : null,
    moonNakshatra: moon?.nakshatra ?? null,
    vimshottariNow: vimNowFromChart(chart),
    planetsAbbrev: planetsTiny
  };
}

/**
 * Route user wording to which chart slices matter most — smaller payloads for chat turns.
 */
function inferIntentFromMessage(text) {
  const t = String(text || '').toLowerCase();
  if (/career|job|profession|work|business|tenth\s*house|10th\s*house|karma\b|promotion|employ/i.test(t)) {
    return 'career';
  }
  if (/money|wealth|finance|income|salary|debt|eleventh|11th|second\s*house|2nd\s*house|dhana|savings|profit/i.test(t)) {
    return 'wealth';
  }
  if (/marriage|spouse|partner|love|relationship|venus|seventh|7th|romance/i.test(t)) {
    return 'relationship';
  }
  if (/health|illness|disease|sixth\s*house|6th\s*house|eighth\s*house|8th\s*house|longevity|hospital/i.test(t)) {
    return 'health';
  }
  if (/spiritual|dharma|meditation|ketu|jupiter|ninth\s*house|9th|twelfth\s*house|12th|moksha/i.test(t)) {
    return 'spiritual';
  }
  return 'general';
}

function planetsInHouses(planets, houseNums) {
  const set = new Set(houseNums);
  return planetAbbrev((planets || []).filter((p) => p && set.has(p.house)));
}

function planetsNamed(planets, names) {
  const set = new Set(names);
  return planetAbbrev((planets || []).filter((p) => p && set.has(p.name)));
}

function summaryForGemini(chart) {
  const ab = chart?.astroBrain;
  const raw = ab?.summary;
  if (raw == null) return null;
  if (typeof raw === 'string') return truncateText(raw, 420);
  try {
    return truncateText(JSON.stringify(raw), 420);
  } catch {
    return null;
  }
}

function dominantPlanetsShort(chart) {
  const ab = chart?.astroBrain;
  const d = ab?.dominantPlanets;
  if (!Array.isArray(d) || !d.length) return null;
  return d.slice(0, 4).map((x) => {
    if (typeof x === 'string') return truncateText(x, 48);
    const label = x?.planet || x?.name || x?.graha;
    if (label) return truncateText(String(label), 48);
    return truncateText(JSON.stringify(x), 64);
  });
}

function challengedShort(chart) {
  const ab = chart?.astroBrain;
  const d = ab?.challengedPlanets;
  if (!Array.isArray(d) || !d.length) return null;
  return d.slice(0, 3).map((x) => (typeof x === 'string' ? truncateText(x, 48) : truncateText(JSON.stringify(x), 80)));
}

function remedyContextFromChart(chart) {
  const rm = chart?.remedyMapping;
  if (!rm || typeof rm !== 'object') return null;
  const prioritized = Array.isArray(rm.prioritizedPlanets) ? rm.prioritizedPlanets.slice(0, 4) : [];
  const shadbala = Array.isArray(rm.fromShadbala)
    ? rm.fromShadbala.slice(0, 3).map((x) => ({
        p: x.planet || null,
        s: Number.isFinite(Number(x.strengthHint)) ? Number(x.strengthHint) : null
      }))
    : [];
  const sav = Array.isArray(rm.fromWeakestSavHouses)
    ? rm.fromWeakestSavHouses.slice(0, 3).map((x) => ({
        h: Number.isFinite(Number(x.house)) ? Number(x.house) : null,
        l: x.signLordUsed || null
      }))
    : [];
  return {
    p: prioritized,
    sb: shadbala,
    sv: sav,
    syn: truncateText(String(rm.synthesis || ''), 280)
  };
}

/**
 * Compact chart JSON for chat — avoids huge astroBrain blobs (TPM / 429 on free tier).
 * @param {object} chart
 * @param {string} userMessage
 */
function formatChartForGeminiForIntent(chart, userMessage) {
  if (!chart || typeof chart !== 'object') {
    return { error: 'invalid_chart' };
  }

  const intent = inferIntentFromMessage(userMessage);
  const vim = vimNowFromChart(chart);
  const sum = summaryForGemini(chart);

  const core = {
    _: 'gp_chat',
    i: intent,
    nm: firstNameOnly(chart),
    L: chart.ascendant || null,
    LD: Number.isFinite(Number(chart.ascendantDegree)) ? Number(chart.ascendantDegree) : null,
    M: chart.moonSign || null,
    S: chart.sunSign || null,
    v: { md: vim.mahadasha, ad: vim.antardasha, pt: vim.pratyantar },
    p: planetsCompact(chart),
    rm: remedyContextFromChart(chart),
    gm: buildGemstoneContext(chart, userMessage)
  };

  const abPack = {
    sum,
    dom: dominantPlanetsShort(chart),
    chal: challengedShort(chart),
    y: yogasTiny(chart?.astroBrain, 4)
  };

  switch (intent) {
    case 'career':
      return {
        ...core,
        cw: careerSliceTight(chart.careerWealth),
        ab: { sum: abPack.sum, y: yogasTiny(chart?.astroBrain, 3), dom: abPack.dom }
      };
    case 'wealth':
      return {
        ...core,
        cw: careerSliceTight(chart.careerWealth),
        w2: planetsCompactRows(planetsInHouses(chart.planets, [2, 11])),
        ab: { sum: abPack.sum, y: yogasTiny(chart?.astroBrain, 3) }
      };
    case 'relationship':
      return {
        ...core,
        rel: planetsCompactRows(planetsNamed(chart.planets, ['Moon', 'Venus', 'Mars', 'Jupiter'])),
        ab: { sum: abPack.sum, y: yogasTiny(chart?.astroBrain, 3) }
      };
    case 'health':
      return {
        ...core,
        h68: planetsCompactRows(planetsInHouses(chart.planets, [6, 8])),
        ab: { sum: abPack.sum, chal: abPack.chal, y: yogasTiny(chart?.astroBrain, 2) }
      };
    case 'spiritual':
      return {
        ...core,
        sp: planetsCompactRows(planetsNamed(chart.planets, ['Jupiter', 'Ketu', 'Sun', 'Moon'])),
        ab: { sum: abPack.sum, y: yogasTiny(chart?.astroBrain, 4) }
      };
    default:
      return {
        ...core,
        cw: careerSliceTight(chart.careerWealth),
        ab: { sum: abPack.sum, dom: abPack.dom, y: abPack.y },
        tcs: chart.timeCalibration?.timeCertaintyScore ?? chart?.astroBrain?.timeCalibration?.timeCertaintyScore ?? null
      };
  }
}

/**
 * Ultra-light context used only when normal chat generation fails repeatedly (often 429).
 * Keeps the few fields needed for a useful answer while minimizing input tokens.
 * @param {object} chart
 * @param {string} userMessage
 */
function formatChartForGeminiRescue(chart, userMessage) {
  if (!chart || typeof chart !== 'object') {
    return { error: 'invalid_chart' };
  }
  const intent = inferIntentFromMessage(userMessage);
  const vim = vimNowFromChart(chart);
  return {
    _: 'gp_chat_rescue',
    i: intent,
    nm: firstNameOnly(chart),
    L: chart.ascendant || null,
    M: chart.moonSign || null,
    S: chart.sunSign || null,
    v: { md: vim.mahadasha, ad: vim.antardasha },
    p: planetsCompactLimited(chart, 7),
    sum: summaryForGemini(chart)
  };
}

/** @param {{ name?: string, house?: number|null, sign?: string|null, nakshatra?: string|null }[]} rows */
function planetsCompactRows(rows) {
  return (rows || []).map((p) => ({
    n: p.name,
    h: p.house ?? null,
    z: p.sign || null,
    nk: p.nakshatra || null
  }));
}

module.exports = {
  formatChartForGemini,
  formatChartForGeminiBrief,
  formatChartForGreetingGemini,
  formatChartForGeminiForIntent,
  formatChartForGeminiRescue,
  inferIntentFromMessage,
  vimNowFromChart,
  firstNameOnly,
  planetsCompact,
  planetsCompactRows,
  planetsInHouses,
  planetsNamed,
  careerSliceTight,
  dominantPlanetsShort,
  challengedShort,
  summaryForGemini,
  remedyContextFromChart,
  yogasTiny
};
