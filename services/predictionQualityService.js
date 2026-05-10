function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function asScore01(value, min, max) {
  if (!Number.isFinite(value)) return 0;
  if (max <= min) return 0;
  return clamp01((value - min) / (max - min));
}

function confidenceToScore(confidence) {
  if (confidence === 'high') return 0.95;
  if (confidence === 'medium') return 0.72;
  return 0.45;
}

function buildInputConfidence(chart = {}) {
  const mode = chart?.locationInputMode === 'exact_coordinates' ? 'high' : 'medium';
  const timeKnown = chart?.timeInputMode !== 'unknown_assumed_noon';
  const effective = timeKnown ? mode : 'low';
  const score = confidenceToScore(effective);
  return {
    score: Math.round(score * 100),
    level: effective,
    note: timeKnown
      ? effective === 'high'
        ? 'Exact coordinates and birth time support high-confidence chart structure.'
        : 'Place geocoding with known time supports medium input confidence.'
      : 'Birth time is unknown, so interpretation reliability is reduced for house-level precision.'
  };
}

function buildLogicDepthScore(chart = {}) {
  const brain = chart?.astroBrain || {};
  const aspects = (brain.aspects || []).length;
  const interactions = (brain.interactionPatterns || []).length;
  const yogas = (brain.yogas || []).length;
  const causalCount = (brain.causalInsights?.insights || []).length;

  const normalized =
    0.32 * asScore01(aspects, 2, 18) +
    0.24 * asScore01(interactions, 1, 8) +
    0.16 * asScore01(yogas, 1, 8) +
    0.28 * asScore01(causalCount, 2, 7);

  return {
    score: Math.round(normalized * 100),
    note: `Built from ${aspects} aspects, ${interactions} interaction patterns, ${yogas} yogas, and ${causalCount} causal insights.`
  };
}

function buildTimingStrengthScore(chart = {}) {
  const dasha = chart?.astroBrain?.currentDasha;
  const antardasha = chart?.astroBrain?.currentAntardasha;
  const hasCurrent = Boolean(dasha?.planet);
  const hasSub = Boolean(antardasha?.antarLord);
  const timelineDepth = Array.isArray(dasha?.antardasha) ? dasha.antardasha.length : 0;

  const normalized =
    0.45 * (hasCurrent ? 1 : 0) +
    0.35 * (hasSub ? 1 : 0) +
    0.2 * asScore01(timelineDepth, 2, 9);

  return {
    score: Math.round(normalized * 100),
    note: hasCurrent
      ? hasSub
        ? 'Mahadasha and Antardasha are both active in timing analysis.'
        : 'Mahadasha is active; Antardasha detail is limited.'
      : 'Timing context is limited because current dasha could not be resolved.'
  };
}

function buildPersonalizationScore(chart = {}) {
  const brain = chart?.astroBrain || {};
  const planets = chart?.planets || [];
  const dominant = (brain.dominantPlanets || []).length;
  const challenged = (brain.challengedPlanets || []).length;
  const strongAspects = (brain.aspects || []).filter((a) => a.strength === 'strong').length;
  const distinctPadas = new Set(planets.map((p) => p.nakshatraPada).filter((p) => Number.isFinite(p))).size;
  const futureSections = Object.values(brain.futureSections || {}).length;

  const normalized =
    0.22 * asScore01(dominant + challenged, 2, 7) +
    0.25 * asScore01(strongAspects, 1, 8) +
    0.23 * asScore01(distinctPadas, 2, 4) +
    0.3 * asScore01(futureSections, 2, 5);

  return {
    score: Math.round(normalized * 100),
    note: `Uses ${strongAspects} strong aspects, ${distinctPadas} pada signatures, and ${futureSections} tailored future sections.`
  };
}

/**
 * Sarvashtakavarga (SAV) structural signal: spread + key-house density + low flatness.
 * Calibration bands default to regression gate (min spread 6) + typical fractional-SAV key averages (~26–36).
 * Override with env: SAV_PQ_SPREAD_MIN, SAV_PQ_SPREAD_MAX, SAV_PQ_KEY_AVG_MIN, SAV_PQ_KEY_AVG_MAX, SAV_PQ_CV_MIN, SAV_PQ_CV_MAX.
 */
function buildAshtakavargaSavScore(chart = {}) {
  const spreadMin = Number(process.env.SAV_PQ_SPREAD_MIN || 6);
  const spreadMax = Number(process.env.SAV_PQ_SPREAD_MAX || 20);
  const keyMin = Number(process.env.SAV_PQ_KEY_AVG_MIN || 25);
  const keyMax = Number(process.env.SAV_PQ_KEY_AVG_MAX || 36);
  const cvMin = Number(process.env.SAV_PQ_CV_MIN || 0.042);
  const cvMax = Number(process.env.SAV_PQ_CV_MAX || 0.128);

  const av = chart?.astroBrain?.ashtakavarga;
  const sav = av?.sarvashtakavarga;
  if (!sav || typeof sav !== 'object') {
    return {
      score: 0,
      note: 'Sarvashtakavarga not available on this chart payload.',
      metrics: null
    };
  }

  const vals = Object.values(sav)
    .map(Number)
    .filter((v) => Number.isFinite(v));
  if (vals.length < 6) {
    return {
      score: 0,
      note: 'SAV house vector incomplete.',
      metrics: { houseCount: vals.length }
    };
  }

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const spread = max - min;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  const keyAvg = Number(av?.luckOpportunity?.averageScore || 0);
  const keyFromAv =
    Number.isFinite(keyAvg) && keyAvg > 0
      ? keyAvg
      : [2, 9, 10, 11].reduce((s, h) => s + (Number(sav[h]) || 0), 0) / 4;

  const normalized =
    0.38 * asScore01(spread, spreadMin, spreadMax) +
    0.37 * asScore01(keyFromAv, keyMin, keyMax) +
    0.25 * asScore01(cv, cvMin, cvMax);

  return {
    score: Math.round(normalized * 100),
    note: `SAV spread ${spread.toFixed(1)}, key-area avg ${keyFromAv.toFixed(1)}, relative variance ${cv.toFixed(3)} (bands: spread ${spreadMin}–${spreadMax}, key ${keyMin}–${keyMax}).`,
    metrics: {
      savSpread: Number(spread.toFixed(2)),
      savMean: Number(mean.toFixed(2)),
      savCoefficientOfVariation: Number(cv.toFixed(3)),
      keyHouseAverage: Number(keyFromAv.toFixed(2)),
      luckLevel: av?.luckOpportunity?.level || null,
      calibration: { spreadMin, spreadMax, keyMin, keyMax, cvMin, cvMax }
    }
  };
}

function buildOverallQuality(components) {
  const w = {
    input: 0.2,
    logic: 0.22,
    timing: 0.16,
    personalization: 0.2,
    sav: 0.22
  };
  const overall =
    w.input * (components.inputConfidence?.score || 0) +
    w.logic * (components.logicDepthScore?.score || 0) +
    w.timing * (components.timingStrengthScore?.score || 0) +
    w.personalization * (components.personalizationScore?.score || 0) +
    w.sav * (components.ashtakavargaSavScore?.score || 0);

  return {
    score: Math.round(overall),
    weights: w,
    note: 'Composite blends input confidence, logic depth, timing, personalization, and SAV structural weighting.'
  };
}

function buildPredictionQuality(chart = {}) {
  const inputConfidence = buildInputConfidence(chart);
  const logicDepthScore = buildLogicDepthScore(chart);
  const timingStrengthScore = buildTimingStrengthScore(chart);
  const personalizationScore = buildPersonalizationScore(chart);
  const ashtakavargaSavScore = buildAshtakavargaSavScore(chart);

  return {
    inputConfidence,
    logicDepthScore,
    timingStrengthScore,
    personalizationScore,
    ashtakavargaSavScore,
    overallQuality: buildOverallQuality({
      inputConfidence,
      logicDepthScore,
      timingStrengthScore,
      personalizationScore,
      ashtakavargaSavScore
    })
  };
}

const LIFE_EVENT_PQ_BOOST_CAP = Number(process.env.LIFE_EVENT_PQ_BOOST_CAP || 6);
const LIFE_EVENT_PQ_BOOST_THRESHOLD = Number(process.env.LIFE_EVENT_PQ_BOOST_THRESHOLD || 0.62);

/**
 * After `chart.lifeEventVerification` is attached, nudge overall quality + surface a soft mismatch line.
 */
function adjustPredictionQualityWithLifeEvents(chart = {}) {
  const pq = chart.predictionQuality;
  const lev = chart.lifeEventVerification;
  if (!pq?.overallQuality || !lev || !Number.isFinite(lev.aggregateScore01)) {
    return;
  }

  const agg = lev.aggregateScore01;
  const n = Number(lev.validEventCount || 0);
  const base = pq.overallQuality.score;

  pq.overallQuality.scoreBeforeLifeEventAdjustment = base;

  if (lev.softMismatch && n >= 2) {
    pq.lifeEventRectificationHint =
      'Your life events suggest a slight shift in birth time might provide more accurate insights—patterns at those dates line up weakly with dasha + transit context for this chart.';
  }

  if (n >= 2 && agg >= LIFE_EVENT_PQ_BOOST_THRESHOLD && lev.verificationBadge === 'verified') {
    const headroom = LIFE_EVENT_PQ_BOOST_CAP;
    const boost = Math.min(headroom, Math.max(2, Math.round((agg - LIFE_EVENT_PQ_BOOST_THRESHOLD) * 22)));
    const next = Math.min(100, base + boost);
    pq.overallQuality.score = next;
    pq.overallQuality.lifeEventVerificationBoost = boost;
    pq.overallQuality.note = `${pq.overallQuality.note} Life-event verification added +${boost} (capped) because dated milestones align with dasha/transit structure.`;
  }
}

module.exports = {
  buildPredictionQuality,
  buildAshtakavargaSavScore,
  buildOverallQuality,
  adjustPredictionQualityWithLifeEvents
};

