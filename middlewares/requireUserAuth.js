const { readAuthTokenFromRequest, verifyAuthToken } = require('../services/authSessionService');
const { getUserByAccessId } = require('../services/authUserService');

function authEnabled() {
  const v = String(process.env.ACCESS_AUTH_ENABLED || '').toLowerCase();
  return v === 'true' || v === '1';
}

function requireUserAuth(req, res, next) {
  if (!authEnabled()) return next();
  const token = readAuthTokenFromRequest(req);
  const verified = verifyAuthToken(token);
  if (!verified.valid || !verified.payload?.accessId) {
    return res.status(401).json({
      error: 'AuthRequired',
      message: 'Login required.'
    });
  }
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
  return next();
}

module.exports = { requireUserAuth };
