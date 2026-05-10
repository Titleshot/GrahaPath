const PRESSURE_LEVELS = ['Low', 'Moderate', 'Medium', 'Elevated', 'High'];
const CLARITY_LEVELS = ['Low', 'Medium', 'Clear', 'Strong'];
const SENSITIVITY_LEVELS = ['Calm', 'Medium', 'Elevated', 'High'];
const STABILITY_LEVELS = ['Volatile', 'Variable', 'Stable', 'Grounded'];

const ACTION_WINDOWS = [
  { label: 'Early Morning', range: '6 AM - 9 AM' },
  { label: 'Late Morning', range: '9 AM - 12 PM' },
  { label: 'Afternoon', range: '1 PM - 4 PM' },
  { label: 'Late Afternoon', range: '4 PM - 7 PM' },
  { label: 'Evening', range: '8 PM - 10 PM' }
];

const AVOID_PATTERNS = [
  'emotionally reactive conversations',
  'impulsive commitments without clarity',
  'over-explaining under pressure',
  'taking criticism personally',
  'scattered multitasking'
];

const PRESSURE_AREAS = [
  'Communication & emotional interpretation',
  'Career pacing and decision fatigue',
  'Relationship sensitivity and boundaries',
  'Focus management and mental load',
  'Self-worth and performance pressure'
];

const ENERGY_DIRECTIONS = [
  'Internal consolidation > external expansion',
  'Reflection favored over impulsive action',
  'Strategic outreach favored over reactive messaging',
  'Depth work favored over broad multitasking',
  'Stability and planning favored over risk-taking'
];

const GRAHA_ALERTS = [
  'Emotional overreaction probability elevated tonight.',
  'Avoid making long-term commitments under pressure today.',
  'Strong timing for focused work and strategic outreach.',
  'Delay sensitive conversations until clarity improves.',
  'Good window for planning, not for impulsive execution.'
];

const WINDOW_ACTION_HINTS = {
  'Early Morning': 'Best for reflection, planning, and emotional regulation.',
  'Late Morning': 'Best for communication, outreach, and practical coordination.',
  Afternoon: 'Best for strategic decisions and focused execution.',
  'Late Afternoon': 'Best for relationship conversations and alignment checks.',
  Evening: 'Best for review, journaling, and low-reactivity decisions.'
};

function hashString(s) {
  let h = 0;
  const text = String(s || '');
  for (let i = 0; i < text.length; i += 1) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pick(list, seed, offset = 0) {
  if (!Array.isArray(list) || !list.length) return '';
  return list[(seed + offset) % list.length];
}

function chartIdentitySeed(chart) {
  const key = [
    chart?.ascendant || '',
    chart?.moonSign || '',
    chart?.sunSign || '',
    chart?.planets?.find?.((p) => p?.name === 'Moon')?.nakshatra || '',
    chart?.astroBrain?.summary?.currentMahadashaPlanet || '',
    chart?.astroBrain?.summary?.currentAntardashaLord || ''
  ].join('|');
  return hashString(key);
}

function dayKeyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function buildDailyGrahaWeather(chart) {
  const base = chartIdentitySeed(chart);
  const daily = hashString(dayKeyLocal());
  const seed = base ^ daily;

  const dominant = chart?.astroBrain?.dominantPlanets?.[0];
  const domName = typeof dominant === 'string' ? dominant : dominant?.planet || dominant?.name || 'Moon';
  const moon = chart?.moonSign || 'Moon';
  const lagna = chart?.ascendant || 'Lagna';
  const pressure = pick(PRESSURE_LEVELS, seed, 1);
  const clarity = pick(CLARITY_LEVELS, seed, 3);
  const sensitivity = pick(SENSITIVITY_LEVELS, seed, 5);
  const stability = pick(STABILITY_LEVELS, seed, 7);
  const bestWindow = pick(ACTION_WINDOWS, seed, 9);
  const pressureArea = pick(PRESSURE_AREAS, seed, 13);
  const energyDirection = pick(ENERGY_DIRECTIONS, seed, 15);
  const tomorrowShift =
    pick(CLARITY_LEVELS, seed, 17) === 'Strong'
      ? 'communication clarity may improve slightly after mid-day.'
      : 'emotional sensitivity may stay elevated in the first half of the day.';

  const currentInfluence =
    `Today, ${domName} is amplifying ${lagna.toLowerCase()} response patterns while ${moon} moon signatures increase emotional processing depth.`;
  const timingSummary =
    `Today favors deliberate action over impulsive output. Use high-focus windows for strategic tasks and hold emotionally loaded decisions until clarity settles.`;
  const primaryPattern = `${pressureArea} ${pressure === 'High' || sensitivity === 'High' ? 'Elevated' : 'Active'}`;
  const windowAction = WINDOW_ACTION_HINTS[bestWindow?.label] || 'Best for strategic communication and emotionally neutral decisions.';
  const alertA = pick(GRAHA_ALERTS, seed, 19);
  const alertB = pick(GRAHA_ALERTS, seed, 21);

  return {
    mentalPressure: pressure,
    communicationClarity: clarity,
    emotionalSensitivity: sensitivity,
    energyStability: stability,
    bestActionWindow: bestWindow?.label || 'Afternoon',
    bestActionWindowRange: bestWindow?.range || '1 PM - 4 PM',
    bestActionWindowHint: windowAction,
    avoidToday: pick(AVOID_PATTERNS, seed, 11),
    pressureArea,
    energyDirection,
    primaryPattern,
    currentInfluence,
    timingSummary,
    tomorrowShift,
    alerts: [alertA, alertB].filter((x, i, arr) => arr.indexOf(x) === i)
  };
}
