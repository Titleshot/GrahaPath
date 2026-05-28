const { isEmailApproved } = require('../services/inviteAccessService');

function gateEnabled() {
  const value = String(process.env.ACCESS_GATING_ENABLED || '').toLowerCase();
  return value === 'true' || value === '1';
}

function authEnabled() {
  const value = String(process.env.ACCESS_AUTH_ENABLED || '').toLowerCase();
  return value === 'true' || value === '1';
}

function extractAccessEmail(req) {
  const byHeader = String(req.headers['x-gp-access-email'] || '').trim().toLowerCase();
  if (byHeader) return byHeader;

  const byBody = String(req.body?.accessEmail || req.body?.email || req.body?.premiumEmail || '')
    .trim()
    .toLowerCase();
  if (byBody) return byBody;

  const byQuery = String(req.query?.accessEmail || req.query?.email || '').trim().toLowerCase();
  return byQuery || '';
}

async function requireInviteAccess(req, res, next) {
  if (authEnabled()) return next();
  if (!gateEnabled()) return next();

  const email = extractAccessEmail(req);
  if (!email) {
    return res.status(401).json({
      error: 'AccessEmailRequired',
      message: 'Invite-only access is enabled. Include x-gp-access-email or accessEmail.'
    });
  }

  const approved = await isEmailApproved(email);
  if (!approved) {
    return res.status(403).json({
      error: 'AccessNotApproved',
      message: 'This email is not approved yet. Please request access first.'
    });
  }

  req.inviteAccess = { email, approved: true };
  return next();
}

module.exports = { requireInviteAccess };
