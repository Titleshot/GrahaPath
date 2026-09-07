const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const {
  formatChartForGemini,
  formatChartForGeminiBrief,
  formatChartForGreetingGemini,
  formatChartForGeminiForIntent,
  formatChartForGeminiRescue
} = require('./geminiContextBuilder');
const { convertAdToBs } = require('./dateConversionService');
const { buildKathmanduDatePayload } = require('./nepaliDateService');
const { buildTransitSnapshotAtUtc } = require('./astrologyService');
const { detectChatIntent } = require('./chat/intentDetector');
const {
  buildDeterministicAstroContextFromTransit,
  buildPanchangaForDate,
  buildPanchangaRange
} = require('./currentAstronomyService');

// Default works with current Google AI Studio keys. Set GEMINI_MODEL in .env to override.
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

// Aliases retired or renamed on the Gemini API — map so old .env values still work.
const GEMINI_MODEL_ALIASES = {
  'gemini-1.5-flash': DEFAULT_GEMINI_MODEL,
  'gemini-1.5-flash-latest': DEFAULT_GEMINI_MODEL,
  'gemini-1.5-flash-001': DEFAULT_GEMINI_MODEL,
  'gemini-1.5-flash-8b': DEFAULT_GEMINI_MODEL,
  'gemini-pro': DEFAULT_GEMINI_MODEL
};

const runtimeStats = {
  replyCalls: 0,
  replySuccess: 0,
  quotaErrors: 0,
  authErrors: 0,
  modelNotFoundErrors: 0,
  rescueSuccess: 0,
  rescueFailure: 0,
  fallbackResponses: 0,
  lastErrorMessage: null,
  lastErrorAt: null
};

function chatProviderMode() {
  return String(process.env.CHAT_PROVIDER || 'local').trim().toLowerCase();
}

function shouldUseOpenAI() {
  if (!String(process.env.OPENAI_API_KEY || '').trim()) return false;
  const mode = chatProviderMode();
  if (mode === 'gemini') return false;
  return true;
}

function shouldUseGemini() {
  if (shouldUseOpenAI()) return false;
  const mode = chatProviderMode();
  return mode === 'gemini' || mode === 'hybrid';
}

function resolvedGeminiModelId() {
  const raw = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  const lowered = raw.toLowerCase();
  const mapped = GEMINI_MODEL_ALIASES[lowered] ?? raw;
  if (mapped !== raw) {
    console.warn(`[GrahaPath] GEMINI_MODEL "${raw}" is unavailable; using "${mapped}". Update your .env when convenient.`);
  }
  return mapped;
}

function lifePhaseValidationInstruction() {
  return (
    'LIFE_PHASE_VALIDATION_PROTOCOL (mandatory ONLY in this mode; output JSON only):\n' +
    '1) Output must be valid minified JSON only (no markdown, no commentary).\n' +
    '2) JSON schema: { "coreInsight": { "text": string, "astroReason": string }, "phases":[{ "title": string, "ageRange": "0–14"|"15–24"|"25–Present", "shortText": string, "astroReason": string, "validationOptions": ["This matches me","Partially","Not really"] }] }\n' +
    '3) Exactly 3 phases in order: 0–14, 15–24, 25–Present.\n' +
    '3b) coreInsight.text max 90 words and must be chart-specific (no generic archetype line).\n' +
    '4) shortText should be 2-3 sentences, about 70-95 words, clear and chart-specific. astroReason max 1 line.\n' +
    '5) Build phases from visible chart structure, not generic archetype templates.\n' +
    '6) Factor priority:\n' +
    '   - 0–14: Moon, 4th-house conditioning, Saturn/Ketu childhood signatures.\n' +
    '   - 15–24: Ascendant + ascendant lord, Rahu/Mars activation, identity-social pressure signals.\n' +
    '   - 25–Present: current dasha/antardasha if visible, Saturn maturity, 10th-house direction and active planets.\n' +
    '7) If dasha is missing, say: "Current timing requires dasha calculation; this phase is based on visible chart structure."\n' +
    '8) Avoid repeated stock phrases across all charts. Make wording chart-differentiated.\n'
  );
}

function minimalChatSystemInstruction(opts = {}) {
  const lifePhaseMode = !!opts.lifePhaseMode;
  const premiumUnlocked = !!opts.premiumUnlocked;
  const freeTier = !!opts.freeTier;
  let s =
    "You are GrahaPath AI — a Vedic astrology guide for this app. " +
    'Answer naturally; mirror the user language (Nepali or English). ' +
    'Ground chart claims in STRICT_USER_DATA (natal + Current_Live_Transit when present). If a field is missing, say it is not in this snapshot — do not invent placements or timing. ' +
    'Never calculate or guess astronomy yourself (no manual tithi, nakshatra, moon-sign, transit, or BS-date math). Use only deterministic fields provided in STRICT_USER_DATA/TODAY_CONTEXT. ' +
    'No fatalistic certainty; prefer tendencies and practical agency. Not a doctor, lawyer, or medical authority. ' +
    'Use TODAY_CONTEXT only for present date/time; do not guess dates. ' +
    (premiumUnlocked
      ? 'The user has full access — do not pitch premium, unlock, upgrades, or paywalls. '
      : '') +
    (freeTier ? 'Keep answers concise when possible (short paragraphs or a few bullets). ' : '') +
    'Unless life-phase JSON mode applies below, reply in plain text or markdown only — never raw JSON objects like { "coreInsight": ... }.';
  if (lifePhaseMode) {
    s += '\n\n' + lifePhaseValidationInstruction();
  }
  if (opts.orchestrationDirectives) {
    s += '\n\nORCHESTRATION (follow closely):\n' + String(opts.orchestrationDirectives);
  }
  return s;
}

function buildSystemInstruction(includeLifePhaseSchema, opts = {}) {
  return minimalChatSystemInstruction({
    lifePhaseMode: !!includeLifePhaseSchema,
    premiumUnlocked: !!opts.premiumUnlocked,
    freeTier: !!opts.freeTier,
    orchestrationDirectives: opts.orchestrationDirectives
  });
}

/** @deprecated Use buildSystemInstruction(false) for chat; life-phase API uses buildSystemInstruction(true). */
function baseSystemInstruction() {
  return buildSystemInstruction(false, {});
}

function approxAscendantLongitudeFromSign(chart) {
  if (!chart || !chart.ascendant) return null;
  const signs = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces'
  ];
  const idx = signs.indexOf(String(chart.ascendant));
  if (idx < 0) return null;
  return idx * 30 + 15;
}

async function buildDailyTransitContext(chart, baseContext) {
  try {
    const ascApprox = approxAscendantLongitudeFromSign(chart);
    if (ascApprox == null) return { Natal_Chart: baseContext };
    const nowIso = new Date().toISOString();
    const snapshot = await buildTransitSnapshotAtUtc(nowIso, ascApprox);
    const compact = {
      generatedAt: snapshot.generatedAt,
      transitHouseNote: snapshot.transitHouseNote,
      planets: (snapshot.planets || []).map((p) => ({
        name: p.name,
        sign: p.sign,
        absoluteDegree: p.absoluteDegree,
        houseFromNatalAsc: p.houseFromNatalAsc,
        houseWholeSign: p.houseWholeSign,
        houseBhavaChalit: p.houseBhavaChalit,
        transitHouseMode: p.transitHouseMode
      }))
    };
    return {
      mode: 'daily_transit',
      Natal_Chart: baseContext,
      Current_Transit: compact
    };
  } catch {
    return { Natal_Chart: baseContext };
  }
}

function todayContext() {
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  let todayBS = null;
  try {
    const payload = buildKathmanduDatePayload();
    todayBS = {
      year: payload.bsYear,
      month: payload.bsMonth,
      day: payload.bsDay,
      formatted: payload.bsDate,
      nepaliFormatted: payload.bsDateNepali,
      gregorianDate: payload.gregorianDate
    };
  } catch {
    try {
      const bs = convertAdToBs(todayISO, 'Asia/Kathmandu');
      todayBS = {
        year: bs.year,
        month: bs.month,
        day: bs.day,
        formatted: bs.bsDate,
        nepaliFormatted: null,
        gregorianDate: todayISO
      };
    } catch {
      todayBS = null;
    }
  }
  return {
    todayISO,
    nowUTC: now.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    todayBS
  };
}

const BS_MONTHS_NP = [
  'बैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कात्तिक',
  'मंसिर',
  'पुष',
  'माघ',
  'फागुन',
  'चैत'
];

function toDevanagariNumber(value) {
  return String(value).replace(/\d/g, (d) => '०१२३४५६७८९'[Number(d)]);
}

function isTodayDateRequest(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return false;
  return (
    /(आजको\s*मिति|नेपाली\s*मिति|मिति|अहिलेको\s*मिति|आज\s*कति\s*गते)/u.test(t) ||
    /(aajko\s*miti|aaja\s*ko\s*miti|today'?s?\s*date|date\s*today|nepal\s*time)/i.test(t)
  );
}

function isDeterministicAstroFactRequest(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return false;
  const hasDailyMarker =
    /(आज|आजको|aaja|aajko|today|current|now|daily|dinko|दिनको)/i.test(t);
  const hasBsDateMismatchMarker =
    /(2076|२०७६|2083|२०८३)/.test(t) && /(मिति|date|bs|bikram|baisakh|बैशाख)/i.test(t);
  return (
    /(आजको\s*तिथि|आजको\s*नक्षत्र|चन्द्र\s*राशि|आजको\s*मिति|नेपाली\s*मिति)/u.test(t) ||
    /(tithi|nakshatra|current\s*tithi|current\s*nakshatra)/i.test(t) ||
    (hasDailyMarker && (/(चन्द्र\s*राशि|moon\s*sign|rashi|राशि)/i.test(t) || /(आजको\s*मिति|नेपाली\s*मिति|today'?s?\s*date)/i.test(t))) ||
    hasBsDateMismatchMarker
  );
}

function isExplicitDailyAstroQuery(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return false;
  return (
    /(आज|आजको|today|current|now|daily|dinko|दिनको|aaja|aajko)/i.test(t) &&
    /(मिति|date|तिथि|tithi|नक्षत्र|nakshatra|चन्द्र\s*राशि|moon\s*sign|panchanga|पञ्चाङ्ग)/i.test(t)
  );
}

function isTomorrowPanchangaRequest(text) {
  const t = String(text || '').trim().toLowerCase();
  return /(भोलि|भोली|voli|bholi)/u.test(t) && /(तिथि|नक्षत्र|पञ्चाङ्ग|panchanga|tithi|nakshatra)/i.test(t);
}

function isWeekPanchangaRequest(text) {
  const t = String(text || '').trim().toLowerCase();
  return /(यो\s*हप्ता|this\s*week|week)/i.test(t) && /(पञ्चाङ्ग|panchanga|tithi|nakshatra)/i.test(t);
}

function deterministicTodayDateReply() {
  try {
    const payload = buildKathmanduDatePayload();
    return `आजको मिति ${payload.bsDateNepali} गते हो।`;
  } catch {
    const ctx = todayContext();
    if (ctx.todayBS?.nepaliFormatted) {
      return `आजको मिति ${ctx.todayBS.nepaliFormatted} गते हो।`;
    }
    if (ctx.todayBS?.year && ctx.todayBS?.month && ctx.todayBS?.day) {
      const monthNp = BS_MONTHS_NP[Math.max(0, Math.min(11, Number(ctx.todayBS.month) - 1))] || String(ctx.todayBS.month);
      const bsText = `${toDevanagariNumber(ctx.todayBS.year)} ${monthNp} ${toDevanagariNumber(ctx.todayBS.day)} गते`;
      return `आजको मिति ${bsText} हो।`;
    }
    return 'आजको मिति अहिले निकाल्न मिलेन, कृपया फेरि प्रयास गर्नुहोस्।';
  }
}

async function deterministicAstroFactsReply(chart) {
  const { DateTime } = require('luxon');
  const nowKtm = DateTime.now().setZone('Asia/Kathmandu');
  const asc = Number.isFinite(Number(chart?.ascendantAbsoluteDegree))
    ? Number(chart.ascendantAbsoluteDegree)
    : 15;
  const snapshot = await buildTransitSnapshotAtUtc(nowKtm.toUTC().toISO(), asc);
  const astro = buildDeterministicAstroContextFromTransit(snapshot);
  const nepali = buildKathmanduDatePayload();
  if (!nepali?.bsDateNepali || !astro?.currentNakshatra || !astro?.moonSign) {
    return 'अहिलेको तिथि/नक्षत्र/मिति निकाल्न मिलेन, कृपया फेरि प्रयास गर्नुहोस्।';
  }
  const tithi = astro.currentTithiNepali && astro.currentTithiPakshaNepali
    ? `${astro.currentTithiPakshaNepali} ${astro.currentTithiNepali}`
    : astro.currentTithi || '—';
  const timeLabel = nowKtm.toFormat('hh:mm a');
  return `अहिले ${timeLabel} (नेपाल समय) अनुसार आजको मिति ${nepali.bsDateNepali} गते हो। तिथि ${tithi}, नक्षत्र ${astro.currentNakshatra || '—'}, र चन्द्र राशि ${astro.moonSign || '—'} हो।`;
}

function renderPanchangaLine(row) {
  const tithi = row?.tithiNepali && row?.pakshaNepali ? `${row.pakshaNepali} ${row.tithiNepali}` : row?.tithi || '—';
  return `${row.bsDateNepali} गते · तिथि ${tithi} · नक्षत्र ${row.nakshatra || '—'} · योग ${row.yoga || '—'} · करण ${row.karana || '—'} · चन्द्र राशि ${row.moonSign || '—'}`;
}

async function deterministicTomorrowPanchangaReply() {
  const { DateTime } = require('luxon');
  const tomorrow = DateTime.now().setZone('Asia/Kathmandu').plus({ days: 1 }).toISODate();
  const row = await buildPanchangaForDate(tomorrow);
  return `भोलिको पञ्चाङ्ग: ${renderPanchangaLine(row)}`;
}

async function deterministicWeekPanchangaReply() {
  const { DateTime } = require('luxon');
  const start = DateTime.now().setZone('Asia/Kathmandu').toISODate();
  const rows = await buildPanchangaRange(start, 7);
  const lines = rows.map((r, i) => `${i + 1}. ${renderPanchangaLine(r)}`);
  return `यो हप्ताको पञ्चाङ्ग (७ दिन):\n${lines.join('\n')}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientOpenAIError(err) {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '').toLowerCase();
  const status = Number(err?.response?.status || 0);
  if (status === 429 || status >= 500) return true;
  return (
    msg.includes('aborted') ||
    msg.includes('timeout') ||
    msg.includes('socket hang up') ||
    code === 'econnaborted' ||
    code === 'etimedout' ||
    code === 'econnreset'
  );
}

/**
 * Parse "Please retry in 8.xxxxxxs" from Google error bodies.
 */
function retryDelayMsFromError(err) {
  const msg = String(err?.message || '');
  const m = /retry in ([\d.]+)\s*s/i.exec(msg);
  if (!m) return 10000;
  const sec = Number(m[1]);
  return Math.min(65000, Math.max(3500, Math.ceil(sec * 1000) + 800));
}

function isGeminiQuotaError(err) {
  const msg = String(err?.message || '');
  return (
    msg.includes('429') ||
    msg.includes('Too Many Requests') ||
    msg.includes('quota') ||
    msg.includes('RESOURCE_EXHAUSTED')
  );
}

/** Google's own servers are temporarily overloaded -- distinct from OUR quota
 * being exhausted, but just as transient and just as worth a retry. Without
 * this, a "high demand" 503 fails on the very first attempt instead of
 * retrying like a 429 already does. */
function isGeminiOverloadError(err) {
  const msg = String(err?.message || '');
  return (
    msg.includes('503') ||
    msg.includes('Service Unavailable') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('overloaded') ||
    msg.includes('high demand')
  );
}

function isHardQuotaZeroError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return isGeminiQuotaError(err) && msg.includes('limit: 0');
}

function isGeminiAuthError(err) {
  const msg = String(err?.message || '');
  return /API[_ ]?KEY|invalid api key|API key not valid|401|403|PERMISSION_DENIED|permission denied/i.test(msg);
}

function isGeminiModelNotFound(err) {
  const msg = String(err?.message || '');
  return /404/.test(msg) && /model|not found/i.test(msg);
}

function markGeminiError(err) {
  if (!err) return;
  const msg = String(err?.message || err);
  runtimeStats.lastErrorMessage = msg.slice(0, 500);
  runtimeStats.lastErrorAt = new Date().toISOString();
  if (isGeminiQuotaError(err)) runtimeStats.quotaErrors += 1;
  if (isGeminiAuthError(err)) runtimeStats.authErrors += 1;
  if (isGeminiModelNotFound(err)) runtimeStats.modelNotFoundErrors += 1;
}

const QUOTA_REPLY_USER =
  'GrahaPath AI is temporarily rate-limited right now. Please wait a moment and try again. You can still use the chart wheel and report insights while chat capacity refreshes.';

/**
 * Avoid sending long Google error bodies to the client on chat replies.
 */
function chatReplyFallbackText(err) {
  if (isGeminiQuotaError(err)) return QUOTA_REPLY_USER;
  if (isGeminiAuthError(err)) {
    return (
      'GrahaPath AI authorization is not configured correctly on this server. ' +
      'Check API key setup in .env and restart the backend.'
    );
  }
  if (isGeminiModelNotFound(err)) {
    return (
      'The configured chat model is unavailable for the current key. Update model settings in .env and restart.'
    );
  }
  return 'GrahaPath AI had a temporary error. Try again in a moment or rephrase your question.';
}

/**
 * When Gemini returns 429 or similar, still show a short open from computed chart fields (no LLM).
 */
function buildLocalGreetingFallback(chart) {
  const nm = typeof chart?.name === 'string' && chart.name.trim() ? chart.name.trim() : '';
  const hello = nm ? `${nm}, your chart pattern is now active.` : 'Your chart pattern is now active.';
  const lagna = chart?.ascendant || null;
  const moon = chart?.moonSign || null;
  const dom = topPlanetsByWeight(chart, 2);

  const ab = chart?.astroBrain;
  const sum = ab?.summary;
  const md = ab?.currentDasha?.planet ?? sum?.currentMahadashaPlanet ?? null;
  const ad = ab?.currentAntardasha?.antarLord ?? sum?.currentAntardashaLord ?? null;

  const angleBits = [lagna && `${lagna} ascendant`, moon && `${moon} moon pattern`].filter(Boolean).join(' + ');

  let timing = '';
  if (md && ad) timing = ` Vimśottari emphasis now: ${md} mahādasha, ${ad} antardaśā — from your computed chart.`;
  else if (md) timing = ` Vimśottari emphasis now: ${md} mahādasha — from your computed chart.`;

  const structure = angleBits ? ` Core signature: ${angleBits}.` : ' Your chart is calculated from your birth data.';
  const domLine = dom.length ? ` Dominant drivers now: ${dom.join(' and ')}.` : '';

  return `${hello}${structure}${domLine}${timing} Ask about career timing, emotional cycles, relationships, mental patterns, or life direction.`;
}

function chartFirstName(chart) {
  const nm = typeof chart?.name === 'string' ? chart.name.trim() : '';
  if (!nm) return '';
  const part = nm.split(/\s+/)[0];
  return part || nm;
}

/** Short social openers — answer locally when Gemini returns 429 so “hi” isn’t a brick wall. */
function isTrivialSocialMessage(text) {
  const t = String(text || '').trim().toLowerCase().replace(/[!?.…]+$/u, '').trim();
  if (!t || t.length > 56) return false;
  return (
    /^(hi|hello|hey|hiya|yo|sup|namaste|namaskar)$/.test(t) ||
    /^(hi|hello|hey)\s+there$/.test(t) ||
    /^(good\s+(morning|afternoon|evening|night))$/.test(t) ||
    /^(thanks|thank you|thx|ok|okay|bye|goodbye)$/.test(t)
  );
}

function buildTrivialQuotaChatReply(chart) {
  const fn = chartFirstName(chart);
  const hey = fn ? `${fn}, hello — ` : 'Hello — ';
  return (
    `${hey}GrahaPath AI is temporarily busy right now, so a full chat answer is delayed for this turn. ` +
    'You can still use the chart wheel and report for immediate insights, then ask again shortly.'
  );
}

function topPlanetsByWeight(chart, cap = 3) {
  const list = Array.isArray(chart?.astroBrain?.dominantPlanets) ? chart.astroBrain.dominantPlanets : [];
  const norm = list
    .map((x) => {
      if (typeof x === 'string') return { name: x, w: 0 };
      if (x && typeof x === 'object') {
        return {
          name: x.planet || x.name || x.graha || null,
          w: Number(x.weight || x.score || 0)
        };
      }
      return { name: null, w: 0 };
    })
    .filter((x) => x.name)
    .sort((a, b) => b.w - a.w)
    .slice(0, cap);
  return norm.map((x) => x.name);
}

function intentFromMessageSimple(text) {
  const t = String(text || '').toLowerCase();
  if (/career|job|profession|work|business|promotion|10th|tenth/i.test(t)) return 'career';
  if (/money|wealth|finance|salary|income|debt|savings|11th|2nd|second/i.test(t)) return 'wealth';
  if (/marriage|spouse|partner|love|relationship|7th|seventh/i.test(t)) return 'relationship';
  if (/health|illness|disease|hospital|6th|sixth|8th|eighth/i.test(t)) return 'health';
  if (/spiritual|dharma|moksha|meditation|9th|ninth|12th|twelfth/i.test(t)) return 'spiritual';
  return 'general';
}

function mapDetectedIntentToLegacyDomain(detectedIntent, userMessage) {
  if (detectedIntent === 'career_question') return 'career';
  if (detectedIntent === 'relationship_question') return 'relationship';
  if (detectedIntent === 'remedies_question') return 'spiritual';
  return intentFromMessageSimple(userMessage);
}

function buildQuotaLocalIntentReply(chart, userMessage, detectedIntent) {
  const fn = chartFirstName(chart);
  const intent = detectedIntent || detectChatIntent(userMessage);

  if (intent === 'small_talk') {
    const hey = fn ? `${fn}, ` : '';
    return `${hey}Thik cha — GrahaPath AI is in local fallback right now, so I can’t run the full model. When service is back, ask casually about career, daily timing, relationship, or emotional patterns.`;
  }
  if (intent === 'capability_question') {
    return `${fn ? fn + ', ' : ''}Local fallback: GrahaPath can cover career direction, relationship patterns, emotional cycles, daily timing, dasha phase, wealth pressure, and remedies from your chart when the AI service is available. Try one focused question.`;
  }
  if (intent === 'daily_forecast') {
    return `${fn ? fn + ', ' : ''}Local fallback: for day-level timing I need the live chat model. Check back shortly, or use the chart wheel while capacity refreshes.`;
  }

  const lagna = chart?.ascendant || 'unknown';
  const moon = chart?.moonSign || 'unknown';
  const sun = chart?.sunSign || 'unknown';
  const md = chart?.astroBrain?.currentDasha?.planet || chart?.astroBrain?.summary?.currentMahadashaPlanet || null;
  const ad = chart?.astroBrain?.currentAntardasha?.antarLord || chart?.astroBrain?.summary?.currentAntardashaLord || null;
  const dom = topPlanetsByWeight(chart, 3);
  const domText = dom.length ? dom.join(', ') : 'chart-supported grahas';
  const domain = mapDetectedIntentToLegacyDomain(intent, userMessage);
  const open = fn ? `${fn}, here is a short chart-based note (local fallback).` : 'Short chart-based note (local fallback).';
  const base = ` Baseline: Lagna ${lagna}, Moon ${moon}, Sun ${sun}${md ? `, running ${md} mahadasha` : ''}${ad ? ` and ${ad} antardasha` : ''}.`;
  const strength = ` Dominant drivers now: ${domText}.`;

  let focus =
    ' Stay with one priority at a time; ask a sharper follow-up when chat is back online.';
  if (domain === 'career') {
    focus =
      ' Career: favor skill consolidation and visible output; use dasha as a timing filter for bigger moves.';
  } else if (domain === 'wealth') {
    focus = ' Wealth: protect cashflow first; avoid speculative leaps outside supportive windows.';
  } else if (domain === 'relationship') {
    focus = ' Relationships: pacing and clear communication beat intensity; avoid reactive decisions in friction.';
  } else if (domain === 'health') {
    focus = ' Health: steady sleep and stress rhythm matter more than sporadic intensity.';
  } else if (domain === 'spiritual') {
    focus = ' Remedies/spiritual: one steady daily practice beats occasional extremes.';
  }

  return `${open}${base}${strength}${focus}`;
}

/** No Gemini HTTP calls — for testing GrahaPath without quota or billing. */
function buildOfflineGeminiReply(chart, userMessage) {
  const fn = chartFirstName(chart);
  const prefix = fn ? `${fn}, ` : '';
  if (isTrivialSocialMessage(userMessage)) {
    return (
      `${prefix}hello — GrahaPath chat is currently running in local-only mode. ` +
      'Use the wheel and report for placements and quick insights.'
    );
  }
  return (
    `${prefix}GrahaPath AI is currently using local mode on this server. ` +
    'Explore your chart via the wheel, house logic, and report for immediate guidance.'
  );
}

async function withGemini429Retry(operation, label, maxAttempts = 4) {
  let lastErr;
  const max = maxAttempts;
  for (let attempt = 1; attempt <= max; attempt += 1) {
    try {
      return await operation();
    } catch (e) {
      lastErr = e;
      if (isHardQuotaZeroError(e)) {
        // Fail fast when Google reports zero available quota; retries only multiply blocked calls.
        throw e;
      }
      const overloaded = isGeminiOverloadError(e);
      if ((!isGeminiQuotaError(e) && !overloaded) || attempt === max) {
        throw e;
      }
      const waitMs = retryDelayMsFromError(e) + attempt * 1500;
      console.warn(
        `[GrahaPath] Gemini ${label}: ${overloaded ? 'service overloaded' : 'quota/rate limit'} — retry ${attempt}/${max - 1} after ${waitMs}ms`
      );
      await sleep(waitMs);
    }
  }
  throw lastErr;
}

function envPositiveInt(name, fallback) {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function clampText(input, maxLen) {
  const t = String(input || '').trim();
  if (!t) return '';
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(1, maxLen - 1))}…`;
}

function compactHistory(messages) {
  const maxTurns = envPositiveInt('GEMINI_CHAT_HISTORY_TURNS', 6);
  const maxChars = envPositiveInt('GEMINI_CHAT_HISTORY_CHARS', 420);
  const source = Array.isArray(messages) ? messages : [];
  const sliced = source.slice(-maxTurns);
  const out = [];
  for (const m of sliced) {
    if (!m || !m.role || !m.content) continue;
    const text = clampText(m.content, maxChars);
    if (!text) continue;
    if (m.role === 'user') out.push({ role: 'user', parts: [{ text }] });
    if (m.role === 'assistant') out.push({ role: 'model', parts: [{ text }] });
  }
  return out;
}

function modelWithContext(chartJson, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured');
    err.statusCode = 503;
    throw err;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const chartBlock =
    typeof chartJson === 'object' && chartJson !== null
      ? JSON.stringify(chartJson)
      : '{}';

  const nowCtx = JSON.stringify(todayContext());
  const lifePhase = Boolean(options.lifePhaseMode);
  const systemInstruction = `${buildSystemInstruction(lifePhase, {
    premiumUnlocked: options.premiumUnlocked,
    freeTier: options.freeTier,
    orchestrationDirectives: options.orchestrationDirectives
  })}\n\nTODAY_CONTEXT (authoritative):\n${nowCtx}\n\nSTRICT_USER_DATA (authoritative; if a field is missing, say you cannot see it in the snapshot):\n${chartBlock}`;

  return genAI.getGenerativeModel({
    model: resolvedGeminiModelId(),
    systemInstruction
  });
}

function resolveAscendantAbsoluteDegree(chart) {
  const n = Number(chart?.ascendantAbsoluteDegree);
  if (Number.isFinite(n)) return n;
  return approxAscendantLongitudeFromSign(chart);
}

async function buildStrictUserDataContext(chart, effectiveUserMessage, mode) {
  const natalProfile = formatChartForGeminiForIntent(chart, effectiveUserMessage);
  const context = {
    mode: String(mode || 'message'),
    Natal_Profile: natalProfile
  };
  try {
    const ascAbs = resolveAscendantAbsoluteDegree(chart);
    if (!Number.isFinite(ascAbs)) return context;
    const nowIso = new Date().toISOString();
    const snapshot = await buildTransitSnapshotAtUtc(nowIso, ascAbs);
    context.Current_Live_Transit = {
      generatedAt: snapshot.generatedAt,
      transitHouseNote: snapshot.transitHouseNote,
      planets: (snapshot.planets || []).map((p) => ({
        name: p.name,
        sign: p.sign,
        absoluteDegree: p.absoluteDegree,
        houseFromNatalAsc: p.houseFromNatalAsc,
        houseWholeSign: p.houseWholeSign,
        houseBhavaChalit: p.houseBhavaChalit,
        transitHouseMode: p.transitHouseMode
      }))
    };
  } catch {
    // Keep natal-only context when transit snapshot is unavailable.
  }
  return context;
}

async function generateOpenAIText({
  chartContext,
  userMessage,
  messages,
  purpose,
  lifePhaseMode = false,
  premiumUnlocked = false,
  freeTier = false,
  orchestrationDirectives = '',
  maxTokens,
  temperature
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not configured');
    err.statusCode = 503;
    throw err;
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const history = Array.isArray(messages) ? messages : [];
  const compactHistory = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
    .slice(-6)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content).slice(0, 600)
    }));

  const system = `${buildSystemInstruction(!!lifePhaseMode, {
    premiumUnlocked,
    freeTier,
    orchestrationDirectives
  })}

TODAY_CONTEXT:
${JSON.stringify(todayContext())}

STRICT_USER_DATA:
${JSON.stringify(chartContext || {}, null, 0)}
`;

  const userPrompt =
    purpose === 'greeting'
      ? 'Write exactly two sentences welcoming the native and summarizing the strongest chart emphasis from STRICT_USER_DATA only.'
      : String(userMessage || '');

  const defaultTemp = purpose === 'greeting' ? 0.55 : 0.65;
  const defaultMax = purpose === 'greeting' ? 180 : 640;
  const body = {
    model,
    temperature: typeof temperature === 'number' ? temperature : defaultTemp,
    max_tokens: typeof maxTokens === 'number' ? maxTokens : defaultMax,
    messages: [{ role: 'system', content: system }, ...compactHistory, { role: 'user', content: userPrompt }]
  };

  const attempts = Math.max(1, envPositiveInt('OPENAI_RETRY_ATTEMPTS', 3));
  const timeoutMs = Math.max(10000, envPositiveInt('OPENAI_TIMEOUT_MS', 45000));
  let lastErr;
  let res;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      res = await axios.post('https://api.openai.com/v1/chat/completions', body, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: timeoutMs
      });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      if (!isTransientOpenAIError(e) || i === attempts) {
        throw e;
      }
      const waitMs = 600 * i;
      console.warn(`[GrahaPath] OpenAI transient error, retry ${i}/${attempts - 1} after ${waitMs}ms`);
      await sleep(waitMs);
    }
  }
  if (!res && lastErr) throw lastErr;

  const out = res?.data?.choices?.[0]?.message?.content;
  return typeof out === 'string' ? out.trim() : '';
}

/**
 * Lightweight connectivity/quota probe for ops visibility.
 * Uses tiny context and prompt to detect key/model/quota readiness.
 */
async function probeGeminiReadiness() {
  if (shouldUseOpenAI()) {
    if (!process.env.OPENAI_API_KEY) {
      return { ok: false, mode: 'openai', reason: 'missing_openai_api_key' };
    }
    try {
      const text = await generateOpenAIText({
        chartContext: { _: 'gp_probe' },
        userMessage: 'Reply with OK',
        messages: [],
        purpose: 'greeting'
      });
      return {
        ok: true,
        mode: 'openai',
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        responsePreview: text.slice(0, 40) || 'OK'
      };
    } catch (err) {
      return {
        ok: false,
        mode: 'openai',
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        message: String(err?.response?.data?.error?.message || err?.message || err)
      };
    }
  }
  if (!shouldUseGemini()) {
    return { ok: false, mode: 'disabled', reason: `CHAT_PROVIDER=${chatProviderMode()}` };
  }
  if (process.env.GEMINI_OFFLINE_AI === 'true') {
    return { ok: false, mode: 'offline', reason: 'GEMINI_OFFLINE_AI=true' };
  }
  if (!process.env.GEMINI_API_KEY) {
    return { ok: false, mode: 'online', reason: 'missing_api_key' };
  }

  try {
    const model = modelWithContext({ _: 'gp_probe' });
    const result = await withGemini429Retry(() => model.generateContent('Reply with: OK'), 'probe', 1);
    const text = result.response?.text?.();
    return {
      ok: true,
      mode: 'online',
      model: resolvedGeminiModelId(),
      responsePreview: typeof text === 'string' ? text.trim().slice(0, 40) : 'OK'
    };
  } catch (err) {
    const message = String(err?.message || err);
    return {
      ok: false,
      mode: 'online',
      model: resolvedGeminiModelId(),
      quotaLimited: isGeminiQuotaError(err),
      authError: isGeminiAuthError(err),
      modelNotFound: isGeminiModelNotFound(err),
      message
    };
  }
}

/**
 * Two-sentence opening aligned with chart JSON.
 */
async function generateGreeting(chart) {
  if (shouldUseOpenAI()) {
    const slim = formatChartForGreetingGemini(chart);
    try {
      const out = await generateOpenAIText({
        chartContext: slim,
        userMessage: '',
        messages: [],
        purpose: 'greeting'
      });
      return out || buildLocalGreetingFallback(chart);
    } catch (_err) {
      return buildLocalGreetingFallback(chart);
    }
  }
  if (!shouldUseGemini()) {
    return buildLocalGreetingFallback(chart);
  }
  if (process.env.GEMINI_OFFLINE_AI === 'true' || process.env.GEMINI_OFFLINE_GREETING_ONLY === 'true') {
    return buildLocalGreetingFallback(chart);
  }

  const slim =
    process.env.GEMINI_GREETING_SLIM === 'false'
      ? formatChartForGemini(chart)
      : formatChartForGreetingGemini(chart);
  const model = modelWithContext(slim, { lifePhaseMode: false, premiumUnlocked: false, freeTier: false });

  const prompt =
    'Write exactly two sentences only. Greet the native by first name if present in JSON, otherwise say "your chart". ' +
    'Summarize the dominant chart signature in a human, chart-aware style using ONLY the JSON, then invite 3-5 chart question types (career timing, emotional cycles, relationships, mental patterns, life direction). No guaranteed outcome language.';

  try {
    const result = await withGemini429Retry(() => model.generateContent(prompt), 'greeting', 2);
    const text = result.response?.text?.();
    const out = typeof text === 'string' ? text.trim() : '';
    if (out) return out;
  } catch (e) {
    if (process.env.GEMINI_DISABLE_QUOTA_FALLBACK !== 'true' && isGeminiQuotaError(e)) {
      console.warn('[GrahaPath] Gemini greeting quota error — returning computed fallback.');
      return buildLocalGreetingFallback(chart);
    }
    throw e;
  }
  return buildLocalGreetingFallback(chart);
}

/**
 * @param {object} chart — raw chart
 * @param {{ role: string, content: string }[]} messages — prior turns (user/assistant), excludes pending message
 * @param {string} userMessage
 */
async function generateReply(chart, messages, userMessage, mode = 'message', opts = {}) {
  runtimeStats.replyCalls += 1;
  const lifePhaseActive = String(mode || 'message') === 'life_phases' || opts?.lifePhaseMode === true;
  const isDailyTransitMode = String(mode || 'message') === 'daily_transit';
  const rawMsg = String(userMessage || '').trim();
  const userContent =
    rawMsg ||
    (isDailyTransitMode
      ? 'Give today-focused transit guidance grounded in Current_Live_Transit and natal context.'
      : '');

  if (!lifePhaseActive && isExplicitDailyAstroQuery(userContent) && isTodayDateRequest(userContent)) {
    runtimeStats.replySuccess += 1;
    return deterministicTodayDateReply();
  }
  if (!lifePhaseActive && isExplicitDailyAstroQuery(userContent) && isDeterministicAstroFactRequest(userContent)) {
    runtimeStats.replySuccess += 1;
    try {
      return await deterministicAstroFactsReply(chart);
    } catch {
      return 'अहिलेको तिथि/नक्षत्र/मिति निकाल्न मिलेन, कृपया फेरि प्रयास गर्नुहोस्।';
    }
  }
  if (!lifePhaseActive && isTomorrowPanchangaRequest(userContent)) {
    runtimeStats.replySuccess += 1;
    try {
      return await deterministicTomorrowPanchangaReply();
    } catch {
      return 'भोलिको पञ्चाङ्ग निकाल्न मिलेन, कृपया फेरि प्रयास गर्नुहोस्।';
    }
  }
  if (!lifePhaseActive && isWeekPanchangaRequest(userContent)) {
    runtimeStats.replySuccess += 1;
    try {
      return await deterministicWeekPanchangaReply();
    } catch {
      return 'यो हप्ताको पञ्चाङ्ग निकाल्न मिलेन, कृपया फेरि प्रयास गर्नुहोस्।';
    }
  }

  const premiumUnlocked = !!opts?.premiumUnlocked;
  const freeTier = !!opts?.freeTier;
  const orchestrationDirectives = opts.orchestrationDirectives || '';
  const detectedIntent = opts.detectedIntent || null;
  const maxTokens = typeof opts.maxTokens === 'number' ? opts.maxTokens : undefined;
  const temperature = typeof opts.temperature === 'number' ? opts.temperature : undefined;

  if (shouldUseOpenAI()) {
    try {
      const context = opts.strictUserDataOverride
        ? opts.strictUserDataOverride
        : await buildStrictUserDataContext(chart, userContent, mode);
      const out = await generateOpenAIText({
        chartContext: context,
        userMessage: userContent,
        messages,
        purpose: 'reply',
        lifePhaseMode: lifePhaseActive,
        premiumUnlocked,
        freeTier,
        orchestrationDirectives,
        maxTokens,
        temperature
      });
      if (out) {
        runtimeStats.replySuccess += 1;
        return out;
      }
      runtimeStats.fallbackResponses += 1;
      return buildQuotaLocalIntentReply(chart, userContent, detectedIntent);
    } catch (e) {
      runtimeStats.fallbackResponses += 1;
      runtimeStats.lastErrorMessage = String(e?.response?.data?.error?.message || e?.message || e).slice(0, 500);
      runtimeStats.lastErrorAt = new Date().toISOString();
      return buildQuotaLocalIntentReply(chart, userContent, detectedIntent);
    }
  }
  if (!shouldUseGemini()) {
    runtimeStats.fallbackResponses += 1;
    return buildQuotaLocalIntentReply(chart, userContent, detectedIntent);
  }
  if (process.env.GEMINI_OFFLINE_AI === 'true') {
    runtimeStats.fallbackResponses += 1;
    return buildOfflineGeminiReply(chart, userContent);
  }

  const context = opts.strictUserDataOverride
    ? opts.strictUserDataOverride
    : await buildStrictUserDataContext(chart, userContent, mode);
  if (context && context.error === 'invalid_chart') {
    const err = new Error('Chart data invalid for GrahaPath AI.');
    err.statusCode = 400;
    throw err;
  }

  const model = modelWithContext(context, {
    lifePhaseMode: lifePhaseActive,
    premiumUnlocked,
    freeTier,
    orchestrationDirectives
  });

  let prior = Array.isArray(messages) ? [...messages] : [];
  while (prior.length && prior[0].role === 'assistant') {
    prior.shift();
  }
  const history = compactHistory(prior);
  const outputTokens =
    typeof maxTokens === 'number'
      ? Math.min(1024, Math.max(200, maxTokens))
      : envPositiveInt('GEMINI_MAX_OUTPUT_TOKENS', 768);
  const replyRetries = envPositiveInt('GEMINI_REPLY_RETRY_ATTEMPTS', 4);
  const genTemp = typeof temperature === 'number' ? temperature : 0.65;

  const chat = model.startChat({
    history,
    generationConfig: {
      maxOutputTokens: outputTokens,
      temperature: genTemp
    }
  });

  try {
    const result = await withGemini429Retry(() => chat.sendMessage(String(userContent)), 'reply', replyRetries);
    const text = result.response?.text?.();
    const out = typeof text === 'string' ? text.trim() : '';
    if (out) {
      runtimeStats.replySuccess += 1;
      return out;
    }
    return 'I could not generate a reply just now — try shortening your question or asking again.';
  } catch (e) {
    markGeminiError(e);
    // Rescue pass: use ultra-light chart context + no chat history to reduce token pressure.
    if (isGeminiQuotaError(e) && process.env.GEMINI_RESCUE_DISABLED !== 'true') {
      try {
        const rescueContext = formatChartForGeminiRescue(chart, userContent);
        const rescueModel = modelWithContext(rescueContext, {
          lifePhaseMode: lifePhaseActive,
          premiumUnlocked,
          freeTier,
          orchestrationDirectives
        });
        const rescueChat = rescueModel.startChat({
          history: [],
          generationConfig: {
            maxOutputTokens: Math.min(outputTokens, 640),
            temperature: genTemp
          }
        });
        const rescueResult = await withGemini429Retry(
          () => rescueChat.sendMessage(String(userContent)),
          'reply-rescue',
          Math.max(2, replyRetries - 1)
        );
        const rescueText = rescueResult.response?.text?.();
        const rescueOut = typeof rescueText === 'string' ? rescueText.trim() : '';
        if (rescueOut) {
          runtimeStats.replySuccess += 1;
          runtimeStats.rescueSuccess += 1;
          console.warn('[GrahaPath] Gemini reply rescued with compact context.');
          return rescueOut;
        }
      } catch (rescueError) {
        markGeminiError(rescueError);
        runtimeStats.rescueFailure += 1;
        console.warn('[GrahaPath] Gemini rescue attempt failed.', String(rescueError?.message || rescueError));
      }
    }

    if (process.env.GEMINI_DISABLE_QUOTA_FALLBACK === 'true') throw e;
    runtimeStats.fallbackResponses += 1;
    console.warn('[GrahaPath] Gemini reply error — returning fallback text.', String(e?.message || e));
    if (isGeminiQuotaError(e) && isTrivialSocialMessage(userContent)) {
      return buildTrivialQuotaChatReply(chart);
    }
    if (isGeminiQuotaError(e) && process.env.GEMINI_LOCAL_INTENT_FALLBACK !== 'false') {
      return buildQuotaLocalIntentReply(chart, userContent, detectedIntent);
    }
    return chatReplyFallbackText(e);
  }
}

function getGeminiRuntimeStats() {
  return {
    ...runtimeStats
  };
}

module.exports = {
  generateGreeting,
  generateReply,
  probeGeminiReadiness,
  getGeminiRuntimeStats,
  formatChartForGemini,
  formatChartForGeminiBrief,
  baseSystemInstruction,
  buildSystemInstruction,
  buildLocalGreetingFallback
};
