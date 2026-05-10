/**
 * Blends Sarvashtakavarga (house reinforcement), mean Shadbala of occupants,
 * and argala balance into a single 0–1 "net resultant" hint per house.
 * All outputs are guarded against NaN / undefined.
 */

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildHouseNetForce({ planets = [], shadbala = {}, sarvashtakavarga = {}, argala = {} }) {
  const sav = sarvashtakavarga && typeof sarvashtakavarga === 'object' ? sarvashtakavarga : {};
  const rawSav = [];
  for (let h = 1; h <= 12; h += 1) {
    rawSav.push(safeNum(sav[h], NaN));
  }
  const finiteSav = rawSav.filter((v) => Number.isFinite(v));
  const minV = finiteSav.length ? Math.min(...finiteSav) : 0;
  const maxV = finiteSav.length ? Math.max(...finiteSav) : 1;
  const range = Math.max(1e-6, maxV - minV);

  const scoresByPlanet = new Map(
    (shadbala.scores || [])
      .filter((s) => s && s.planet)
      .map((s) => [s.planet, clamp01(safeNum(s.normalizedScore, 0.5))])
  );

  const houses = [];
  for (let house = 1; house <= 12; house += 1) {
    const savRaw = safeNum(sav[house], 0);
    const savNorm = clamp01((savRaw - minV) / range);

    const occupants = (planets || []).filter((p) => p && p.house === house && p.name);
    let balaSum = 0;
    let balaN = 0;
    occupants.forEach((p) => {
      const sc = scoresByPlanet.get(p.name);
      if (sc !== undefined) {
        balaSum += sc;
        balaN += 1;
      }
    });
    const balaNorm = balaN > 0 ? clamp01(balaSum / balaN) : 0.5;

    let argalaNet = 0;
    occupants.forEach((p) => {
      const sup = (argala.support || []).filter((x) => x && x.target === p.name).length;
      const obs = (argala.obstacles || []).filter((x) => x && x.target === p.name).length;
      argalaNet += sup - obs;
    });
    const argalaNorm = clamp01((argalaNet + 4) / 8);

    const netForce01 = clamp01(0.34 * savNorm + 0.41 * balaNorm + 0.25 * argalaNorm);

    houses.push({
      house,
      netForce: Number(netForce01.toFixed(4)),
      components: {
        savRaw: Number(savRaw.toFixed(3)),
        savNormalized: Number(savNorm.toFixed(4)),
        shadbalaAvgInHouse: balaN ? Number((balaSum / balaN).toFixed(4)) : null,
        shadbalaNorm: Number(balaNorm.toFixed(4)),
        argalaNetRaw: argalaNet,
        argalaNorm: Number(argalaNorm.toFixed(4))
      }
    });
  }

  return {
    houses,
    weights: { sav: 0.34, shadbala: 0.41, argala: 0.25 },
    caveat:
      'Net resultant per house is a blended structural index (SAV + occupant Shadbala + argala net). It is not a fate score or guaranteed outcome.'
  };
}

module.exports = {
  buildHouseNetForce,
  safeNum,
  clamp01
};
