function angularDistance(a, b) {
  const diff = Math.abs((a || 0) - (b || 0));
  return diff > 180 ? 360 - diff : diff;
}

const COMBUST_ORB = {
  Moon: 12,
  Mars: 17,
  Mercury: 14,
  Jupiter: 11,
  Venus: 10,
  Saturn: 15
};

function buildPlanetStateLayer(planets = []) {
  const sun = (planets || []).find((p) => p.name === 'Sun');
  const states = (planets || []).map((p) => {
    const retrograde = p.retrograde === true;
    const orb = COMBUST_ORB[p.name] || null;
    const distanceFromSun = sun ? angularDistance(p.absoluteDegree, sun.absoluteDegree) : null;
    const combust = orb != null && Number.isFinite(distanceFromSun) ? distanceFromSun <= orb : false;
    return {
      planet: p.name,
      retrograde,
      combust,
      distanceFromSun: Number.isFinite(distanceFromSun) ? Number(distanceFromSun.toFixed(3)) : null
    };
  });

  return {
    states,
    retrogradePlanets: states.filter((s) => s.retrograde).map((s) => s.planet),
    combustPlanets: states.filter((s) => s.combust).map((s) => s.planet),
    caveat:
      'Combustion uses Sun angular proximity thresholds; retrograde uses planetary speed sign from ephemeris.'
  };
}

module.exports = {
  buildPlanetStateLayer
};

