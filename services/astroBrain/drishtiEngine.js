const SPECIAL_DRISHTI = {
  Mars: [4, 7, 8],
  Jupiter: [5, 7, 9],
  Saturn: [3, 7, 10]
};

function houseDistance(fromHouse, toHouse) {
  if (!Number.isFinite(fromHouse) || !Number.isFinite(toHouse)) return null;
  return ((toHouse - fromHouse + 12) % 12) + 1;
}

function drishtiHousesForPlanet(planetName) {
  if (planetName === 'Rahu' || planetName === 'Ketu') {
    // Commonly used parampara approximation in many modern tools.
    return [5, 7, 9];
  }
  return SPECIAL_DRISHTI[planetName] || [7];
}

function detectGrahaDrishti(grahaProfiles = []) {
  const rows = (grahaProfiles || []).filter((g) => Number.isFinite(g.house));
  const drishtiLinks = [];

  for (let i = 0; i < rows.length; i += 1) {
    for (let j = 0; j < rows.length; j += 1) {
      if (i === j) continue;
      const source = rows[i];
      const target = rows[j];
      const distance = houseDistance(source.house, target.house);
      const allowed = drishtiHousesForPlanet(source.planet);
      if (allowed.includes(distance)) {
        drishtiLinks.push({
          from: source.planet,
          to: target.planet,
          fromHouse: source.house,
          toHouse: target.house,
          drishtiDistance: distance,
          rule: `${source.planet} aspects ${distance}th from itself`
        });
      }
    }
  }

  return { drishtiLinks };
}

module.exports = {
  detectGrahaDrishti,
  drishtiHousesForPlanet
};

