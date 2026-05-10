const STHANA_BASE = {
  exalted: 1,
  own: 0.86,
  friendly: 0.68,
  neutral: 0.52,
  enemy: 0.36,
  debilitated: 0.14,
  shadow: 0.5
};

const DIRECTIONAL_TARGET = {
  Sun: 10,
  Mars: 10,
  Moon: 4,
  Venus: 4,
  Saturn: 7,
  Jupiter: 1,
  Mercury: 1,
  Rahu: 10,
  Ketu: 4
};

const NATURAL_BALA = {
  Sun: 0.7,
  Moon: 0.7,
  Mars: 0.6,
  Mercury: 0.55,
  Jupiter: 0.65,
  Venus: 0.6,
  Saturn: 0.62,
  Rahu: 0.5,
  Ketu: 0.5
};

const MAX_SPEED = {
  Sun: 1.2,
  Moon: 15,
  Mars: 1.0,
  Mercury: 2.2,
  Jupiter: 0.25,
  Venus: 1.3,
  Saturn: 0.14,
  Rahu: 0.08,
  Ketu: 0.08
};

const BENEFICS = new Set(['Jupiter', 'Venus', 'Mercury', 'Moon']);
const MALEFICS = new Set(['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu']);

function norm360(value) {
  return ((value % 360) + 360) % 360;
}

function angDist(a, b) {
  const diff = Math.abs(norm360(a || 0) - norm360(b || 0));
  return diff > 180 ? 360 - diff : diff;
}

function pakshaBala(planet, moon, sun) {
  if (planet !== 'Moon') return 0.6;
  if (!moon || !sun) return 0.6;
  const phase = angDist(moon.absoluteDegree, sun.absoluteDegree);
  return 0.35 + 0.65 * (phase / 180);
}

function proximityScore(house, target) {
  if (!Number.isFinite(house) || !Number.isFinite(target)) return 0.5;
  const diff = Math.abs(house - target);
  const wrapped = Math.min(diff, 12 - diff);
  return Math.max(0.15, 1 - wrapped / 6);
}

function dayNightScore(planet, localDateTime) {
  const hour = Number(String(localDateTime || '').slice(11, 13));
  if (!Number.isFinite(hour)) return 0.5;
  const isDay = hour >= 6 && hour < 18;
  if (['Sun', 'Jupiter', 'Saturn'].includes(planet)) return isDay ? 0.72 : 0.52;
  if (['Moon', 'Venus'].includes(planet)) return isDay ? 0.54 : 0.72;
  return 0.6;
}

function chestaScore(planet, speed) {
  const max = MAX_SPEED[planet] || 1;
  const abs = Math.abs(Number(speed) || 0);
  return Math.max(0.15, Math.min(1, abs / max));
}

function drikScore(planet, grahaProfiles = []) {
  const self = (grahaProfiles || []).find((g) => g.planet === planet);
  if (!self || !Number.isFinite(self.absoluteDegree)) return 0.55;
  let score = 0.55;
  (grahaProfiles || []).forEach((other) => {
    if (other.planet === planet || !Number.isFinite(other.absoluteDegree)) return;
    const d = angDist(self.absoluteDegree, other.absoluteDegree);
    const hit = Math.min(
      Math.abs(d - 0),
      Math.abs(d - 60),
      Math.abs(d - 90),
      Math.abs(d - 120),
      Math.abs(d - 180)
    );
    if (hit <= 5) {
      if (BENEFICS.has(other.planet)) score += 0.04;
      if (MALEFICS.has(other.planet)) score -= 0.035;
    }
  });
  return Math.max(0.15, Math.min(1, score));
}

function computeShadbala(grahaProfiles = [], chartPayload = {}) {
  const moon = (grahaProfiles || []).find((g) => g.planet === 'Moon');
  const sun = (grahaProfiles || []).find((g) => g.planet === 'Sun');
  const scores = (grahaProfiles || []).map((g) => {
    const sthana = STHANA_BASE[g.dignity] ?? 0.5;
    const dig = proximityScore(g.house, DIRECTIONAL_TARGET[g.planet]);
    const kala = (dayNightScore(g.planet, chartPayload.localDateTime) + pakshaBala(g.planet, moon, sun)) / 2;
    const naisargika = NATURAL_BALA[g.planet] ?? 0.5;
    const drikApprox = drikScore(g.planet, grahaProfiles);
    const chestaApprox = chestaScore(g.planet, g.speed);

    const normalized =
      0.27 * sthana +
      0.2 * dig +
      0.16 * kala +
      0.14 * naisargika +
      0.13 * drikApprox +
      0.1 * chestaApprox;

    return {
      planet: g.planet,
      normalizedScore: Number(normalized.toFixed(3)),
      components: {
        sthana: Number(sthana.toFixed(3)),
        dig: Number(dig.toFixed(3)),
        kala: Number(kala.toFixed(3)),
        naisargika: Number(naisargika.toFixed(3)),
        drikApprox: Number(drikApprox.toFixed(3)),
        chestaApprox: Number(chestaApprox.toFixed(3))
      },
      caveat:
        'Shadbala v1 is an approximation layer. Use as weighted support, with structural score fallback retained.'
    };
  });

  return {
    version: 'v2_semi_classical',
    scores,
    caveat:
      'This is an incremental Shadbala implementation for calibration. Full classical computation remains a planned upgrade.'
  };
}

module.exports = {
  computeShadbala
};

