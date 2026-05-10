function sumAbsolute(scores = []) {
  return scores.reduce((s, x) => s + Math.abs(Number(x?.totalScore) || 0), 0);
}

function arbitrateSignals({ strength, ashtakavarga, shadbala, argala, planetState }) {
  const dominant = strength?.dominantPlanets || [];
  const challenged = strength?.challengedPlanets || [];
  const overlap = dominant
    .map((d) => d.planet)
    .filter((p) => challenged.map((c) => c.planet).includes(p));

  const sav = ashtakavarga?.luckOpportunity?.averageScore || 0;
  const shadbalaAvg = ((shadbala?.scores || []).reduce((s, x) => s + (x.normalizedScore || 0), 0) /
    ((shadbala?.scores || []).length || 1));
  const obstacleCount = (argala?.obstacles || []).length;
  const supportCount = (argala?.support || []).length;
  const combustCount = (planetState?.combustPlanets || []).length;

  const conflictIndex =
    (overlap.length ? 0.35 : 0) +
    (obstacleCount > supportCount ? 0.2 : 0) +
    (combustCount > 0 ? 0.15 : 0) +
    (sav < 26 ? 0.15 : 0) +
    (shadbalaAvg < 0.5 ? 0.15 : 0);

  const mode = conflictIndex >= 0.6 ? 'conservative' : conflictIndex >= 0.35 ? 'balanced' : 'direct';

  return {
    mode,
    conflictIndex: Number(conflictIndex.toFixed(3)),
    overlapPlanets: overlap,
    reasoning: {
      dominantStrengthMass: Number(sumAbsolute(dominant).toFixed(2)),
      challengedStrengthMass: Number(sumAbsolute(challenged).toFixed(2)),
      savAverage: Number(sav.toFixed(2)),
      shadbalaAverage: Number(shadbalaAvg.toFixed(3)),
      argalaSupportCount: supportCount,
      argalaObstacleCount: obstacleCount,
      combustCount
    },
    note:
      mode === 'conservative'
        ? 'Signals are mixed; downstream narrative should soften confidence and prioritize cautionary phrasing.'
        : mode === 'balanced'
          ? 'Signals are partially mixed; downstream narrative should keep moderate confidence with explicit evidence.'
          : 'Signals are relatively aligned; direct phrasing can be used where evidence is strong.'
  };
}

module.exports = {
  arbitrateSignals
};

