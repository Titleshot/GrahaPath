/**
 * Product-facing "how much can we trust house-level timing" — not a medical/legal score.
 */
function buildTimeCalibration(chartPayload = {}, transitsNow = null) {
  const timeKnown = chartPayload?.timeInputMode !== 'unknown_assumed_noon';
  const exactLoc = chartPayload?.locationInputMode === 'exact_coordinates';
  const planets = transitsNow?.planets || [];

  let disagreement = 0;
  planets.forEach((p) => {
    if (
      p.houseWholeSign != null &&
      p.houseBhavaChalit != null &&
      Number.isFinite(p.houseWholeSign) &&
      Number.isFinite(p.houseBhavaChalit) &&
      p.houseWholeSign !== p.houseBhavaChalit
    ) {
      disagreement += 1;
    }
  });

  const total = planets.length || 1;
  const agreementRatio = 1 - disagreement / total;

  let score = 0;
  score += timeKnown ? 48 : 18;
  score += exactLoc ? 12 : 6;
  score += agreementRatio * 32;
  if (planets.some((p) => p.houseBhavaChalit != null)) {
    score += 4;
  }

  return {
    timeCertaintyScore: Math.round(Math.min(100, score)),
    components: {
      birthTimeTreatedAsExact: timeKnown,
      locationPrecision: exactLoc ? 'exact_coordinates' : 'place_geocoded',
      transitHouseAgreementRatio: Number(agreementRatio.toFixed(3)),
      transitHouseDisagreementCount: disagreement,
      transitPlanetsCompared: planets.length
    },
    wholeSignVsBhava: {
      comparedPlanets: planets.length,
      houseDisagreements: disagreement,
      interpretation:
        disagreement > 0
          ? 'Current transit snapshot: whole-sign vs bhāva-chalit houses differ for one or more grahas — prioritize broader themes until birth time is tightened.'
          : 'Whole-sign and bhāva-chalit transit houses match for all sampled grahas in this snapshot.'
    }
  };
}

module.exports = {
  buildTimeCalibration
};
