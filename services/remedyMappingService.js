const { REMEDY_LIBRARY } = require('./remedyService');
const { HOUSE_MEANING } = require('./astroBrain/constants');

const CORE_GRAHAS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

function lordForHouse(chart, houseNum) {
  const row = chart?.astroBrain?.debug?.houseLords?.houses?.find((h) => h.house === houseNum);
  return row?.lord || null;
}

function pickBehavioralSlices(planetName, maxBehaviors = 2, maxActions = 2) {
  const lib = REMEDY_LIBRARY[planetName];
  if (!lib) return null;
  return {
    planet: planetName,
    mantra: lib.mantra,
    behaviors: (lib.behavior || []).slice(0, maxBehaviors),
    practicalActions: (lib.action || []).slice(0, maxActions),
    traditionalRituals: (lib.traditional_rituals || []).slice(0, 2),
    itemsToDonate: (lib.items_to_donate || []).slice(0, 3),
    framing: lib.logic
  };
}

function weakestShadbalaRows(shadbala, limit = 3) {
  const scores = [...(shadbala?.scores || [])].filter((s) =>
    CORE_GRAHAS.includes(String(s?.planet || ''))
  );
  scores.sort((a, b) => (Number(a?.normalizedScore) || 0) - (Number(b?.normalizedScore) || 0));
  return scores.slice(0, limit);
}

function weakestSavHouses(sav, limit = 3) {
  if (!sav || typeof sav !== 'object') return [];
  const rows = Object.entries(sav)
    .map(([house, value]) => ({ house: Number(house), score: Number(value) }))
    .filter((r) => Number.isFinite(r.house) && Number.isFinite(r.score));
  rows.sort((a, b) => a.score - b.score);
  return rows.slice(0, limit);
}

function uniqPlanets(rows) {
  return [...new Set(rows.map((r) => r).filter(Boolean))];
}

/**
 * Maps weakest Shadbala grahas + lowest SAV bindu houses to behavioral remedy slices.
 * @param {object} chart — output of generateBirthChart (needs astroBrain with debug.houseLords)
 */
function buildRemedyMapping(chart = {}) {
  const shadbala = chart?.astroBrain?.debug?.shadbala || chart?.astroBrain?.shadbala || {};
  const sav = chart?.astroBrain?.ashtakavarga?.sarvashtakavarga || chart?.astroBrain?.debug?.ashtakavarga?.sarvashtakavarga;

  const weakBal = weakestShadbalaRows(shadbala, 3);
  const weakHouses = weakestSavHouses(sav, 3);

  const fromShadbala = weakBal
    .map((row) => {
      const slice = pickBehavioralSlices(row.planet);
      if (!slice) return null;
      return {
        driver: 'shadbala_normalized_low',
        planet: row.planet,
        strengthHint: Number(row.normalizedScore),
        behavioralFocus: slice
      };
    })
    .filter(Boolean);

  const fromSav = weakHouses
    .map((wh) => {
      const lord = lordForHouse(chart, wh.house);
      const slice = lord ? pickBehavioralSlices(lord) : null;
      const houseTheme = HOUSE_MEANING[wh.house] || 'life-area themes for this chart frame';
      return {
        driver: 'sarvashtakavarga_house_low',
        house: wh.house,
        savScore: Number(wh.score.toFixed(2)),
        signLordUsed: lord,
        lifeAreaCue: houseTheme,
        behavioralFocus: slice,
        note: lord
          ? `Low cumulative SAV in house ${wh.house} (${houseTheme}); support patterns associated with ${lord} steadiness—not fate, but a practical reinforcement angle.`
          : `House ${wh.house} shows lower cumulative SAV in this model (${houseTheme}). Use gentle routine upgrades in this life area rather than drastic moves.`
      };
    })
    .filter(Boolean);

  const prioritizedPlanets = uniqPlanets([
    ...fromShadbala.map((x) => x.planet),
    ...fromSav.map((x) => x.signLordUsed).filter(Boolean)
  ]);

  const synthesisParts = [];
  if (fromShadbala.length) {
    synthesisParts.push(
      `Structural Shadbala is relatively soft for ${fromShadbala.map((x) => x.planet).join(', ')}; behavioral steadiness tends to compound more than intensity.`
    );
  }
  if (fromSav.length) {
    synthesisParts.push(
      `Low Sarvashtakavarga reinforcement in houses ${weakHouses.map((h) => h.house).join(', ')} suggests pacing gains in those arenas with consistent small wins.`
    );
  }

  return {
    version: 1,
    prioritizedPlanets,
    fromShadbala,
    fromWeakestSavHouses: fromSav,
    synthesis:
      synthesisParts.join(' ') ||
      'Insufficient strength-layer context for tailored remedy mapping on this snapshot.',
    caveat:
      'Remedy mapping prioritizes weakest Shadbala and lowest SAV houses as practical behavioral hints. This is supportive guidance—not medical, legal, or guaranteed outcome advice.'
  };
}

module.exports = {
  buildRemedyMapping
};
