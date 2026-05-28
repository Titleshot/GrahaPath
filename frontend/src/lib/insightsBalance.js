const STORAGE_PREFIX = 'grahapath:insights:';

export function buildInsightsScope({ tokenSession, profileId, accessId, premiumEmail, chartFingerprint }) {
  if (tokenSession) {
    const id = String(profileId || 'session').trim();
    return `token:${id}`;
  }
  const authId = String(accessId || '').trim().toLowerCase();
  if (authId) return `auth:${authId}`;
  const email = String(premiumEmail || '').trim().toLowerCase();
  if (email) return `premium:${email}`;
  const fp = String(chartFingerprint || '').trim();
  if (fp) return `fp:${fp}`;
  return null;
}

export function readCachedInsights(scope) {
  if (!scope || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${scope}`);
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
  } catch {
    return null;
  }
}

export function writeCachedInsights(scope, remaining) {
  if (!scope || typeof window === 'undefined') return;
  if (!Number.isFinite(Number(remaining))) return;
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${scope}`, String(Math.max(0, Math.trunc(remaining))));
  } catch {
    // ignore quota / privacy mode
  }
}

/** Normalize insights from API shapes (chart session, auth chart, chat, premium restore). */
export function insightsFromPayload(data) {
  const block = data?.insights;
  if (block && Number.isFinite(Number(block.remaining))) {
    return Math.max(0, Math.trunc(Number(block.remaining)));
  }
  const direct = Number(data?.remainingInsights ?? data?.remaining_insights);
  if (Number.isFinite(direct)) return Math.max(0, Math.trunc(direct));
  const premium = data?.premium;
  const fromPremium = Number(premium?.remainingInsights ?? premium?.remaining_insights);
  if (Number.isFinite(fromPremium)) return Math.max(0, Math.trunc(fromPremium));
  const user = data?.user;
  if (user && Number.isFinite(Number(user.insightsLimit)) && Number.isFinite(Number(user.insightsUsed))) {
    return Math.max(0, Math.trunc(Number(user.insightsLimit) - Number(user.insightsUsed)));
  }
  return null;
}
