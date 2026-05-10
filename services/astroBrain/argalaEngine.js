function houseDistance(fromHouse, toHouse) {
  if (!Number.isFinite(fromHouse) || !Number.isFinite(toHouse)) return null;
  return ((toHouse - fromHouse + 12) % 12) + 1;
}

function detectArgala(grahaProfiles = []) {
  const rows = (grahaProfiles || []).filter((g) => Number.isFinite(g.house));
  const support = [];
  const obstacles = [];

  rows.forEach((target) => {
    rows.forEach((source) => {
      if (target.planet === source.planet) return;
      const dist = houseDistance(target.house, source.house);
      if ([2, 4, 11, 5].includes(dist)) {
        support.push({
          target: target.planet,
          source: source.planet,
          type: 'argala',
          relativeHouse: dist,
          note: `${source.planet} gives argala to ${target.planet} from ${dist}th house.`
        });
      }
      if ([12, 10, 3, 9].includes(dist)) {
        obstacles.push({
          target: target.planet,
          source: source.planet,
          type: 'virodhargala',
          relativeHouse: dist,
          note: `${source.planet} creates virodhargala against ${target.planet} from ${dist}th house.`
        });
      }
    });
  });

  return {
    support,
    obstacles,
    caveat:
      'Argala/virodhargala layer is a structural Jyotish signal for hidden support/blockage and is used as weighting evidence.'
  };
}

module.exports = {
  detectArgala
};

