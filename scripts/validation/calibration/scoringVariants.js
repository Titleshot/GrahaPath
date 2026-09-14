/**
 * Experimental scoring variants for Career Timing Calibration v1.
 *
 * v0_baseline is a thin wrapper around the REAL, unmodified production
 * function (services/dasha/careerTimingService.js) -- it is not a copy, so
 * it can never drift from production. Every other variant is a from-scratch
 * mirror of the same 6-branch structure (verified against v0 for the 5
 * categories it deliberately leaves unchanged), varying only the specific
 * mechanism named in its comment. None of this file is imported by
 * production code; it exists only for calibration experiments.
 */
const { scoreCareerEventActivation, careerAgePlausibilityWeight } = require('../../../services/dasha/careerTimingService');
const { houseLordMap, planetsInHouse } = require('../../../services/dasha/timelineScanEngine');

const MALEFICS = new Set(['Saturn', 'Rahu', 'Ketu', 'Mars']);
const BENEFICS = new Set(['Jupiter', 'Venus', 'Mercury', 'Sun', 'Moon']);

function v0_baseline(chart, mahaDasha, antarDasha, age, eventType) {
  return scoreCareerEventActivation(chart, mahaDasha, antarDasha, age, eventType).score;
}

/**
 * Computes the RAW (pre-age-weight, pre-clip) score and structured item list
 * for one category, with a pluggable setback strategy. The other 5 categories
 * are an exact mirror of production (unchanged) -- Priority 1 targets setback
 * specifically per the agreed experiment order; the other categories are
 * only touched by the separate normalization step, not by rewriting their
 * rules here.
 */
function rawCategoryScore(chart, mahaDasha, antarDasha, eventType, setbackMode) {
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
  const add = (rule, cond, pts) => {
    if (cond) items.push({ rule, points: pts });
  };
  let raw = 24; // baseline, unchanged across every variant

  if (eventType === 'setback') {
    const cond1 = onDisruptionAxis(md); // production: +26
    const cond2 = tenthLordDusthana; // production: +14

    if (setbackMode === 'v0' || !setbackMode) {
      add('disruption-axis mahadasha lord', cond1, 26);
      add('10th lord in dusthana', cond2, 14);
    } else if (setbackMode === 'reducedWeights') {
      // Hypothesis: the two conditions are directionally correct astrology
      // but too cheap relative to what other categories require -- simply
      // scale them down without changing when they fire.
      add('disruption-axis mahadasha lord (reduced)', cond1, 16);
      add('10th lord in dusthana (reduced)', cond2, 8);
    } else if (setbackMode === 'cappedCombo') {
      // Hypothesis: it's specifically the STACKING of both at once that is
      // the problem, not either alone -- cap their combined contribution
      // rather than reducing each individually (so a chart with only ONE of
      // the two still gets full credit for that one signal).
      const combinedRaw = (cond1 ? 26 : 0) + (cond2 ? 14 : 0);
      const capped = Math.min(combinedRaw, 30);
      if (combinedRaw > 0) items.push({ rule: `disruption-axis + dusthana combo (capped at 30, raw was ${combinedRaw})`, points: capped });
    } else if (setbackMode === 'diminishingReturns') {
      // Hypothesis: the first corroborating signal should count fully; a
      // second signal pointing the same direction is confirmatory, not an
      // independent doubling of evidence -- classic diminishing returns.
      if (cond1 && cond2) {
        items.push({ rule: 'disruption-axis mahadasha lord (first signal, full)', points: 26 });
        items.push({ rule: '10th lord in dusthana (second signal, half weight)', points: 7 });
      } else {
        add('disruption-axis mahadasha lord', cond1, 26);
        add('10th lord in dusthana', cond2, 14);
      }
    } else if (setbackMode === 'requireCorroboration') {
      // Hypothesis: a high setback score should require the ANTARDASHA lord
      // to also be malefic before granting full weight -- an uncorroborated
      // single condition (e.g. just the 10th lord happening to sit in a
      // dusthana, with no malefic antardasha involvement at all) is weak
      // standalone evidence and should score as such.
      const corroborated = ad && MALEFICS.has(ad);
      if (corroborated) {
        add('disruption-axis mahadasha lord (corroborated by malefic antardasha)', cond1, 26);
        add('10th lord in dusthana (corroborated by malefic antardasha)', cond2, 14);
      } else {
        add('disruption-axis mahadasha lord (uncorroborated, reduced)', cond1, 10);
        add('10th lord in dusthana (uncorroborated, reduced)', cond2, 5);
      }
    }

    add('antardasha lord on disruption axis', onDisruptionAxis(ad), 22);
    add('both maha+antar lords malefic', md && MALEFICS.has(md) && ad && MALEFICS.has(ad), 14);
    add('mahadasha lord malefic, antardasha lord not benefic', md && MALEFICS.has(md) && !(ad && BENEFICS.has(ad)), 8);
    add('malefic (Saturn/Rahu/Ketu) occupies 10th house', h10.includes('Saturn') || h10.includes('Rahu') || h10.includes('Ketu'), 12);
    add('mahadasha or antardasha lord is Saturn', md === 'Saturn' || ad === 'Saturn', 8);
    add('Rahu–Ketu pair (either order)', (md === 'Rahu' && ad === 'Ketu') || (md === 'Ketu' && ad === 'Rahu'), 6);
    add('(penalty) growth-axis mahadasha with benefic antardasha', onGrowthAxis(md) && ad && BENEFICS.has(ad), -14);
  } else if (eventType === 'breakthrough') {
    if (onGrowthAxis(md) && onGrowthAxis(ad)) items.push({ rule: 'both lords on growth axis', points: 30 });
    else if (onGrowthAxis(md)) items.push({ rule: 'mahadasha lord on growth axis', points: 20 });
    else if (onGrowthAxis(ad)) items.push({ rule: 'antardasha lord on growth axis', points: 14 });
    add('mahadasha lord benefic', md && BENEFICS.has(md), 6);
    add('antardasha lord benefic', ad && BENEFICS.has(ad), 8);
    add('Sun in 10th/1st', h10.includes('Sun') || h1.includes('Sun') || sun?.house === 10 || sun?.house === 1, 10);
    add('Jupiter in 10th/11th', h10.includes('Jupiter') || h11.includes('Jupiter'), 6);
    add('Rahu in 10th/11th', h10.includes('Rahu') || h11.includes('Rahu'), 6);
    add('careerPoints >= 58', careerPoints != null && careerPoints >= 58, 6);
  } else if (eventType === 'expansion') {
    add('mahadasha lord is 11th lord or Jupiter', md === eleventhLord || md === 'Jupiter', 22);
    add('antardasha lord is 11th lord or Jupiter', ad === eleventhLord || ad === 'Jupiter', 18);
    add('Jupiter/Venus in 11th', h11.includes('Jupiter') || h11.includes('Venus'), 10);
    add('both lords benefic', md && BENEFICS.has(md) && ad && BENEFICS.has(ad), 10);
    add('careerPoints >= 55', careerPoints != null && careerPoints >= 55, 6);
  } else if (eventType === 'transition') {
    add('mahadasha or antardasha is Rahu/Ketu', md === 'Rahu' || md === 'Ketu' || ad === 'Rahu' || ad === 'Ketu', 22);
    add('Rahu–Ketu pair', (md === 'Rahu' && ad === 'Ketu') || (md === 'Ketu' && ad === 'Rahu'), 10);
    add('mahadasha or antardasha is Mercury', md === 'Mercury' || ad === 'Mercury', 8);
    add('both lords malefic', md && MALEFICS.has(md) && ad && MALEFICS.has(ad), 6);
  } else if (eventType === 'restructuring') {
    add('mahadasha or antardasha is Saturn', md === 'Saturn' || ad === 'Saturn', 24);
    add('Saturn in 10th/6th', h10.includes('Saturn') || h6.includes('Saturn'), 12);
    add('disruption-axis mahadasha lord', onDisruptionAxis(md), 10);
    add('mahadasha=Saturn, antardasha=Rahu', md === 'Saturn' && ad === 'Rahu', 8);
  } else if (eventType === 'leadership') {
    add('Sun in 1st/10th', h1.includes('Sun') || h10.includes('Sun') || sun?.house === 1 || sun?.house === 10, 22);
    add('mahadasha or antardasha is Sun', md === 'Sun' || ad === 'Sun', 18);
    add('mahadasha or antardasha is Mars', md === 'Mars' || ad === 'Mars', 10);
    add('mahadasha lord on growth axis', onGrowthAxis(md), 10);
  }

  const rawSum = items.reduce((s, i) => s + i.points, 0);
  return { rawTotal: 24 + rawSum, items };
}

/** Priority 1 -- setback re-weighting variants. Same age-weighting/clip as production; only the setback branch's internals differ. */
function makeSetbackVariant(mode) {
  return (chart, mahaDasha, antarDasha, age, eventType) => {
    const { rawTotal } = rawCategoryScore(chart, mahaDasha, antarDasha, eventType, eventType === 'setback' ? mode : 'v0');
    const weighted = rawTotal * careerAgePlausibilityWeight(age);
    return Math.max(0, Math.min(100, Math.round(weighted)));
  };
}

const v1a_reducedWeights = makeSetbackVariant('reducedWeights');
const v1b_cappedCombo = makeSetbackVariant('cappedCombo');
const v1c_diminishingReturns = makeSetbackVariant('diminishingReturns');
const v1d_requireCorroboration = makeSetbackVariant('requireCorroboration');

/**
 * Priority 2 -- normalization. Applied AFTER computing each category's raw
 * (pre-clip) score via rawCategoryScore(), using empirically-derived anchors
 * (per-category max/mean/std) passed in by the caller -- these anchors must
 * be computed once via computeStructuralAnchors() below on a fixed reference
 * sample, not re-derived per person (that would make the normalization
 * itself a source of overfitting to whichever chart it's applied to).
 */
function computeStructuralAnchors(charts, categories, setbackMode = 'v0') {
  const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const anchors = {};
  for (const category of categories) {
    const raws = [];
    for (const chart of charts) {
      for (const md of PLANETS) {
        for (const ad of PLANETS) {
          raws.push(rawCategoryScore(chart, md, ad, category, setbackMode).rawTotal);
        }
      }
    }
    const mean = raws.reduce((a, b) => a + b, 0) / raws.length;
    const variance = raws.reduce((s, r) => s + (r - mean) ** 2, 0) / raws.length;
    anchors[category] = { max: Math.max(...raws), min: Math.min(...raws), mean: Math.round(mean * 100) / 100, std: Math.round(Math.sqrt(variance) * 100) / 100 };
  }
  return anchors;
}

/** Normalization A: scale each category's raw score by its own empirical max so every category's ceiling maps to the same 100. */
function makeMaxScalingVariant(anchors, setbackMode = 'v0') {
  return (chart, mahaDasha, antarDasha, age, eventType) => {
    const { rawTotal } = rawCategoryScore(chart, mahaDasha, antarDasha, eventType, eventType === 'setback' ? setbackMode : 'v0');
    const a = anchors[eventType];
    const scaled = a && a.max > 0 ? (rawTotal / a.max) * 100 : rawTotal;
    const weighted = scaled * careerAgePlausibilityWeight(age);
    return Math.max(0, Math.min(100, Math.round(weighted)));
  };
}

/** Normalization B: z-score-like centering -- every category's mean maps to 50, spread rescaled to a common target std, so magnitude differences between categories reflect distance from THAT category's own typical value, not raw point totals. */
function makeZScoreVariant(anchors, setbackMode = 'v0', targetStd = 15) {
  return (chart, mahaDasha, antarDasha, age, eventType) => {
    const { rawTotal } = rawCategoryScore(chart, mahaDasha, antarDasha, eventType, eventType === 'setback' ? setbackMode : 'v0');
    const a = anchors[eventType];
    const z = a && a.std > 0 ? (rawTotal - a.mean) / a.std : 0;
    const scaled = 50 + z * targetStd;
    const weighted = scaled * careerAgePlausibilityWeight(age);
    return Math.max(0, Math.min(100, Math.round(weighted)));
  };
}

/** Normalization C: scale by number of scoring conditions available in that branch, so a category with fewer rules isn't structurally capped just for having less machinery. */
const CONDITION_COUNTS = { setback: 9, breakthrough: 7, expansion: 5, transition: 4, restructuring: 4, leadership: 4 };
function makeConditionCountVariant(setbackMode = 'v0') {
  return (chart, mahaDasha, antarDasha, age, eventType) => {
    const { rawTotal } = rawCategoryScore(chart, mahaDasha, antarDasha, eventType, eventType === 'setback' ? setbackMode : 'v0');
    const baseline = 24;
    const nonBaseline = rawTotal - baseline;
    const perCondition = nonBaseline / (CONDITION_COUNTS[eventType] || 1);
    // Rescale so the AVERAGE per-condition value across categories still lands
    // in a comparable 0-100-ish range after age weighting -- perCondition is
    // typically 0-6ish per condition, so scale to a 0-100 band via *9 (the
    // max condition count, so setback's own average is not artificially
    // inflated by the very re-scaling meant to correct for it).
    const scaled = baseline + perCondition * 9;
    const weighted = scaled * careerAgePlausibilityWeight(age);
    return Math.max(0, Math.min(100, Math.round(weighted)));
  };
}

module.exports = {
  v0_baseline,
  rawCategoryScore,
  v1a_reducedWeights,
  v1b_cappedCombo,
  v1c_diminishingReturns,
  v1d_requireCorroboration,
  computeStructuralAnchors,
  makeMaxScalingVariant,
  makeZScoreVariant,
  makeConditionCountVariant,
  CONDITION_COUNTS
};
