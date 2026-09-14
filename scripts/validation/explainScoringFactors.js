/**
 * Read-only, evaluation-side re-derivation of the natal facts each branch of
 * scoreCareerEventTypeActivation (services/dasha/careerTimingService.js)
 * reads -- for reporting "which factors fired" without touching or importing
 * private internals of the scoring engine. Never used by the engine itself.
 *
 * explainCareerScoreBreakdown() below is a line-by-line MIRROR of the current
 * committed formula (as of the Career Timing Calibration diagnostic pass) --
 * it must be re-verified against services/dasha/careerTimingService.js if
 * that function is ever edited. The diagnostic script that uses it
 * cross-checks its computed total against the real scoreCareerEventActivation
 * output for every sample, and fails loudly if they diverge, specifically so
 * a stale mirror cannot silently produce a wrong diagnostic report.
 */
const { houseLordMap, planetsInHouse } = require('../../services/dasha/timelineScanEngine');
const { careerAgePlausibilityWeight } = require('../../services/dasha/careerTimingService');

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

/**
 * Line-by-line mirror of scoreCareerEventTypeActivation's per-category rules,
 * returning an itemized {rule, points} list plus the same final 0-100 score
 * the real function would produce (baseline 24, branch rules, age-weighted,
 * clipped). Read-only, diagnostic-only -- never imported by the engine.
 */
function explainCareerScoreBreakdown(chart, mahaDasha, antarDasha, age, eventType) {
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
  const tenthLordDusthana = tenthLordRow?.house === 6 || tenthLordRow?.house === 8 || tenthLordRow?.house === 12;
  const onDisruptionAxis = (p) => p && (p === sixthLord || p === eighthLord || p === twelfthLord);
  const onGrowthAxis = (p) => p && (p === tenthLord || p === eleventhLord);
  const md = mahaDasha || null;
  const ad = antarDasha || null;

  const items = [];
  const add = (rule, condition, points) => {
    if (condition) items.push({ rule, points });
  };

  if (eventType === 'setback') {
    add('mahadasha lord on 6th/8th/12th (disruption axis)', onDisruptionAxis(md), 26);
    add('antardasha lord on 6th/8th/12th (disruption axis)', onDisruptionAxis(ad), 22);
    add('both mahadasha AND antardasha lords are malefic', md && MALEFICS.has(md) && ad && MALEFICS.has(ad), 14);
    add('mahadasha lord malefic, antardasha lord not benefic', md && MALEFICS.has(md) && !(ad && BENEFICS.has(ad)), 8);
    add('Saturn/Rahu/Ketu occupies the 10th house', h10.includes('Saturn') || h10.includes('Rahu') || h10.includes('Ketu'), 12);
    add('10th lord itself sits in a dusthana (6th/8th/12th)', tenthLordDusthana, 14);
    add('mahadasha or antardasha lord is Saturn', md === 'Saturn' || ad === 'Saturn', 8);
    add('Rahu–Ketu (either order) as maha–antar pair', (md === 'Rahu' && ad === 'Ketu') || (md === 'Ketu' && ad === 'Rahu'), 6);
    add('(penalty) mahadasha on growth axis with benefic antardasha', onGrowthAxis(md) && ad && BENEFICS.has(ad), -14);
  } else if (eventType === 'breakthrough') {
    if (onGrowthAxis(md) && onGrowthAxis(ad)) items.push({ rule: 'both maha+antar lords on growth axis (10th/11th)', points: 30 });
    else if (onGrowthAxis(md)) items.push({ rule: 'mahadasha lord on growth axis (10th/11th)', points: 20 });
    else if (onGrowthAxis(ad)) items.push({ rule: 'antardasha lord on growth axis (10th/11th)', points: 14 });
    add('mahadasha lord is benefic', md && BENEFICS.has(md), 6);
    add('antardasha lord is benefic', ad && BENEFICS.has(ad), 8);
    add('Sun in 10th/1st house or is the 10th/1st lord', h10.includes('Sun') || h1.includes('Sun') || sun?.house === 10 || sun?.house === 1, 10);
    add('Jupiter occupies 10th or 11th house', h10.includes('Jupiter') || h11.includes('Jupiter'), 6);
    add('Rahu occupies 10th or 11th house', h10.includes('Rahu') || h11.includes('Rahu'), 6);
    add('natal careerWealth.meters.careerPoints >= 58', careerPoints != null && careerPoints >= 58, 6);
  } else if (eventType === 'expansion') {
    add('mahadasha lord is 11th lord or Jupiter', md === eleventhLord || md === 'Jupiter', 22);
    add('antardasha lord is 11th lord or Jupiter', ad === eleventhLord || ad === 'Jupiter', 18);
    add('Jupiter or Venus occupies the 11th house', h11.includes('Jupiter') || h11.includes('Venus'), 10);
    add('both maha+antar lords are benefic', md && BENEFICS.has(md) && ad && BENEFICS.has(ad), 10);
    add('natal careerWealth.meters.careerPoints >= 55', careerPoints != null && careerPoints >= 55, 6);
  } else if (eventType === 'transition') {
    add('mahadasha or antardasha lord is Rahu or Ketu', md === 'Rahu' || md === 'Ketu' || ad === 'Rahu' || ad === 'Ketu', 22);
    add('Rahu–Ketu (either order) as maha–antar pair', (md === 'Rahu' && ad === 'Ketu') || (md === 'Ketu' && ad === 'Rahu'), 10);
    add('mahadasha or antardasha lord is Mercury', md === 'Mercury' || ad === 'Mercury', 8);
    add('both maha+antar lords are malefic', md && MALEFICS.has(md) && ad && MALEFICS.has(ad), 6);
  } else if (eventType === 'restructuring') {
    add('mahadasha or antardasha lord is Saturn', md === 'Saturn' || ad === 'Saturn', 24);
    add('Saturn occupies 10th or 6th house', h10.includes('Saturn') || h6.includes('Saturn'), 12);
    add('mahadasha lord on 6th/8th/12th (disruption axis)', onDisruptionAxis(md), 10);
    add('mahadasha=Saturn AND antardasha=Rahu', md === 'Saturn' && ad === 'Rahu', 8);
  } else if (eventType === 'leadership') {
    add('Sun in 1st/10th house or is the 1st/10th lord', h1.includes('Sun') || h10.includes('Sun') || sun?.house === 1 || sun?.house === 10, 22);
    add('mahadasha or antardasha lord is Sun', md === 'Sun' || ad === 'Sun', 18);
    add('mahadasha or antardasha lord is Mars', md === 'Mars' || ad === 'Mars', 10);
    add('mahadasha lord on growth axis (10th/11th)', onGrowthAxis(md), 10);
  }

  const baseline = 24;
  const rawSum = items.reduce((s, i) => s + i.points, 0);
  const rawTotal = baseline + rawSum;
  const ageWeight = careerAgePlausibilityWeight(age);
  const finalScore = Math.max(0, Math.min(100, Math.round(rawTotal * ageWeight)));

  return { eventType, mahaDasha: md, antarDasha: ad, age, baseline, items, rawSum, rawTotal, ageWeight, finalScore };
}

module.exports = { explainScoringFactors, explainCareerScoreBreakdown };
