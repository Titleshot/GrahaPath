function normalizeApiBase(raw) {
  return String(raw || '').trim().replace(/\/+$/, '');
}

/**
 * In Vite dev, pointing at http://localhost:3000 (or 127.0.0.1:3000) bypasses the dev proxy and
 * triggers cross-origin + CORS. Prefer same-origin `/api` so requests go through vite.config proxy.
 */
function devPreferViteProxy(apiBase) {
  if (!import.meta.env.DEV) return apiBase;
  const base = normalizeApiBase(apiBase);
  if (!base) return '';
  try {
    const u = new URL(base);
    const port = u.port || (u.protocol === 'https:' ? '443' : '80');
    const isLocal3000 =
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && (port === '3000' || port === '');
    if (isLocal3000 && u.protocol === 'http:') return '';
  } catch {
    // ignore invalid URL
  }
  return base;
}

const API_BASE = devPreferViteProxy(import.meta.env.VITE_API_BASE_URL);
const ACCESS_EMAIL_KEY = 'gp_access_email';
const CHART_VIEW_SESSION_KEY = 'gp_chart_view_session';

function readChartViewSession() {
  if (typeof window === 'undefined') return '';
  return String(window.sessionStorage.getItem(CHART_VIEW_SESSION_KEY) || '').trim();
}

export function withApiBase(path) {
  const cleanPath = String(path || '').trim();
  if (!cleanPath) return API_BASE || '';
  if (/^https?:\/\//i.test(cleanPath)) return cleanPath;
  if (!API_BASE) return cleanPath;
  return `${API_BASE}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

/** Fetch to GrahaPath API — always include cookies (session) when UI and API are on different hosts. */
export function apiFetch(input, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('x-gp-access-email') && typeof window !== 'undefined') {
    const stored = String(window.localStorage.getItem(ACCESS_EMAIL_KEY) || '').trim().toLowerCase();
    if (stored) {
      headers.set('x-gp-access-email', stored);
    }
  }
  if (typeof window !== 'undefined') {
    const viewSession = readChartViewSession();
    if (viewSession) {
      if (!headers.has('authorization')) {
        headers.set('Authorization', `Bearer ${viewSession}`);
      }
      if (!headers.has('x-gp-chart-view-session')) {
        headers.set('x-gp-chart-view-session', viewSession);
      }
    }
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include'
  });
}

export { API_BASE };
