const {
  createOrUpdateUser,
  setUserActive,
  listUsers,
  verifyCredentials,
  normalizeAccessId,
  getUserByAccessId,
  assignChartToUser
} = require('../services/authUserService');
const {
  issueAuthToken,
  buildAuthCookie,
  clearAuthCookie,
  readAuthTokenFromRequest,
  verifyAuthToken
} = require('../services/authSessionService');

function authEnabled() {
  const v = String(process.env.ACCESS_AUTH_ENABLED || '').toLowerCase();
  return v === 'true' || v === '1';
}

function adminAuthorized(req) {
  const key = String(process.env.ACCESS_ADMIN_KEY || '').trim();
  if (!key) return false;
  return String(req.headers['x-admin-key'] || '').trim() === key;
}

function login(req, res) {
  if (!authEnabled()) {
    return res.status(404).json({ error: 'NotEnabled', message: 'Auth login is disabled.' });
  }
  const accessId = normalizeAccessId(req.body?.accessId);
  const password = String(req.body?.password || '');
  const bootstrapAdminId = normalizeAccessId(process.env.ACCESS_BOOTSTRAP_ADMIN_ID || '');
  const bootstrapAdminPassword = String(process.env.ACCESS_BOOTSTRAP_ADMIN_PASSWORD || '');

  if (
    bootstrapAdminId &&
    bootstrapAdminPassword &&
    accessId === bootstrapAdminId &&
    password === bootstrapAdminPassword
  ) {
    const adminUser = createOrUpdateUser({
      accessId: bootstrapAdminId,
      password: bootstrapAdminPassword,
      displayName: 'Admin',
      role: 'admin',
      insightsLimit: 9999
    });
    const token = issueAuthToken({
      accessId: adminUser.accessId,
      type: 'access_login',
      assignedProfileHash: adminUser.assignedProfileHash || null,
      role: 'admin'
    });
    res.setHeader('Set-Cookie', buildAuthCookie(token));
    return res.json({
      ok: true,
      user: adminUser
    });
  }

  const result = verifyCredentials(accessId, password);
  if (!result.ok) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid credentials.'
    });
  }
  const token = issueAuthToken({
    accessId: result.user.accessId,
      type: 'access_login',
      assignedProfileHash: result.user.assignedProfileHash || null,
      role: result.user.role || 'user'
  });
  res.setHeader('Set-Cookie', buildAuthCookie(token));
  return res.json({
    ok: true,
    user: result.user
  });
}

function logout(_req, res) {
  if (!authEnabled()) {
    return res.status(404).json({ error: 'NotEnabled', message: 'Auth login is disabled.' });
  }
  res.setHeader('Set-Cookie', clearAuthCookie());
  return res.json({ ok: true });
}

function me(req, res) {
  if (!authEnabled()) {
    return res.status(404).json({ error: 'NotEnabled', message: 'Auth login is disabled.' });
  }
  const token = readAuthTokenFromRequest(req);
  const verified = verifyAuthToken(token);
  if (!verified.valid || !verified.payload?.accessId) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Not logged in.' });
  }
  const user = getUserByAccessId(verified.payload.accessId);
  if (!user) {
    return res.status(404).json({ error: 'NotFound', message: 'User not found.' });
  }
  return res.json({
    ok: true,
    user: {
      accessId: String(verified.payload.accessId),
      role: user.role || 'user',
      assignedProfileHash: user.assignedProfileHash || null,
      insightsUsed: user.insightsUsed || 0,
      insightsLimit: user.insightsLimit || 55
    }
  });
}

function adminCreateOrResetUser(req, res, next) {
  try {
    if (!adminAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Admin key missing or invalid.' });
    }
    const user = createOrUpdateUser({
      accessId: req.body?.accessId,
      password: req.body?.password,
      displayName: req.body?.displayName,
      assignedProfileHash: req.body?.assignedProfileHash,
      role: req.body?.role,
      insightsLimit: req.body?.insightsLimit
    });
    return res.json({ ok: true, user });
  } catch (error) {
    if (error.code === 'INVALID_ACCESS_ID' || error.code === 'WEAK_PASSWORD') {
      return res.status(400).json({ error: 'BadRequest', message: error.message });
    }
    return next(error);
  }
}

function adminSetUserActive(req, res) {
  if (!adminAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Admin key missing or invalid.' });
  }
  const accessId = normalizeAccessId(req.body?.accessId);
  const active = req.body?.active !== false;
  const user = setUserActive(accessId, active);
  if (!user) {
    return res.status(404).json({ error: 'NotFound', message: 'User not found.' });
  }
  return res.json({ ok: true, user });
}

function authChart(req, res) {
  if (!authEnabled()) {
    return res.status(404).json({ error: 'NotEnabled', message: 'Auth login is disabled.' });
  }
  const token = readAuthTokenFromRequest(req);
  const verified = verifyAuthToken(token);
  if (!verified.valid || !verified.payload?.accessId) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Not logged in.' });
  }
  const user = getUserByAccessId(verified.payload.accessId);
  if (!user) {
    return res.status(404).json({ error: 'NotFound', message: 'User not found.' });
  }
  return res.json({
    ok: true,
    chart: user.assignedChart || null,
    assignedProfileHash: user.assignedProfileHash || null,
    insights: {
      used: user.insightsUsed || 0,
      limit: user.insightsLimit || 55,
      remaining: Math.max(0, (user.insightsLimit || 55) - (user.insightsUsed || 0)),
      phase: (user.insightsUsed || 0) < 5 ? 'test' : 'full'
    }
  });
}

function adminAssignChart(req, res) {
  if (!adminAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Admin key missing or invalid.' });
  }
  const accessId = normalizeAccessId(req.body?.accessId);
  const chart = req.body?.chart;
  if (!accessId || !chart || typeof chart !== 'object') {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'accessId and chart are required.'
    });
  }
  const user = assignChartToUser(accessId, chart);
  if (!user) {
    return res.status(404).json({ error: 'NotFound', message: 'User not found.' });
  }
  return res.json({ ok: true, user });
}

function adminListUsers(req, res) {
  if (!adminAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Admin key missing or invalid.' });
  }
  return res.json({ users: listUsers() });
}

module.exports = {
  login,
  logout,
  me,
  authChart,
  adminCreateOrResetUser,
  adminSetUserActive,
  adminListUsers,
  adminAssignChart
};
