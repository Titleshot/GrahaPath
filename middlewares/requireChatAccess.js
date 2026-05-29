const { readAuthTokenFromRequest, verifyAuthToken } = require('../services/authSessionService');
const { getUserByAccessId } = require('../services/authUserService');
const { readChartAccessToken, verifyChartAccessToken } = require('../services/chartAccessSessionService');
const { getProfileById } = require('../services/chartProfileService');

function authEnabled() {
  const v = String(process.env.ACCESS_AUTH_ENABLED || '').toLowerCase();
  return v === 'true' || v === '1';
}

function loadAuthUser(accessId) {
  const latest = getUserByAccessId(accessId);
  if (!latest) {
    return {
      accessId: String(accessId),
      assignedProfileHash: null,
      role: 'user',
      insightsUsed: 0,
      insightsLimit: 55
    };
  }
  return {
    accessId: latest.accessId,
    assignedProfileHash: latest.assignedProfileHash || null,
    role: latest.role || 'user',
    insightsUsed: latest.insightsUsed || 0,
    insightsLimit: latest.insightsLimit || 55
  };
}

/**
 * Chat routes: magic-link chart session OR admin/user cookie login.
 * Magic link is checked first when a valid chart-view token is present (cookie/header from /view/ redeem).
 * That way a lingering gp_auth login cookie cannot drain the wrong quota after sessionStorage is cleared.
 */
async function requireChatAccess(req, res, next) {
  if (!authEnabled()) {
    req.chatAccessMode = 'open';
    return next();
  }

  const chartRaw = readChartAccessToken(req);
  const chartVerified = verifyChartAccessToken(chartRaw);
  if (chartVerified.valid && chartVerified.payload?.chartProfileId) {
    const profile = await getProfileById(chartVerified.payload.chartProfileId);
    if (!profile || profile.revoked) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'This chart link is invalid or no longer active.'
      });
    }
    req.magicLinkProfile = profile;
    req.chatAccessMode = 'magic_link';
    return next();
  }

  const token = readAuthTokenFromRequest(req);
  const userVerified = verifyAuthToken(token);
  if (userVerified.valid && userVerified.payload?.accessId) {
    req.authUser = loadAuthUser(userVerified.payload.accessId);
    req.chatAccessMode = 'user';
    return next();
  }

  return res.status(401).json({
    error: 'AuthRequired',
    message: 'Login required.'
  });
}

module.exports = { requireChatAccess };
