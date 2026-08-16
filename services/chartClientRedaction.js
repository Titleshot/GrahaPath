/**
 * Free-tier chart payload: keep whole-sign wheel + qualitative insights,
 * strip data that makes it easy to paste into external LLMs for “free” readings
 * (exact longitudes, nakṣatra, aspects / drishti, dense timing tables).
 *
 * Full payload: set GRAHAPATH_PUBLIC_DEEP_DATA=true (dev / internal only until paywall wiring exists).
 */

function deepDataPublicEnabled() {
  return process.env.GRAHAPATH_PUBLIC_DEEP_DATA === 'true';
}

function scrubAstroBrainSummary(summary) {
  if (!summary || typeof summary !== 'object') return summary;
  const next = { ...summary };
  delete next.currentMahadashaPlanet;
  delete next.currentAntardashaLord;
  delete next.currentPratyantarLord;
  return next;
}

/**
 * @param {object} chart — mutable chart from generateBirthChart pipeline
 */
function snapshotNatalCore(chart) {
  const ab = chart.astroBrain && typeof chart.astroBrain === 'object' ? chart.astroBrain : {};
  const div = ab.divisional && typeof ab.divisional === 'object' ? ab.divisional : {};
  return {
    planets: (chart.planets || []).map((p) => ({
      name: p.name,
      sign: p.sign,
      house: p.house,
      degree: p.degree,
      absoluteDegree: p.absoluteDegree,
      nakshatra: p.nakshatra,
      nakshatraPada: p.nakshatraPada,
      retrograde: p.retrograde === true
    })),
    yogas: (ab.yogas || []).slice(0, 12).map((y) => ({
      name: y.name,
      strength: y.strength,
      interpretation: y.interpretation || ''
    })),
    aspects: (ab.aspects || []).slice(0, 18).map((a) => ({
      planetA: a.planetA,
      planetB: a.planetB,
      aspectType: a.aspectType,
      orb: a.orb,
      strength: a.strength
    })),
    divisionalRows: Array.isArray(div.divisionalRows) ? div.divisionalRows : [],
    vimshottariTimeline: (ab.vimshottariTimeline || []).slice(0, 12).map((seg) => ({
      planet: seg.planet,
      startDateApprox: seg.startDateApprox,
      endDateApprox: seg.endDateApprox,
      antardasha: (seg.antardasha || []).slice(0, 9).map((a) => ({
        antarLord: a.antarLord,
        startDateApprox: a.startDateApprox,
        endDateApprox: a.endDateApprox
      }))
    })),
    currentDasha: ab.currentDasha || null,
    currentAntardasha: ab.currentAntardasha || null
  };
}

function applyClientChartAccess(chart) {
  if (!chart || typeof chart !== 'object') return chart;

  if (!chart.natalCore) {
    chart.natalCore = snapshotNatalCore(chart);
  }

  if (deepDataPublicEnabled()) {
    chart.access = { deepData: true, tier: 'full' };
    return chart;
  }

  chart.access = { deepData: false, tier: 'basic' };

  // timingCore (birth date + Moon longitude) is kept for dasha-by-age in chat — not exposed as prose.

  const ab = chart.astroBrain;
  if (ab && typeof ab === 'object') {
    chart.dashaSnapshot = {
      mahaDasha: ab.currentDasha?.planet || null,
      antarDasha: ab.currentAntardasha?.antarLord || null,
      pratyantar: ab.currentPratyantar?.pratyantarLord || null,
      startDate: ab.currentAntardasha?.startDateApprox || ab.currentDasha?.startDateApprox || null,
      endDate: ab.currentAntardasha?.endDateApprox || ab.currentDasha?.endDateApprox || null
    };
  }

  delete chart.ascendantDegree;
  delete chart.ascendantAbsoluteDegree;
  delete chart.ayanamsaDegree;
  delete chart.julianDay;
  delete chart.bhavaChalit;
  delete chart.transitsNow;
  delete chart.timeCalibration;
  delete chart.careerWealth;
  delete chart.debug;

  const planets = chart.planets;
  if (Array.isArray(planets)) {
    for (const p of planets) {
      if (!p || typeof p !== 'object') continue;
      delete p.degree;
      delete p.absoluteDegree;
      if (p.name !== 'Moon') {
        delete p.nakshatra;
      }
      delete p.nakshatraPada;
      delete p.activeBhavaHouse;
      delete p.speed;
    }
  }

  if (chart.astroBrain && typeof chart.astroBrain === 'object') {
    delete chart.astroBrain.aspects;
    delete chart.astroBrain.drishti;
    delete chart.astroBrain.panchanga;
    delete chart.astroBrain.vimshottariTimeline;
    delete chart.astroBrain.interactionPatterns;
    delete chart.astroBrain.charaKarakas;
    delete chart.astroBrain.shadbala;
    delete chart.astroBrain.divisional;
    delete chart.astroBrain.planetState;
    delete chart.astroBrain.ashtakavarga;
    delete chart.astroBrain.argala;
    delete chart.astroBrain.arbitration;
    delete chart.astroBrain.housePolicy;
    delete chart.astroBrain.methodology;
    delete chart.astroBrain.causalInsights;
    delete chart.astroBrain.futureSections;
    delete chart.astroBrain.houseNetForce;
    delete chart.astroBrain.currentDasha;
    delete chart.astroBrain.currentAntardasha;
    delete chart.astroBrain.currentPratyantar;
    delete chart.astroBrain.yogas;
    delete chart.astroBrain.transitWindows;
    delete chart.astroBrain.timeCalibration;
    delete chart.astroBrain.corePatterns;
    delete chart.astroBrain.guardrailMeta;
    delete chart.astroBrain.debug;
    if (chart.astroBrain.summary) {
      chart.astroBrain.summary = scrubAstroBrainSummary(chart.astroBrain.summary);
    }
  }

  return chart;
}

module.exports = {
  deepDataPublicEnabled,
  snapshotNatalCore,
  applyClientChartAccess
};
