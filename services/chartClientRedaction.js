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
function applyClientChartAccess(chart) {
  if (!chart || typeof chart !== 'object') return chart;

  if (deepDataPublicEnabled()) {
    chart.access = { deepData: true, tier: 'full' };
    return chart;
  }

  chart.access = { deepData: false, tier: 'basic' };

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
  applyClientChartAccess
};
