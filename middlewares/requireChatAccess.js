const { readAuthTokenFromRequest, verifyAuthToken } = require('../services/authSessionService');
const { getUserByAccessId } = require('../services/authUserService');
const { readChartAccessToken, verifyChartAccessToken } = require('../services/chartAccessSessionService');
const { getProfileById } = require('../services/chartProfileService');

function authEnabled() {
  const v = String(process.env.ACCESS_AUTH_ENABLED || '').toLowerCase();
  return v === 'true' || v === '1';
}

/**
 * Allows credential login OR magic-link chart session (Bearer / cookie) on chat routes.
 */
async function requireChatAccess(req, res, next) {
  if (!authEnabled()) {
    req.chatAccessMode = 'open';
    return next();
  }

  const token = readAuthTokenFromRequest(req);
  const verified = verifyAuthToken(token);
  if (verified.valid && verified.payload?.accessId) {
    req.authUser = {
      accessId: String(verified.payload.accessId),
      assignedProfileHash: String(verified.payload.assignedProfileHash || '').trim() || null,
      role: String(verified.payload.role || 'user')
    };
    const latest = getUserByAccessId(req.authUser.accessId);
    if (latest) {
      req.authUser = {
        accessId: latest.accessId,
        assignedProfileHash: latest.assignedProfileHash || null,
        role: latest.role || 'user',
        insightsUsed: latest.insightsUsed || 0,
        insightsLimit: latest.insightsLimit || 55
      };
    }
    req.chatAccessMode = 'user';
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

  return res.status(401).json({
    error: 'AuthRequired',
    message: 'Login required.'
  });
}

module.exports = { requireChatAccess };
