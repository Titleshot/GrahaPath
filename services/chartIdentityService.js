const { buildIdentityHash, inferBsDateObjectFromChart } = require('./antiBypassService');
const { readChartAccessToken, verifyChartAccessToken } = require('./chartAccessSessionService');
const { readSessionTokenFromRequest, verifySessionToken } = require('./sessionTokenService');

function authChartSessionActive(req) {
  const authEnabled = String(process.env.ACCESS_AUTH_ENABLED || '').toLowerCase() === 'true';
  return authEnabled && Boolean(req.authUser?.accessId);
}

function chartAccessSessionActive(req) {
  const raw = readChartAccessToken(req);
  return verifyChartAccessToken(raw).valid;
}

/**
 * Ensure stored/served charts keep a stable profileHash and human-readable place label.
 */
function stampChartIdentity(chart, clientFingerprint = 'profile-store') {
  if (!chart || typeof chart !== 'object') return chart;
  const placeLabel =
    String(chart.place || '').trim() ||
    String(chart.location?.displayName || '').trim() ||
    '';
  if (placeLabel && !String(chart.place || '').trim()) {
    chart.place = placeLabel;
  }
  if (!String(chart.profileHash || '').trim()) {
    const { profileHash } = buildIdentityHash(
      {
        dateType: chart.inputDateType || 'AD',
        date: chart.birthDateAD || '',
        bsDate: inferBsDateObjectFromChart(chart),
        time: chart.localDateTime ? String(chart.localDateTime).slice(11, 16) : '',
        place: placeLabel,
        location: chart.location || null
      },
      clientFingerprint
    );
    chart.profileHash = profileHash;
  }
  return chart;
}

/**
 * Paywall gp_session cookie must match the chart being chatted on.
 * Auth-login and magic-link sessions use their own cookies and skip this check.
 */
function validatePaywallSessionForChart(req, chart, recomputedProfileHash) {
  const requireSession = process.env.PAYWALL_REQUIRE_SESSION !== 'false';
  if (!requireSession || authChartSessionActive(req) || chartAccessSessionActive(req)) {
    return { ok: true, skipped: true };
  }

  const sessionToken = readSessionTokenFromRequest(req);
  const session = verifySessionToken(sessionToken);
  if (!session.valid) {
    return {
      ok: false,
      status: 401,
      error: 'SessionRequired',
      message: 'Session expired or missing. Please regenerate your chart and try again.'
    };
  }

  const embedded = String(chart?.profileHash || '').trim();
  const effectiveHash = embedded || String(recomputedProfileHash || '').trim();
  const sessionHash = String(session.payload?.profileHash || '').trim();

  if (sessionHash && effectiveHash && sessionHash !== effectiveHash) {
    if (embedded && embedded === String(recomputedProfileHash || '').trim()) {
      return { ok: true, session, stalePaywallCookie: true };
    }
    return {
      ok: false,
      status: 403,
      error: 'ProfileMismatch',
      message: 'Profile identity mismatch detected. Please regenerate your chart.'
    };
  }

  return { ok: true, session };
}

module.exports = {
  authChartSessionActive,
  chartAccessSessionActive,
  stampChartIdentity,
  validatePaywallSessionForChart
};
