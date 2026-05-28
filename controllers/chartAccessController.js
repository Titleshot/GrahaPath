const { processChatV2Request } = require('../services/grahapathChat/chatService');
const { buildChartFromRequest } = require('./chartController');
const {
  createChartProfile,
  getProfileByToken,
  getProfileById,
  consumeProfileInsight
} = require('../services/chartProfileService');
const {
  issueChartAccessToken,
  buildChartAccessCookie,
  readChartAccessToken,
  verifyChartAccessToken
} = require('../services/chartAccessSessionService');

function requireAdmin(req, res) {
  if (String(req.authUser?.role || '').toLowerCase() !== 'admin') {
    res.status(403).json({ error: 'AccessDenied', message: 'Admins only.' });
    return false;
  }
  return true;
}

async function adminGenerateChartProfile(req, res, next) {
  try {
    if (!requireAdmin(req, res)) return;
    const chart = await buildChartFromRequest(req.body || {});
    const profile = createChartProfile({
      clientName: req.body?.clientName || req.body?.name || null,
      chart,
      createdBy: req.authUser?.accessId || 'admin',
      insightsLimit: Number(req.body?.insightsLimit) || 55
    });
    const frontendBase =
      String(process.env.FRONTEND_PUBLIC_URL || process.env.FRONTEND_ORIGIN || '').split(',')[0].trim() || '';
    const url = frontendBase ? `${frontendBase.replace(/\/+$/, '')}/view/${profile.accessToken}` : `/view/${profile.accessToken}`;
    return res.json({
      ok: true,
      profile: {
        id: profile.id,
        clientName: profile.clientName,
        accessToken: profile.accessToken,
        insightsLimit: profile.insightsLimit
      },
      chart: profile.chart,
      viewUrl: url
    });
  } catch (error) {
    return next(error);
  }
}

function redeemViewToken(req, res) {
  const token = String(req.params?.token || '').trim();
  if (!token) {
    return res.status(400).json({ error: 'BadRequest', message: 'Token is required.' });
  }
  const profile = getProfileByToken(token);
  if (!profile || profile.revoked) {
    return res.status(404).json({ error: 'NotFound', message: 'Invalid or expired chart token.' });
  }
  if (profile.expiresAt && new Date(profile.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({ error: 'Expired', message: 'This chart link has expired.' });
  }
  const accessToken = issueChartAccessToken({ chartProfileId: profile.id, kind: 'chart_profile_view' });
  res.setHeader('Set-Cookie', buildChartAccessCookie(accessToken));
  return res.json({
    ok: true,
    profileId: profile.id,
    chart: profile.chart,
    insights: {
      used: profile.insightsUsed,
      limit: profile.insightsLimit,
      remaining: Math.max(0, profile.insightsLimit - profile.insightsUsed),
      phase: profile.insightsUsed < 5 ? 'test' : 'full'
    }
  });
}

function getSessionChart(req, res) {
  const raw = readChartAccessToken(req);
  const verified = verifyChartAccessToken(raw);
  if (!verified.valid || !verified.payload?.chartProfileId) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No active chart session.' });
  }
  const profile = getProfileById(verified.payload.chartProfileId);
  if (!profile) {
    return res.status(404).json({ error: 'NotFound', message: 'Chart profile not found.' });
  }
  return res.json({
    ok: true,
    profileId: profile.id,
    chart: profile.chart,
    insights: {
      used: profile.insightsUsed,
      limit: profile.insightsLimit,
      remaining: Math.max(0, profile.insightsLimit - profile.insightsUsed),
      phase: profile.insightsUsed < 5 ? 'test' : 'full'
    }
  });
}

async function chartBoundChatQuery(req, res, next) {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) {
      return res.status(400).json({ error: 'BadRequest', message: 'message is required.' });
    }
    const raw = readChartAccessToken(req);
    const verified = verifyChartAccessToken(raw);
    if (!verified.valid || !verified.payload?.chartProfileId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'No active chart session.' });
    }
    const profile = getProfileById(verified.payload.chartProfileId);
    if (!profile) {
      return res.status(404).json({ error: 'NotFound', message: 'Chart profile not found.' });
    }
    const quota = consumeProfileInsight(profile.id);
    if (!quota.allowed) {
      return res.status(402).json({
        error: 'InsightsExhausted',
        message: 'Insights exhausted for this chart. Contact admin.',
        remainingInsights: 0
      });
    }
    const result = await processChatV2Request({
      chart: profile.chart,
      message,
      userPlan: 'full',
      conversationHistory: Array.isArray(req.body?.conversationHistory) ? req.body.conversationHistory : [],
      surfaceMode: 'message',
      premiumUnlocked: true,
      mode: 'message'
    });
    return res.json({
      mode: result.mode,
      intent: result.intent,
      answer: result.answer,
      remainingInsights: quota.remainingInsights,
      insightPhase: quota.phase
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  adminGenerateChartProfile,
  redeemViewToken,
  getSessionChart,
  chartBoundChatQuery
};
