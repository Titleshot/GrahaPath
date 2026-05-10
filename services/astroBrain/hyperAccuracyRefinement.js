const { NAKSHATRA_NAMES, VIMSHOTTARI_ORDER } = require('./constants');

const DUSTHANA = new Set([6, 8, 12]);

/**
 * Vimshottari sequence: nakshatra index maps to repeating 9-lord cycle.
 */
function nakshatraLordFromName(nakName) {
  if (!nakName) return null;
  const i = NAKSHATRA_NAMES.indexOf(nakName);
  if (i < 0) return null;
  return VIMSHOTTARI_ORDER[i % 9] || null;
}

/** Simplified natural enmity (graha–graha), for nakshatra-lord tension checks. */
function areNaturalEnemies(a, b) {
  if (!a || !b || a === b) return false;
  const table = {
    Sun: new Set(['Saturn', 'Venus']),
    Moon: new Set(['Rahu']),
    Mars: new Set(['Mercury']),
    Mercury: new Set(['Mars', 'Moon']),
    Jupiter: new Set(['Mercury', 'Venus']),
    Venus: new Set(['Sun', 'Moon']),
    Saturn: new Set(['Sun', 'Mars', 'Mercury'])
  };
  return (table[a]?.has(b) || table[b]?.has(a)) === true;
}

/**
 * @returns {Array<{ planet: string, penalty: number, reasons: string[] }>}
 */
function buildNakshatraDispositorPenalties(grahaProfiles = []) {
  const out = [];
  for (const g of grahaProfiles || []) {
    if (!g?.planet) continue;

    const lord = nakshatraLordFromName(g.nakshatra);
    const reasons = [];
    let penalty = 0;

    if (lord && areNaturalEnemies(g.planet, lord)) {
      penalty -= 1.05;
      reasons.push(`Nakshatra lord ${lord} is classically tense with ${g.planet}`);
    }

    const lordG = (grahaProfiles || []).find((x) => x.planet === lord);
    if (lordG && Number.isFinite(lordG.house) && DUSTHANA.has(lordG.house)) {
      penalty -= 0.85;
      reasons.push(`Nakshatra lord ${lord} sits in dusthana house ${lordG.house}`);
    }

    if (penalty !== 0) {
      out.push({ planet: g.planet, penalty, reasons });
    }
  }
  return out;
}

module.exports = {
  nakshatraLordFromName,
  areNaturalEnemies,
  buildNakshatraDispositorPenalties
};
