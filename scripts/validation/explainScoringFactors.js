/**
 * Read-only, evaluation-side re-derivation of the natal facts each branch of
 * scoreCareerEventTypeActivation (services/dasha/careerTimingService.js)
 * reads -- for reporting "which factors fired" without touching or importing
 * private internals of the scoring engine. Never used by the engine itself.
 */
const { houseLordMap, planetsInHouse } = require('../../services/dasha/timelineScanEngine');

const MALEFICS = new Set(['Saturn', 'Rahu', 'Ketu', 'Mars']);
const BENEFICS = new Set(['Jupiter', 'Venus', 'Mercury', 'Sun', 'Moon']);

function explainScoringFactors(chart, mahaDasha, antarDasha, age) {
  const lords = houseLordMap(chart);
  const tenthLord = lords[10] || null;
  const eleventhLord = lords[11] || null;
  const sixthLord = lords[6] || null;
  const eighthLord = lords[8] || null;
  const twelfthLord = lords[12] || null;
  const h1 = planetsInHouse(chart, 1);
  const h6 = planetsInHouse(chart, 6);
  const h10 = planetsInHouse(chart, 10);
  const h11 = planetsInHouse(chart, 11);
  const sun = (chart?.planets || []).find((p) => p.name === 'Sun');
  const careerPoints = chart?.careerWealth?.meters?.careerPoints ?? null;
  const tenthLordRow = (chart?.planets || []).find((p) => p.name === tenthLord);
  const tenthLordInDusthana = tenthLordRow?.house === 6 || tenthLordRow?.house === 8 || tenthLordRow?.house === 12;
  const onDisruptionAxis = (p) => p && (p === sixthLord || p === eighthLord || p === twelfthLord);
  const onGrowthAxis = (p) => p && (p === tenthLord || p === eleventhLord);

  return {
    tenthLord,
    eleventhLord,
    sixthLord,
    eighthLord,
    twelfthLord,
    mahaDasha,
    antarDasha,
    age,
    mdOnGrowthAxis: onGrowthAxis(mahaDasha),
    adOnGrowthAxis: onGrowthAxis(antarDasha),
    mdOnDisruptionAxis: onDisruptionAxis(mahaDasha),
    adOnDisruptionAxis: onDisruptionAxis(antarDasha),
    mdIsBenefic: mahaDasha ? BENEFICS.has(mahaDasha) : null,
    adIsBenefic: antarDasha ? BENEFICS.has(antarDasha) : null,
    mdIsMalefic: mahaDasha ? MALEFICS.has(mahaDasha) : null,
    adIsMalefic: antarDasha ? MALEFICS.has(antarDasha) : null,
    sunInH10OrH1: h10.includes('Sun') || h1.includes('Sun') || sun?.house === 10 || sun?.house === 1,
    tenthLordInDusthana,
    h10occupants: h10,
    h11occupants: h11,
    careerPoints
  };
}

module.exports = { explainScoringFactors };
