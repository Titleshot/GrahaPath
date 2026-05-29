const SESSION_KEY = 'gp_chart_view_session';
const MODE_KEY = 'gp_token_session';

export function saveChartViewSession(token) {
  if (typeof window === 'undefined') return;
  const value = String(token || '').trim();
  if (!value) return;
  window.sessionStorage.setItem(SESSION_KEY, value);
  window.sessionStorage.setItem(MODE_KEY, '1');
}

export function readChartViewSession() {
  if (typeof window === 'undefined') return '';
  return String(window.sessionStorage.getItem(SESSION_KEY) || '').trim();
}

export function clearChartViewSession() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(MODE_KEY);
}

export function hasStoredChartViewSession() {
  return Boolean(readChartViewSession());
}

/** True only after client redeemed a /view/TOKEN magic link (not admin dashboard). */
export function isChartViewClientMode() {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(MODE_KEY) === '1' && Boolean(readChartViewSession());
}
