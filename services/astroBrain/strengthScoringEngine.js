const { VIMSHOTTARI_ORDER } = require('./constants');
const { buildNakshatraDispositorPenalties } = require('./hyperAccuracyRefinement');

const DIGNITY_SCORE = {
  exalted: 5,
  own: 4,
  friendly: 2,
  neutral: 0,
  enemy: -1,
  debilitated: -5,
  shadow: 0
};

const KENDRA = new Set([1, 4, 7, 10]);
const TRIKONA = new Set([1, 5, 9]);
const UPACHAYA = new Set([3, 6, 10, 11]);
const DUSTHANA = new Set([6, 8, 12]);

function housePositionScore(house, planet, sign) {
  const reasons = [];
  let s = 0;

  if (KENDRA.has(house)) {
    s += 2;
    reasons.push(`Kendra house ${house} (+2)`);
  }
  if (TRIKONA.has(house)) {
    s += 2;
    reasons.push(`Trikona house ${house} (+2)`);
  }
  if (UPACHAYA.has(house)) {
    s += 1;
    reasons.push(`Upachaya house ${house} (+1)`);
  }
  if (DUSTHANA.has(house)) {
    s -= 2;
    reasons.push(`Dusthana house ${house} (-2)`);
  }
  if (house === 2 || house === 11) {
    s += 1;
    reasons.push('Wealth-axis house relevance (+1)');
  }
  if (house === 10) {
    s += 2;
    reasons.push('Tenth-house career relevance (+2)');
  }

  if (planet === 'Saturn' && house === 10) {
    s += 3;
    reasons.push('Saturn in 10th (+3)');
  }
  if (planet === 'Rahu' && [3, 6, 10, 11].includes(house)) {
    s += 2;
    reasons.push('Rahu in growth/struggle axis house (+2)');
  }
  if (planet === 'Ketu' && house === 12) {
    s += 2;
    reasons.push('Ketu in 12th spiritual emphasis (+2)');
    s -= 1;
    reasons.push('Ketu in 12th material clarity tradeoff (-1)');
  }
  if (planet === 'Moon' && ['Cancer', 'Scorpio', 'Pisces'].includes(sign)) {
    s += 1;
    reasons.push('Moon in water sign (+1 emotional tone)');
  }
  if (planet === 'Mercury' && ['Gemini', 'Libra', 'Aquarius', 'Taurus', 'Virgo', 'Capricorn'].includes(sign)) {
    s += 1;
    reasons.push('Mercury in air/earth sign (+1 analytical tone)');
  }
  if (planet === 'Mars' && ['Aries', 'Leo', 'Sagittarius'].includes(sign)) {
    s += 1;
    reasons.push('Mars in fire sign (+1 action tone)');
  }

  return { score: s, reasons };
}

function strengthLabel(total) {
  if (total >= 10) return 'very strong';
  if (total >= 6) return 'strong';
  if (total >= 2) return 'moderate';
  if (total >= -2) return 'challenged';
  return 'weak';
}

/**
 * @param {object[]} grahaProfiles
 * @param {object} chartPayload
 */
function shadbalaScoreFor(shadbala, planet) {
  const row = (shadbala?.scores || []).find((s) => s.planet === planet);
  return row?.normalizedScore;
}

function ashtakavargaAdjustment(ashtakavarga, planet, house) {
  const score = ashtakavarga?.planetHouseScores?.[planet]?.[house];
  if (!Number.isFinite(score)) return null;
  return (score - 4) * 0.6;
}

function scoreGrahas(grahaProfiles, chartPayload, shadbala = null, ashtakavarga = null, divisional = null) {
  const nakPenalties = buildNakshatraDispositorPenalties(grahaProfiles);
  const nakByPlanet = new Map(nakPenalties.map((row) => [row.planet, row]));

  const scores = grahaProfiles.map((g) => {
    const reasons = [];
    let total = 0;

    const d = DIGNITY_SCORE[g.dignity] ?? 0;
    total += d;
    reasons.push(`Dignity ${g.dignity} (${d >= 0 ? '+' : ''}${d})`);

    const hs = housePositionScore(g.house, g.planet, g.sign);
    total += hs.score;
    reasons.push(...hs.reasons);

    const shadbalaScore = shadbalaScoreFor(shadbala, g.planet);
    if (Number.isFinite(shadbalaScore)) {
      const shadbalaAdjustment = (shadbalaScore - 0.5) * 4;
      total += shadbalaAdjustment;
      reasons.push(`Shadbala v1 adjustment (${shadbalaAdjustment >= 0 ? '+' : ''}${shadbalaAdjustment.toFixed(2)})`);
    } else {
      reasons.push('Shadbala missing; fallback to structural score only.');
    }

    const avAdj = ashtakavargaAdjustment(ashtakavarga, g.planet, g.house);
    if (Number.isFinite(avAdj)) {
      total += avAdj;
      reasons.push(`Ashtakavarga adjustment (${avAdj >= 0 ? '+' : ''}${avAdj.toFixed(2)})`);
    } else {
      reasons.push('Ashtakavarga missing; fallback without AV weighting.');
    }

    const divRow = divisional?.divisionalRows?.find((r) => r.planet === g.planet);
    if (divRow?.vargottama) {
      total *= 1.3;
      reasons.push('Vargottama (D1 sign = D9 sign): structural emphasis ×1.30');
    }
    if (divRow?.hiddenStruggle) {
      total *= 0.75;
      reasons.push('Hidden struggle (exalted in D1, debilitated in D9): structural emphasis ×0.75');
    }

    const nk = nakByPlanet.get(g.planet);
    if (nk && Number.isFinite(nk.penalty) && nk.penalty !== 0) {
      total += nk.penalty;
      nk.reasons.forEach((line) => reasons.push(`Nakshatra dispositor: ${line}`));
    }

    return {
      planet: g.planet,
      totalScore: total,
      strengthLabel: strengthLabel(total),
      reasons
    };
  });

  const byInfluence = [...scores].sort((a, b) => Math.abs(b.totalScore) - Math.abs(a.totalScore));
  const dominantPlanets = byInfluence.slice(0, 3).map((s) => ({
    planet: s.planet,
    totalScore: s.totalScore,
    strengthLabel: s.strengthLabel,
    influenceNote:
      'Ranked by magnitude of structural score as a proxy for chart emphasis (not moral good or bad).'
  }));

  const ascending = [...scores].sort((a, b) => a.totalScore - b.totalScore);
  const challengedPlanets = ascending.slice(0, 3).map((s) => ({
    planet: s.planet,
    totalScore: s.totalScore,
    strengthLabel: s.strengthLabel,
    note: 'Lower score may suggest more friction or slower integration — a pattern to work with, not a verdict.'
  }));

  return {
    scores,
    dominantPlanets,
    challengedPlanets,
    vimshottariOrderReference: VIMSHOTTARI_ORDER
  };
}

module.exports = {
  scoreGrahas
};
