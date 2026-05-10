/**
 * Mirrors server `chart.access` from chartClientRedaction.js.
 * When false, the API omits nakṣatra, exact longitudes, aspects/drishti, and dense timing.
 */
export const PREMIUM_DEMO_UNLOCK_KEY = 'gp_premium_demo_unlock';

export function readPremiumDemoUnlock() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PREMIUM_DEMO_UNLOCK_KEY) === 'true';
}

export function writePremiumDemoUnlock(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PREMIUM_DEMO_UNLOCK_KEY, value ? 'true' : 'false');
}

export function hasDeepChartData(chart, forceUnlock = false) {
  return forceUnlock || chart?.access?.deepData === true;
}
