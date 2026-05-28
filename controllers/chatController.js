const { generateGreeting, generateReply } = require('../services/grahapathGeminiService');
const { generateChatResponse } = require('../services/chat/chatOrchestrator');
const { detectChatIntent } = require('../services/chat/intentDetector');
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
const { stampChartIdentity, validatePaywallSessionForChart } = require('../services/chartIdentityService');
const { verifySecurityChallenge } = require('../services/securityChallengeService');
const { incCounter } = require('../services/securityMetricsService');

function userKeyFromRequest(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function shouldCacheReply(text) {
  const t = String(text || '').toLowerCase();
  // Avoid re-serving degraded fallback wording as if it were a strong model answer.
  if (t.includes('here is your chart-based reading')) return false;
  if (t.includes('core baseline: lagna')) return false;
  if (t.includes('ask a focused follow-up')) return false;
  if (looksLikeLifePhaseJson(text)) return false;
  return true;
}

function isAllowedMode(mode) {
  return mode === 'greeting' || mode === 'message' || mode === 'daily_transit';
}

function isDemoPremiumUnlocked(req) {
  return String(req.headers['x-gp-demo-premium'] || '').toLowerCase() === 'true';
}

function isDailyTransitIntent(message) {
  const t = String(message || '').trim().toLowerCase();
  if (!t) return false;
  return (
    /(?:\b(today|tomorrow|daily|next\s+2\s+days|two\s+days|gochar|transit)\b)/i.test(t) ||
    /(?:\b(aaja|aaja ko|aja|aaja ko miti|aaja ko din|parsa|parsi|bholi|bholi ko|parsi ko)\b)/i.test(t) ||
    /(?:आज|आजको|भोलि|पर्सि|गोचर|दैनिक)/u.test(t) ||
    /(?:mero\s+din|mero\s+parsi|mero\s+bholi|my\s+day)/i.test(t)
  );
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
  // Safety fallback: if everything got stripped, return original text instead of blank.
  return compact || raw;
}

function looksLikeLifePhaseJson(text) {
  let t = String(text || '').trim();
  if (!t) return false;
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence) t = fence[1].trim();

  const hasCore = /coreInsight/i.test(t);
  const hasPhases = /"phases"\s*:|'phases'\s*:|"phases"\s*\[|'phases'\s*\[/i.test(t);
  if (hasCore && hasPhases) return true;
  if (/^\s*\{/.test(t) && hasPhases) return true;
  if (/^\s*[\[{]/.test(t) && hasCore) return true;
  return false;
}

function proseFallbackAfterJsonLeak(userMessage) {
  const intent = detectChatIntent(userMessage);
  if (intent === 'small_talk') {
    return "Hey — good to connect. I'm here for your chart: career timing, daily energy, relationships, or emotional patterns — what should we look at first?";
  }
  return "I couldn't format that reply cleanly. Please ask again in a short sentence (career, daily timing, relationship, or an emotional pattern).";
}

function grahaPathChat(req, res, next) {
  (async () => {
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

    let chart = req.body?.chart;
    const requestedMode = req.body?.mode || 'message';
    if (!isAllowedMode(requestedMode)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid mode. Use greeting, message, or daily_transit. Life-phase JSON uses POST /life-phase-validation.'
      });
    }

    if (!chart || typeof chart !== 'object') {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Request body must include a chart object.'
      });
    }
    if (requestedMode === 'greeting') {
      const text = await enqueueGeminiOperation(() => generateGreeting(chart));
      return res.json({ role: 'assistant', text });
    }

    const message = req.body?.message;
    const defaultDailyTransitPrompt =
      'Give me a concise daily transit reading for today using dasha + Moon priority and practical action steps.';
    const resolvedMode =
      requestedMode === 'message' && isDailyTransitIntent(message) ? 'daily_transit' : requestedMode;
    const cleanMessage =
      resolvedMode === 'daily_transit'
        ? (typeof message === 'string' && message.trim()) || defaultDailyTransitPrompt
        : typeof message === 'string'
          ? message.trim()
          : '';
    if (!cleanMessage) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Missing message text.'
      });
    }

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

    const demoPremium = isDemoPremiumUnlocked(req);
    const shouldUseCache = true;
    const cacheKey = buildCacheKey(chart, `${resolvedMode}::${cleanMessage}::${demoPremium ? 'premium' : 'free'}`);
    if (shouldUseCache) {
      const cached = readCachedReply(cacheKey);
      if (cached && !looksLikeLifePhaseJson(cached)) {
        return res.json({ role: 'assistant', text: cached, cached: true });
      }
    }

    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const clientFingerprint = extractClientFingerprint(req);
    chart = stampChartIdentity(chart, clientFingerprint);
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
    const paywallSession = validatePaywallSessionForChart(req, chart, profileHash);
    if (!paywallSession.ok) {
      if (paywallSession.status === 401) incCounter('security.session_invalid');
      else incCounter('security.profile_mismatch');
      return res.status(paywallSession.status).json({
        error: paywallSession.error,
        message: paywallSession.message
      });
    }
    const requireSession = process.env.PAYWALL_REQUIRE_SESSION !== 'false';
    const sessionToken = readSessionTokenFromRequest(req);
    const session = paywallSession.session || verifySessionToken(sessionToken);
    const deviceToken = readDeviceTokenFromRequest(req);
    const device = verifyDeviceToken(deviceToken);
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
    const freeGate = demoPremium
      ? { allowed: true, used: 0, limit: Number(process.env.FREE_CHAT_LIMIT || 3) }
      : await checkAndUseFreeMessageBound({
          profileHash,
          ip: requester,
          deviceId: device.valid ? device.payload.did : 'unknown-device',
          fallbackIdentityHash: identityHash
        });
    if (!freeGate.allowed) {
      incCounter('security.free_tier_block');
      return res.status(402).json({
        error: 'FreeTierLimitReached',
        message: 'Free chat limit reached for this chart profile. Please unlock premium to continue.'
      });
    }

    const rawText = await enqueueGeminiOperation(() =>
      generateChatResponse({
        userMessage: cleanMessage,
        chartData: chart,
        dailyWeather: null,
        conversationHistory: messages,
        userPlan: demoPremium ? 'full' : 'free',
        mode: resolvedMode,
        premiumUnlocked: demoPremium,
        freeTier: !demoPremium,
        freeUsed: freeGate.used,
        freeLimit: freeGate.limit
      })
    );
    let text = demoPremium ? stripPremiumUpsell(rawText) : rawText;
    let usedProseFallback = false;
    if (looksLikeLifePhaseJson(text)) {
      const retryText = await enqueueGeminiOperation(() =>
        generateChatResponse({
          userMessage: cleanMessage,
          chartData: chart,
          dailyWeather: null,
          conversationHistory: messages,
          userPlan: demoPremium ? 'full' : 'free',
          mode: resolvedMode,
          premiumUnlocked: demoPremium,
          freeTier: !demoPremium,
          freeUsed: freeGate.used,
          freeLimit: freeGate.limit,
          forcePlainProse: true
        })
      );
      text = demoPremium ? stripPremiumUpsell(retryText) : retryText;
    }
    if (looksLikeLifePhaseJson(text)) {
      text = proseFallbackAfterJsonLeak(cleanMessage);
      usedProseFallback = true;
    }
    if (shouldUseCache && shouldCacheReply(text) && !usedProseFallback) {
      writeCachedReply(cacheKey, text);
    }
    return res.json({
      role: 'assistant',
      text,
      cached: false,
      mode: resolvedMode,
      freeUsed: freeGate.used,
      freeLimit: freeGate.limit
    });
  })().catch(next);
}

/**
 * Life-phase validation JSON only — not conversational chat.
 * Keeps POST /chat free of report-style life_phases mode so "hi" never hits JSON schema.
 */
function lifePhaseValidationHandler(req, res, next) {
  (async () => {
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

    const chart = req.body?.chart;
    if (!chart || typeof chart !== 'object') {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Request body must include a chart object.'
      });
    }

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
        message: `Too many requests right now. Retry in about ${rate.retryAfterSec}s.`
      });
    }

    const clientFingerprint = extractClientFingerprint(req);
    const { profileHash } = buildIdentityHash(
      {
        dateType: chart?.inputDateType || req.body?.dateType || 'AD',
        date: chart?.birthDateAD || req.body?.date || '',
        bsDate: req.body?.bsDate || inferBsDateObjectFromChart(chart) || null,
        time: chart?.localDateTime ? String(chart.localDateTime).slice(11, 16) : req.body?.time || '',
        place: chart?.place || req.body?.place || '',
        location: chart?.location || req.body?.location || null
      },
      clientFingerprint
    );
    const sessionProfileHash = chart?.profileHash || profileHash;
    const requireSession = process.env.PAYWALL_REQUIRE_SESSION !== 'false';
    const sessionToken = readSessionTokenFromRequest(req);
    const session = verifySessionToken(sessionToken);
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
    if (requireSession && !session.valid) {
      incCounter('security.session_invalid');
      return res.status(401).json({
        error: 'SessionRequired',
        message: 'Session expired or missing. Please regenerate your chart and try again.'
      });
    }
    if (requireSession && session.payload?.profileHash && session.payload.profileHash !== sessionProfileHash) {
      incCounter('security.profile_mismatch');
      return res.status(403).json({
        error: 'ProfileMismatch',
        message: 'Profile identity mismatch detected. Please regenerate your chart.'
      });
    }

    const demoPremium = isDemoPremiumUnlocked(req);
    const prompt =
      typeof req.body?.message === 'string' && req.body.message.trim()
        ? req.body.message.trim()
        : 'Generate life phase validation cards from chart structure only.';

    const rawText = await enqueueGeminiOperation(() =>
      generateReply(chart, [], prompt, 'life_phases', {
        lifePhaseMode: true,
        freeTier: true,
        premiumUnlocked: demoPremium
      })
    );
    const text =
      looksLikeLifePhaseJson(rawText) || !demoPremium ? rawText : stripPremiumUpsell(rawText);
    return res.json({
      role: 'assistant',
      text,
      mode: 'life_phases'
    });
  })().catch(next);
}

/**
 * Stub receiver for payment screenshot uploads (base64) — extend with storage later.
 */
function paymentProofStub(req, res) {
  const imageBase64 = req.body?.imageBase64;
  const hasImage = typeof imageBase64 === 'string' && imageBase64.length > 40;

  return res.status(200).json({
    ok: true,
    received: hasImage,
    message: hasImage
      ? 'Receipt received. GrahaPath will verify and unlock premium access shortly.'
      : 'No image payload detected.'
  });
}

module.exports = {
  grahaPathChat,
  lifePhaseValidationHandler,
  paymentProofStub
};
