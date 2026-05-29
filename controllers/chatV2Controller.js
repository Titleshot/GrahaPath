const { processChatV2Request } = require('../services/grahapathChat/chatService');
const { findPremiumByEmail, consumePremiumInsight } = require('../services/premiumAccessService');
const { consumeInsight } = require('../services/authUserService');
const {
  consumeUserRateToken,
  buildCacheKey,
  readCachedReply,
  writeCachedReply,
  enqueueGeminiOperation
} = require('../services/chatReliabilityService');
const {
  buildIdentityHash,
  inferBsDateObjectFromChart,
  extractClientFingerprint,
  checkAndUseFreeMessageBound,
  checkBurstLimit,
  assessAbuseRisk
} = require('../services/antiBypassService');
const {
  verifySessionToken,
  readSessionTokenFromRequest,
  verifyDeviceToken,
  readDeviceTokenFromRequest
} = require('../services/sessionTokenService');
const { verifySecurityChallenge } = require('../services/securityChallengeService');
const { incCounter } = require('../services/securityMetricsService');
const { looksLikeReportOrLifePhaseJson } = require('../services/grahapathChat/responseFormatter');
const { detectIntent } = require('../services/grahapathChat/intentDetector');
const { stampChartIdentity, validatePaywallSessionForChart } = require('../services/chartIdentityService');
const { consumeProfileInsight } = require('../services/chartProfileService');

function magicLinkRemaining(profile) {
  if (!profile) return 0;
  return Math.max(0, Number(profile.insightsLimit || 55) - Number(profile.insightsUsed || 0));
}

function userKeyFromRequest(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function isDemoPremiumUnlocked(req) {
  return String(req.headers['x-gp-demo-premium'] || '').toLowerCase() === 'true';
}

function stripPremiumUpsell(text) {
  const raw = String(text || '');
  if (!raw.trim()) return raw;
  const blocked = /(premium|master key|unlock|upgrade|paid|deeper insights|full life decode)/i;
  const lines = raw
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => !blocked.test(line));
  const compact = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return compact || raw;
}

function isDailyTransitIntent(message) {
  const t = String(message || '').trim().toLowerCase();
  if (!t) return false;
  return (
    /(?:\b(today|tomorrow|daily|next\s+2\s+days|two\s+days|gochar|transit)\b)/i.test(t) ||
    /(?:\b(aaja|aaja ko|aja|parsa|parsi|bholi|bholi ko|parsi ko)\b)/i.test(t) ||
    /(?:आज|आजको|भोलि|पर्सि|गोचर|दैनिक)/u.test(t) ||
    /(?:mero\s+din|mero\s+parsi|mero\s+bholi|my\s+day)/i.test(t)
  );
}

function shouldCacheAnswer(answer) {
  const t = String(answer || '').toLowerCase();
  if (looksLikeReportOrLifePhaseJson(answer)) return false;
  if (t.includes("couldn't format that reply")) return false;
  return true;
}

function isDeterministicPanchangaQuery(message) {
  const t = String(message || '').trim().toLowerCase();
  if (!t) return false;
  return (
    /(तिथि|नक्षत्र|पञ्चाङ्ग|पंचांग|चन्द्र\s*राशि|आजको\s*मिति|नेपाली\s*मिति|भोलि|भोली)/u.test(t) ||
    /(tithi|nakshatra|panchanga|moon\s*sign|today'?s?\s*date|tomorrow)/i.test(t)
  );
}

/**
 * POST /chat-v2 — GrahaPath Chat Brain only (no report / life-phase JSON).
 */
function grahaPathChatV2(req, res, next) {
  (async () => {
    const authEnabled = String(process.env.ACCESS_AUTH_ENABLED || '').toLowerCase() === 'true';
    const provider = String(process.env.CHAT_PROVIDER || 'local').trim().toLowerCase();
    const offlineAi = process.env.GEMINI_OFFLINE_AI === 'true';
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
    const providerConfigured =
      provider === 'openai' ? hasOpenAI : provider === 'local' ? true : hasGemini || hasOpenAI || offlineAi;
    if (!providerConfigured) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'GrahaPath AI is not configured on this server. Check server settings and restart.'
      });
    }

    const isMagicLink = req.chatAccessMode === 'magic_link' && req.magicLinkProfile;
    let chart = req.body?.chart;
    if (!chart || typeof chart !== 'object') {
      if (!isMagicLink) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Request body must include chart.'
        });
      }
      chart = req.magicLinkProfile.chart;
    }
    chart = stampChartIdentity(
      isMagicLink ? req.magicLinkProfile.chart : chart,
      extractClientFingerprint(req)
    );

    const demoPremium = isMagicLink ? true : isDemoPremiumUnlocked(req);
    const premiumEmail =
      typeof req.body?.premiumEmail === 'string' ? req.body.premiumEmail.trim().toLowerCase() : '';
    let premiumCounter = null;
    const userPlan = isMagicLink ? 'full' : String(req.body?.userPlan || (demoPremium ? 'full' : 'free')).toLowerCase();
    const mode = String(req.body?.mode || 'message').toLowerCase();
    const conversationHistory = Array.isArray(req.body?.conversationHistory) ? req.body.conversationHistory : [];

    const requester = userKeyFromRequest(req);
    const burst = await checkBurstLimit(requester);
    if (!burst.allowed) {
      incCounter('security.chat_burst_block');
      return res.status(429).json({
        error: 'TooManyRequests',
        message: 'Too many requests in a short period. Please wait and try again.'
      });
    }
    const rate = consumeUserRateToken(requester);
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSec));
      return res.status(429).json({
        error: 'TooManyRequests',
        message: `Too many chat requests right now. Retry in about ${rate.retryAfterSec}s.`
      });
    }

    const clientFingerprint = extractClientFingerprint(req);
    const { identityHash, profileHash } = buildIdentityHash(
      {
        dateType: chart?.inputDateType || req.body?.dateType || 'AD',
        date: chart?.birthDateAD || req.body?.date || '',
        bsDate: req.body?.bsDate || inferBsDateObjectFromChart(chart) || null,
        time: chart?.localDateTime ? String(chart.localDateTime).slice(11, 16) : req.body?.time || '',
        place: chart?.place || chart?.location?.displayName || req.body?.place || '',
        location: chart?.location || req.body?.location || null
      },
      clientFingerprint
    );
    const sessionProfileHash = chart?.profileHash || profileHash;
    if (!isMagicLink) {
      const assignedProfileHash = String(req.authUser?.assignedProfileHash || '').trim();
      if (assignedProfileHash && sessionProfileHash !== assignedProfileHash) {
        return res.status(403).json({
          error: 'ProfileAccessDenied',
          message: 'This login is bound to a different chart profile.'
        });
      }

      const paywallSession = validatePaywallSessionForChart(req, chart, profileHash);
      if (!paywallSession.ok) {
        if (paywallSession.status === 401) incCounter('security.session_invalid');
        else incCounter('security.profile_mismatch');
        return res.status(paywallSession.status).json({
          error: paywallSession.error,
          message: paywallSession.message
        });
      }

      const sessionToken = readSessionTokenFromRequest(req);
      const session = paywallSession.session || verifySessionToken(sessionToken);
      const risk = assessAbuseRisk({
        sessionValid: session.valid,
        fingerprintPresent: Boolean(clientFingerprint && clientFingerprint !== 'unknown-fp'),
        burstCount: burst.count
      });
      if (risk.requireChallenge) {
        const challengeToken = String(req.headers['x-gp-turnstile-token'] || req.body?.challengeToken || '').trim();
        const staticToken = String(req.headers['x-gp-challenge-token'] || '').trim();
        const challenge = await verifySecurityChallenge({
          token: challengeToken,
          staticToken,
          remoteIp: requester
        });
        if (challenge.ok) {
          incCounter('security.challenge_pass');
        } else {
          incCounter('security.challenge_required');
          return res.status(429).json({
            error: 'ChallengeRequired',
            message: 'Additional verification is required before continuing.',
            challenge: {
              required: true,
              reasons: risk.reasons,
              provider: challenge.provider,
              siteKey: challenge.siteKey || null,
              reason: challenge.reason || null
            }
          });
        }
      }
    }
    const freeLimit = Number(process.env.FREE_CHAT_LIMIT || 3);

    if (mode === 'greeting') {
      const cacheKey = buildCacheKey(chart, `v2::greeting::${userPlan}::${demoPremium ? 'p' : 'f'}`);
      const cached = readCachedReply(cacheKey);
      if (cached && !looksLikeReportOrLifePhaseJson(cached)) {
        return res.json({
          mode: 'greeting',
          intent: 'greeting',
          answer: cached,
          remainingInsights: isMagicLink
            ? magicLinkRemaining(req.magicLinkProfile)
            : authEnabled
              ? Math.max(0, Number(req.authUser?.insightsLimit || 55) - Number(req.authUser?.insightsUsed || 0))
              : demoPremium
                ? 999
                : freeLimit,
          insightPhase: isMagicLink
            ? Number(req.magicLinkProfile?.insightsUsed || 0) < 5
              ? 'test'
              : 'full'
            : authEnabled
              ? Number(req.authUser?.insightsUsed || 0) < 5
                ? 'test'
                : 'full'
              : null,
          cached: true
        });
      }

      const result = await enqueueGeminiOperation(() =>
        processChatV2Request({
          chart,
          message: '',
          userPlan: 'full',
          conversationHistory,
          premiumUnlocked: true,
          mode: 'greeting'
        })
      );
      let answer = demoPremium ? stripPremiumUpsell(result.answer) : result.answer;
      if (shouldCacheAnswer(answer)) {
        writeCachedReply(cacheKey, answer);
      }
      if (premiumEmail) {
        const premiumRecord = await findPremiumByEmail(premiumEmail);
        if (premiumRecord) {
          const remaining = Number(
            premiumRecord.remainingInsights ?? premiumRecord.remaining_insights ?? 0
          );
          premiumCounter = {
            remainingInsights: Number.isFinite(remaining) ? Math.max(0, remaining) : 0
          };
        }
      }

      return res.json({
        mode: 'greeting',
        intent: 'greeting',
        answer,
        remainingInsights: isMagicLink
          ? magicLinkRemaining(req.magicLinkProfile)
          : authEnabled
            ? Math.max(0, Number(req.authUser?.insightsLimit || 55) - Number(req.authUser?.insightsUsed || 0))
            : premiumCounter
              ? premiumCounter.remainingInsights
              : demoPremium
                ? 999
                : freeLimit,
        insightPhase: isMagicLink
          ? Number(req.magicLinkProfile?.insightsUsed || 0) < 5
            ? 'test'
            : 'full'
          : authEnabled
            ? Number(req.authUser?.insightsUsed || 0) < 5
              ? 'test'
              : 'full'
            : null,
        cached: false
      });
    }

    const message = req.body?.message;
    const surfaceMode =
      req.body?.surfaceMode === 'daily_transit' ||
      (typeof message === 'string' && isDailyTransitIntent(message))
        ? 'daily_transit'
        : 'message';

    const cleanMessage =
      surfaceMode === 'daily_transit'
        ? (typeof message === 'string' && message.trim()) ||
          'Give me today-focused transit guidance with Moon priority, dasha context, and practical action.'
        : typeof message === 'string'
          ? message.trim()
          : '';
    const bypassCache = isDeterministicPanchangaQuery(cleanMessage);

    if (!cleanMessage) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'message is required.'
      });
    }

    if (!authEnabled && premiumEmail) {
      premiumCounter = await consumePremiumInsight(premiumEmail);
      if (!premiumCounter.allowed) {
        return res.status(402).json({
          error: 'PremiumInsightsExhausted',
          message: 'Your premium insights are exhausted. Please renew to continue.',
          remainingInsights: 0
        });
      }
    }

    let freeGate = { allowed: true, used: 0, limit: freeLimit };
    let authInsight = null;
    let magicInsightQuota = null;
    if (isMagicLink) {
      magicInsightQuota = await consumeProfileInsight(req.magicLinkProfile.id);
      if (!magicInsightQuota.allowed) {
        return res.status(402).json({
          error: 'InsightsExhausted',
          message:
            'Your AI insights for this chart are used up. To top up this link, contact whoever shared it with you, or email radheradhe742@proton.me.',
          remainingInsights: 0
        });
      }
      req.magicLinkProfile = {
        ...req.magicLinkProfile,
        insightsUsed: (req.magicLinkProfile.insightsUsed || 0) + 1
      };
    } else if (authEnabled) {
      authInsight = consumeInsight(req.authUser?.accessId || '');
      if (!authInsight.allowed) {
        return res.status(402).json({
          error: 'InsightsExhausted',
          message: 'Your 55 insights are exhausted. Contact admin for renewal.',
          remainingInsights: 0
        });
      }
      freeGate = {
        allowed: true,
        used: authInsight.insightsUsed,
        limit: authInsight.insightsLimit
      };
    } else {
      const deviceToken = readDeviceTokenFromRequest(req);
      const device = verifyDeviceToken(deviceToken);
      freeGate = demoPremium
        ? { allowed: true, used: 0, limit: freeLimit }
        : await checkAndUseFreeMessageBound({
            profileHash,
            ip: requester,
            deviceId: device.valid ? device.payload.did : 'unknown-device',
            fallbackIdentityHash: identityHash
          });
    }
    if (!freeGate.allowed) {
      incCounter('security.free_tier_block');
      return res.status(402).json({
        error: 'FreeTierLimitReached',
        message: 'Your chart has deeper layers waiting to be explored. Unlock full access to continue the conversation.'
      });
    }

    const cacheKey = buildCacheKey(
      chart,
      `v2::${surfaceMode}::${cleanMessage}::${userPlan}::${demoPremium ? 'p' : 'f'}`
    );
    if (!bypassCache) {
      const cached = readCachedReply(cacheKey);
      if (cached && !looksLikeReportOrLifePhaseJson(cached)) {
        return res.json({
          mode: surfaceMode,
          intent: detectIntent(cleanMessage),
          answer: cached,
          remainingInsights: isMagicLink
            ? magicInsightQuota?.remainingInsights ?? magicLinkRemaining(req.magicLinkProfile)
            : premiumCounter
              ? premiumCounter.remainingInsights
              : authEnabled
                ? authInsight?.remainingInsights ?? Math.max(0, freeGate.limit - freeGate.used)
                : demoPremium
                  ? 999
                  : Math.max(0, freeGate.limit - freeGate.used),
          insightPhase: isMagicLink
            ? magicInsightQuota?.phase || 'full'
            : authEnabled
              ? authInsight?.phase || (freeGate.used <= 5 ? 'test' : 'full')
              : null,
          cached: true,
          freeUsed: freeGate.used,
          freeLimit: freeGate.limit
        });
      }
    }

    const result = await enqueueGeminiOperation(() =>
      processChatV2Request({
        chart,
        message: cleanMessage,
        userPlan: isMagicLink ? 'full' : userPlan,
        conversationHistory,
        surfaceMode,
        premiumUnlocked: isMagicLink ? true : demoPremium,
        mode: 'message'
      })
    );

    let answer = demoPremium ? stripPremiumUpsell(result.answer) : result.answer;
    if (!bypassCache && shouldCacheAnswer(answer)) {
      writeCachedReply(cacheKey, answer);
    }

    return res.json({
      mode: result.mode,
      intent: result.intent,
      answer,
      remainingInsights: isMagicLink
        ? magicInsightQuota?.remainingInsights ?? magicLinkRemaining(req.magicLinkProfile)
        : premiumCounter
          ? premiumCounter.remainingInsights
          : authEnabled
            ? authInsight?.remainingInsights ?? Math.max(0, freeGate.limit - freeGate.used)
            : demoPremium
              ? 999
              : Math.max(0, freeGate.limit - freeGate.used),
      insightPhase: isMagicLink
        ? magicInsightQuota?.phase || 'full'
        : authEnabled
          ? authInsight?.phase || (freeGate.used <= 5 ? 'test' : 'full')
          : null,
      cached: false,
      freeUsed: freeGate.used,
      freeLimit: freeGate.limit
    });
  })().catch(next);
}

module.exports = { grahaPathChatV2 };
