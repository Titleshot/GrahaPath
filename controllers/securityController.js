const {
  clearIdentityUsage,
  clearIpDailyProfiles
} = require('../services/antiBypassService');
const { getSecurityMetrics } = require('../services/securityMetricsService');
const { getStoreProviderName, initKvClient } = require('../services/securityStore');

function ensureAdminKey(req, res) {
  const expected = process.env.ADMIN_SECURITY_KEY || '';
  const got = String(req.headers['x-admin-security-key'] || '');
  if (!expected || got !== expected) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin security key.' });
    return false;
  }
  return true;
}

async function clearSecurityLocks(req, res) {
  if (!ensureAdminKey(req, res)) return;
  const identityHash = String(req.body?.identityHash || '').trim();
  const ip = String(req.body?.ip || '').trim();

  if (!identityHash && !ip) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'Provide identityHash and/or ip.'
    });
  }

  if (identityHash) {
    await clearIdentityUsage(identityHash);
  }
  if (ip) {
    await clearIpDailyProfiles(ip);
  }

  return res.json({
    ok: true,
    cleared: {
      identityHash: Boolean(identityHash),
      ip: Boolean(ip)
    }
  });
}

module.exports = {
  clearSecurityLocks,
  getSecurityMetricsAdmin: async (req, res) => {
    if (!ensureAdminKey(req, res)) return;
    await initKvClient();
    return res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      storeProvider: getStoreProviderName(),
      process: {
        pid: process.pid,
        uptimeSec: Math.floor(process.uptime())
      },
      metrics: getSecurityMetrics()
    });
  }
};

