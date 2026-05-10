const ASPECTS = [
  { type: 'conjunction', angle: 0 },
  { type: 'sextile', angle: 60 },
  { type: 'square', angle: 90 },
  { type: 'trine', angle: 120 },
  { type: 'opposition', angle: 180 }
];

const LUMINARIES = new Set(['Sun', 'Moon']);

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function smallestAngularDistance(a, b) {
  const diff = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
  return diff > 180 ? 360 - diff : diff;
}

function orbLimit(planetA, planetB, aspectType) {
  if (aspectType === 'conjunction' || aspectType === 'opposition') {
    if (LUMINARIES.has(planetA) || LUMINARIES.has(planetB)) {
      return 8;
    }
    return 6;
  }
  if (aspectType === 'trine' || aspectType === 'square') {
    if (LUMINARIES.has(planetA) || LUMINARIES.has(planetB)) {
      return 7;
    }
    return 5.5;
  }
  return 4.5; // sextile
}

function aspectStrength(orb, limit) {
  const ratio = orb / limit;
  if (ratio <= 0.33) return 'strong';
  if (ratio <= 0.66) return 'moderate';
  return 'weak';
}

/**
 * Uses sidereal absolute longitudes from chart planets.
 * @param {{name: string, absoluteDegree: number}[]} planets
 */
function detectAspects(planets = []) {
  const rows = planets.filter((p) => Number.isFinite(p.absoluteDegree));
  const aspects = [];

  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      const distance = smallestAngularDistance(a.absoluteDegree, b.absoluteDegree);

      for (const aspect of ASPECTS) {
        const orb = Math.abs(distance - aspect.angle);
        const limit = orbLimit(a.name, b.name, aspect.type);
        if (orb <= limit) {
          aspects.push({
            planetA: a.name,
            planetB: b.name,
            aspectType: aspect.type,
            exactAngle: Number(distance.toFixed(4)),
            targetAngle: aspect.angle,
            orb: Number(orb.toFixed(4)),
            orbLimit: limit,
            strength: aspectStrength(orb, limit)
          });
          break;
        }
      }
    }
  }

  return { aspects };
}

module.exports = {
  detectAspects,
  smallestAngularDistance
};

