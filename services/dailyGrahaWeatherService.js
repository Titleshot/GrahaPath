const { buildTransitSnapshotAtUtc } = require('./astrologyService');

const PRESSURE_LEVELS = ['Low', 'Moderate', 'Medium', 'Elevated', 'High'];
const CLARITY_LEVELS = ['Low', 'Medium', 'Clear', 'Strong'];
const SENSITIVITY_LEVELS = ['Calm', 'Medium', 'Elevated', 'High'];
const STABILITY_LEVELS = ['Volatile', 'Variable', 'Stable', 'Grounded'];
const WINDOWS = [
  { label: 'Early Morning', range: '6 AM - 9 AM' },
  { label: 'Late Morning', range: '9 AM - 12 PM' },
  { label: 'Afternoon', range: '1 PM - 4 PM' },
  { label: 'Late Afternoon', range: '4 PM - 7 PM' },
  { label: 'Evening', range: '8 PM - 10 PM' }
];

function signToAbsMid(sign) {
  const s = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const i = s.indexOf(String(sign || ''));
  return i >= 0 ? i * 30 + 15 : null;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function levelFromScore(score, labels) {
  const i = clamp(Math.round(score), 0, labels.length - 1);
  return labels[i];
}

function pressureReason({ saturnHouse, moonHouse }) {
  if (saturnHouse === 3 || saturnHouse === 10) {
    return "Saturn's transit is increasing decision accountability and mental load.";
  }
  if (moonHouse === 6 || moonHouse === 8 || moonHouse === 12) {
    return "Moon's current transit is amplifying internal processing and stress sensitivity.";
  }
  return 'Current transit mix favors moderate pressure with manageable intensity.';
}

function clarityReason({ mercuryHouse, saturnHouse }) {
  if (mercuryHouse === 3 || mercuryHouse === 11) {
    return "Mercury's transit supports clearer articulation and strategic communication.";
  }
  if (saturnHouse === 3) {
    return "Saturn on communication themes can slow expression through self-monitoring.";
  }
  return 'Communication remains usable but requires deliberate phrasing.';
}

function sensitivityReason({ moonHouse }) {
  if (moonHouse === 8 || moonHouse === 12) {
    return "Moon's deeper houses increase emotional absorption and interpretive depth.";
  }
  return 'Emotional sensitivity is elevated by current lunar movement.';
}

function stabilityReason({ marsHouse, saturnHouse }) {
  if (marsHouse === 1 || marsHouse === 7) {
    return "Mars transit can increase reactivity, reducing perceived steadiness.";
  }
  if (saturnHouse === 10) {
    return "Saturn's grounding influence is stabilizing execution rhythm.";
  }
  return 'Energy remains variable based on communication and emotional triggers.';
}

function microRemedyFor(avoidToday) {
  if (avoidToday.includes('emotionally reactive')) {
    return 'Micro-remedy: take 5 minutes of slow breathing before sensitive conversations.';
  }
  if (avoidToday.includes('impulsive commitments')) {
    return 'Micro-remedy: write 3 priorities before saying yes to new commitments today.';
  }
  if (avoidToday.includes('over-explaining')) {
    return 'Micro-remedy: pause and answer in one short, clear sentence first.';
  }
  return 'Micro-remedy: spend 5 minutes grounding attention on breath before key decisions.';
}

function buildAlerts({ avoidToday, moonHouse, saturnHouse, mercuryHouse }) {
  const primary =
    avoidToday === 'emotionally reactive conversations'
      ? 'Avoid emotionally charged discussions until your response tone settles.'
      : avoidToday === 'over-explaining under pressure'
        ? 'Keep messaging concise; avoid over-justifying decisions under pressure.'
        : 'Avoid making long-term commitments under pressure today.';

  let secondary = 'Use your best action window for one focused strategic task.';
  if (mercuryHouse === 3 || mercuryHouse === 11) {
    secondary = 'Communication momentum is supportive; prioritize outreach and coordination.';
  } else if (moonHouse === 8 || moonHouse === 12) {
    secondary = 'Protect emotional bandwidth by batching high-stakes conversations.';
  } else if (saturnHouse === 10) {
    secondary = 'Steady, process-driven execution will outperform impulsive expansion today.';
  }

  return [primary, secondary];
}

function socialEnergyLevel({ moonHouse, venusHouse }) {
  const score = (moonHouse === 11 || moonHouse === 7 ? 1 : 0) + (venusHouse === 7 || venusHouse === 11 ? 1 : 0);
  if (score >= 2) return 'High';
  if (score === 1) return 'Moderate';
  return 'Low';
}

function luckFactorLevel({ jupiterHouse, moonHouse }) {
  const score = (jupiterHouse === 9 || jupiterHouse === 11 ? 2 : 0) + (moonHouse === 9 ? 1 : 0);
  if (score >= 2) return 'Strong';
  if (score === 1) return 'Medium';
  return 'Gentle';
}

function byName(planets, name) {
  return (planets || []).find((p) => p?.name === name) || null;
}

function windowHint(label) {
  const map = {
    'Early Morning': 'Best for reflection, planning, and emotional regulation.',
    'Late Morning': 'Best for communication, outreach, and practical coordination.',
    Afternoon: 'Best for strategic decisions and focused execution.',
    'Late Afternoon': 'Best for relationship conversations and alignment checks.',
    Evening: 'Best for review, journaling, and low-reactivity decisions.'
  };
  return map[label] || 'Best for strategic communication and emotionally neutral decisions.';
}

async function buildDailyGrahaWeatherFromTransit(chart) {
  const natalAscAbs =
    Number.isFinite(Number(chart?.ascendantAbsoluteDegree))
      ? Number(chart.ascendantAbsoluteDegree)
      : signToAbsMid(chart?.ascendant);
  if (!Number.isFinite(natalAscAbs)) {
    throw new Error('Missing ascendant data for transit weather.');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const dayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  const transit = await buildTransitSnapshotAtUtc(nowIso, natalAscAbs);
  const moonT = byName(transit.planets, 'Moon');
  const mercuryT = byName(transit.planets, 'Mercury');
  const saturnT = byName(transit.planets, 'Saturn');
  const marsT = byName(transit.planets, 'Mars');
  const jupiterT = byName(transit.planets, 'Jupiter');
  const venusT = byName(transit.planets, 'Venus');
  const sunT = byName(transit.planets, 'Sun');

  const moonHouse = Number(moonT?.houseFromNatalAsc || 0);
  const saturnHouse = Number(saturnT?.houseFromNatalAsc || 0);
  const mercuryHouse = Number(mercuryT?.houseFromNatalAsc || 0);
  const marsHouse = Number(marsT?.houseFromNatalAsc || 0);
  const venusHouse = Number(venusT?.houseFromNatalAsc || 0);
  const jupiterHouse = Number(jupiterT?.houseFromNatalAsc || 0);
  const sunHouse = Number(sunT?.houseFromNatalAsc || 0);

  const mentalScore =
    (moonHouse === 6 || moonHouse === 8 || moonHouse === 12 ? 3.6 : 2.1) +
    (saturnHouse === 3 || saturnHouse === 10 ? 0.8 : 0) +
    (mercuryHouse === 8 || mercuryHouse === 12 ? 0.7 : 0);
  const clarityScore =
    2.8 +
    (mercuryHouse === 3 || mercuryHouse === 11 ? 0.8 : 0) -
    (saturnHouse === 3 ? 0.6 : 0) -
    (moonHouse === 8 ? 0.6 : 0);
  const sensitivityScore = 2.3 + (moonHouse === 8 || moonHouse === 12 ? 1.2 : 0.4);
  const stabilityScore = 2.1 + (saturnHouse === 10 ? 0.8 : 0) - (marsHouse === 1 || marsHouse === 7 ? 0.7 : 0);

  const pressureArea =
    saturnHouse === 10
      ? 'Career pacing and decision fatigue'
      : moonHouse === 8 || moonHouse === 12
        ? 'Communication & emotional interpretation'
        : 'Focus management and mental load';
  const energyDirection =
    marsHouse === 1 || marsHouse === 7
      ? 'Strategic restraint favored over impulsive expansion'
      : 'Internal consolidation > external expansion';

  const bestWindow = WINDOWS[clamp((mercuryHouse + jupiterT?.houseFromNatalAsc || 0) % WINDOWS.length, 0, WINDOWS.length - 1)];
  const avoidToday =
    moonHouse === 8 || moonHouse === 12
      ? 'emotionally reactive conversations'
      : saturnHouse === 3
        ? 'over-explaining under pressure'
        : 'impulsive commitments without clarity';

  const dom = chart?.astroBrain?.dominantPlanets?.[0];
  const domName = typeof dom === 'string' ? dom : dom?.planet || dom?.name || 'Moon';
  const currentInfluence = `Today, ${domName} is amplifying strategic processing while Moon transit through house ${moonHouse || '?'} increases emotional interpretation depth.`;
  const timingSummary = 'Today favors deliberate action over impulsive output. Prioritize strategic communication in your best action window.';
  const tomorrowShift =
    mercuryHouse === 3 || mercuryHouse === 11
      ? 'communication clarity may improve slightly after mid-day.'
      : 'emotional sensitivity may stay elevated in the first half of the day.';

  const lagnaSign = chart?.ascendant || 'your Lagna';
  const moonSign = chart?.moonSign || 'your Moon sign';
  const sunSign = chart?.sunSign || 'your Sun sign';
  const bigThreeSummary = {
    lagna: `Lagna (${lagnaSign}): external style is ${clarityScore >= 3 ? 'mentally sharp and adaptive' : 'steady and observant'} today.`,
    moon: `Moon (${moonSign}): emotional tone is ${sensitivityScore >= 3.2 ? 'deep and absorbent' : 'balanced and manageable'} right now.`,
    sun: `Sun (${sunSign}): confidence and vitality are ${sunHouse === 10 || sunHouse === 1 ? 'goal-oriented and visible' : 'best used in focused, low-noise action'}.`
  };

  const houseInfluence = {
    careerWealth:
      jupiterHouse === 10 || jupiterHouse === 11
        ? "Jupiter's transit is supporting career momentum and practical opportunity expansion."
        : "Career outcomes favor disciplined execution over rapid expansion today.",
    relationship:
      venusHouse === 7 || venusHouse === 11
        ? "Venus transit supports smoother relational flow and softer communication tone."
        : "Relationship energy favors patience, listening, and slower emotional pacing."
  };

  const microRemedy = microRemedyFor(avoidToday);

  return {
    mentalPressure: levelFromScore(mentalScore, PRESSURE_LEVELS),
    communicationClarity: levelFromScore(clarityScore, CLARITY_LEVELS),
    communicationClarityReason: clarityReason({ mercuryHouse, saturnHouse }),
    emotionalSensitivity: levelFromScore(sensitivityScore, SENSITIVITY_LEVELS),
    emotionalSensitivityReason: sensitivityReason({ moonHouse }),
    energyStability: levelFromScore(stabilityScore, STABILITY_LEVELS),
    energyStabilityReason: stabilityReason({ marsHouse, saturnHouse }),
    bestActionWindow: bestWindow.label,
    bestActionWindowRange: bestWindow.range,
    bestActionWindowHint: windowHint(bestWindow.label),
    avoidToday,
    avoidTodayMicroRemedy: microRemedy,
    microRemedy,
    pressureArea,
    energyDirection,
    primaryPattern: `${pressureArea} ${mentalScore >= 3.5 || sensitivityScore >= 3.3 ? 'Elevated' : 'Active'}`,
    mentalPressureReason: pressureReason({ saturnHouse, moonHouse }),
    currentInfluence,
    timingSummary,
    tomorrowShift,
    alerts: buildAlerts({ avoidToday, moonHouse, saturnHouse, mercuryHouse }),
    bigThreeSummary,
    energyScores: {
      mentalClarity: levelFromScore(clarityScore, CLARITY_LEVELS),
      socialEnergy: socialEnergyLevel({ moonHouse, venusHouse }),
      luckFactor: luckFactorLevel({ jupiterHouse, moonHouse })
    },
    houseInfluence,
    generatedAt: nowIso,
    dailyKey: dayKey
  };
}

module.exports = { buildDailyGrahaWeatherFromTransit };
