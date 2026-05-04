const {
  generateKeyInsight,
  generateLifePhases,
  generateFutureUnlockTeaser,
} = require("../services/phaseReportService");
const { generateRemedies } = require("../services/remedyService");

/**
 * Resolves the full chart payload (Swiss Ephemeris + interpretations) for a request.
 * Wire your production pipeline in `../services/vedicChartAdapter.js` — do not
 * change ephemeris math here. If no adapter is present, a mock chart is used so
 * the route stays testable in isolation.
 */
async function resolveChartResult(req) {
  try {
    const adapter = require("../services/vedicChartAdapter");
    if (typeof adapter.buildChartResultFromRequest === "function") {
      return await adapter.buildChartResultFromRequest(req);
    }
  } catch (_) {
    /* adapter optional until wired */
  }
  return mockChartResultForSmokeTest(req.body || {});
}

/** Minimal fixture only when vedicChartAdapter is absent — remove reliance once wired. */
function mockChartResultForSmokeTest(_body) {
  return {
    planets: [
      { name: "Sun", sign: "Leo", house: 5, nakshatra: "Magha" },
      { name: "Moon", sign: "Cancer", house: 4, nakshatra: "Pushya" },
      { name: "Saturn", sign: "Capricorn", house: 10, nakshatra: "Shravana" },
    ],
    ascendant: "Virgo",
    ascendantSign: "Virgo",
    moonSign: "Cancer",
    sunSign: "Leo",
    interpretation: {
      theme: "You keep building a life that can hold the part of you that still checks the locks twice.",
      psychological: "You equate care with responsibility, and that can be both a gift and a weight.",
      strength: "You show up when it matters, even when you are tired.",
      challenge: "You can mistake endurance for love, and wonder why you feel alone in the room.",
    },
  };
}

/**
 * POST /generate-chart — extends the chart JSON with `keyInsight`, `phaseInsight`,
 * `lifePhases`, `futureTeaser`, and remedy preview signals after interpretations exist.
 */
async function generateChart(req, res) {
  try {
    const chartResult = await resolveChartResult(req);
    const phaseHook = generateKeyInsight(chartResult);
    const lifePhases = generateLifePhases(chartResult);
    const futureTeaser = generateFutureUnlockTeaser(chartResult);
    const remedyPack = generateRemedies(chartResult);
    const remediesList = remedyPack.remedies || [];
    const remediesPreview = remediesList[0] || null;
    const remediesLockedCount = Math.max(0, remediesList.length - 1);
    return res.status(200).json({
      ...chartResult,
      keyInsight: phaseHook.keyInsight,
      phaseInsight: {
        headline: phaseHook.headline,
        body: phaseHook.body,
        signalsUsed: phaseHook.signalsUsed,
      },
      lifePhases: lifePhases.phases,
      futureTeaser,
      remediesPreview,
      remediesLockedCount,
    });
  } catch (err) {
    const message = err && err.message ? err.message : "Chart generation failed";
    return res.status(500).json({ error: message });
  }
}

module.exports = {
  generateChart,
  resolveChartResult,
};
