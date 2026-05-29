const { processChatV2Request } = require('../services/grahapathChat/chatService');
const { buildChartFromRequest } = require('./chartController');
const {
  createChartProfile,
  getProfileByToken,
  getProfileById,
  recordLegalAcceptance,
  consumeProfileInsight
} = require('../services/chartProfileService');
const { validateLegalAcceptance } = require('../services/legalVersions');
const { stampChartIdentity } = require('../services/chartIdentityService');
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
    const profile = await createChartProfile({
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
      chart: stampChartIdentity(profile.chart),
      viewUrl: url
    });
  } catch (error) {
    return next(error);
  }
}

async function redeemViewToken(req, res) {
  const token = String(req.params?.token || '').trim();
  if (!token) {
    return res.status(400).json({ error: 'BadRequest', message: 'Token is required.' });
  }
  if (!validateLegalAcceptance(req.body || {})) {
    return res.status(403).json({
      error: 'ConsentRequired',
      message:
        'You must accept the Terms & Conditions, Privacy Policy, and Disclaimer before opening this chart link.'
    });
  }
  const profile = await getProfileByToken(token);
  if (!profile || profile.revoked) {
    return res.status(404).json({
      error: 'NotFound',
      message:
        'This chart link is invalid or no longer available. Ask your astrologer to send a fresh link if this one was created before a recent server update.'
    });
  }
  if (profile.expiresAt && new Date(profile.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({ error: 'Expired', message: 'This chart link has expired.' });
  }
  await recordLegalAcceptance(profile.id, {
    termsVersion: req.body?.termsVersion,
    privacyVersion: req.body?.privacyVersion,
    disclaimerVersion: req.body?.disclaimerVersion,
    userAgent: req.headers['user-agent']
  });
  const accessToken = issueChartAccessToken({ chartProfileId: profile.id, kind: 'chart_profile_view' });
  res.setHeader('Set-Cookie', buildChartAccessCookie(accessToken));
  return res.json({
    ok: true,
    profileId: profile.id,
    viewSession: accessToken,
    chart: stampChartIdentity(profile.chart),
    insights: {
      used: profile.insightsUsed,
      limit: profile.insightsLimit,
      remaining: Math.max(0, profile.insightsLimit - profile.insightsUsed),
      phase: profile.insightsUsed < 5 ? 'test' : 'full'
    }
  });
}

async function getSessionChart(req, res) {
  const raw = readChartAccessToken(req);
  const verified = verifyChartAccessToken(raw);
  if (!verified.valid || !verified.payload?.chartProfileId) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No active chart session.' });
  }
  const profile = await getProfileById(verified.payload.chartProfileId);
  if (!profile) {
    return res.status(404).json({ error: 'NotFound', message: 'Chart profile not found.' });
  }
  return res.json({
    ok: true,
    profileId: profile.id,
    chart: stampChartIdentity(profile.chart),
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
    const profile = await getProfileById(verified.payload.chartProfileId);
    if (!profile) {
      return res.status(404).json({ error: 'NotFound', message: 'Chart profile not found.' });
    }
    const quota = await consumeProfileInsight(profile.id);
    if (!quota.allowed) {
      return res.status(402).json({
        error: 'InsightsExhausted',
        message: 'Insights exhausted for this chart. Contact admin.',
        remainingInsights: 0
      });
    }
    const result = await processChatV2Request({
      chart: stampChartIdentity(profile.chart),
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
