const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { detectIntent } = require('./intentDetector');
const { buildChatContext } = require('./contextBuilder');
const {
  buildSystemPrompt,
  buildGreetingSystemPrompt,
  tokenAndTemperatureForIntent,
  normalizePlan
} = require('./promptBuilder');
const {
  formatAnswer,
  looksLikeReportOrLifePhaseJson,
  BIRTH_DETAILS_REDIRECT,
  proseFallback
} = require('./responseFormatter');
const { buildDailyGrahaWeatherFromTransit } = require('../dailyGrahaWeatherService');
const { DateTime } = require('luxon');
const {
  buildPanchangaForDate,
  buildPanchangaRange,
  buildDeterministicAstroContextFromTransit
} = require('../currentAstronomyService');
const { buildTransitSnapshotAtUtc } = require('../astrologyService');
const { buildKathmanduDatePayload } = require('../nepaliDateService');
function resolveAscendantAbsoluteDegree(chart) {
  const n = Number(chart?.ascendantAbsoluteDegree);
  if (Number.isFinite(n)) return n;
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const idx = signs.indexOf(String(chart?.ascendant || ''));
  return idx >= 0 ? idx * 30 + 15 : 15;
}

function isDeterministicAstroFactRequest(text) {
  const t = String(text || '').trim().toLowerCase();
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

function renderPanchangaLine(row) {
  const tithi = row?.tithiNepali && row?.pakshaNepali ? `${row.pakshaNepali} ${row.tithiNepali}` : row?.tithi || '—';
  return `${row.bsDateNepali} गते · तिथि ${tithi} · नक्षत्र ${row.nakshatra || '—'} · योग ${row.yoga || '—'} · करण ${row.karana || '—'} · चन्द्र राशि ${row.moonSign || '—'}`;
}

function buildFameTimingDeterministicReply(fameTiming, userMessage) {
  const ft = fameTiming || {};
  if (ft.timingDataStatus !== 'ok' || !ft.primaryRecognitionWindow) {
    return 'Past-age timing table is unavailable for this chart payload. Please regenerate the chart from birth details and try again.';
  }

  const primary = ft.primaryRecognitionWindow;
  const open = `Strongest recognition window from your chart timing is age ${primary.ageRangeLabel || primary.age} (${primary.calendarYears || 'year unavailable'}), ${primary.mahaDasha || '—'}–${primary.antarDasha || '—'} with score ${primary.recognitionScore}.`;
  const rows = Array.isArray(ft.queriedAges) ? ft.queriedAges : [];
  if (!rows.length) {
    const second = Array.isArray(ft.topRecognitionWindows) ? ft.topRecognitionWindows[1] : null;
    if (second) {
      return `${open} Next strong window: age ${second.ageRangeLabel || second.age} (${second.calendarYears || 'year unavailable'}), ${second.mahaDasha || '—'}–${second.antarDasha || '—'}, score ${second.recognitionScore}.`;
    }
    return open;
  }

  const asked = String(userMessage || '');
  const ranked = [...rows].sort((a, b) => Number(b.recognitionScore || 0) - Number(a.recognitionScore || 0));
  const lines = ranked
    .slice(0, 5)
    .map((r) => {
      const ageLabel = r.ageRangeLabel || r.age;
      const years = r.calendarYears || r.calendarYear || 'year unavailable';
      return `Age ${ageLabel} (${years}) → ${r.mahaDasha || '—'}–${r.antarDasha || '—'}, score ${r.recognitionScore}, ${r.matchVsTopWindow || 'unknown'}.`;
    });

  const best = ft.bestAmongQueried;
  const bestLine = best
    ? `Best among your asked ages: ${best.ageRangeLabel || best.age} (${best.calendarYears || best.calendarYear || 'year unavailable'}) with ${best.mahaDasha || '—'}–${best.antarDasha || '—'} score ${best.recognitionScore}.`
    : '';
  const guard =
    /first|begin|start|breakout|debut|पहिलो|सुरु/i.test(asked) && primary.ageRangeLabel
      ? `For first recognition, prioritize ${primary.ageRangeLabel} (${primary.calendarYears || 'year unavailable'}) over later peaks.`
      : '';

  return [open, bestLine, lines.join(' '), guard].filter(Boolean).join(' ');
}

function extractHouseClaimConflicts(answerText, immutableChartState) {
  const text = String(answerText || '');
  const map = immutableChartState || {};
  if (!text.trim() || !map || typeof map !== 'object') return [];

  const expectedHouseByPlanet = {};
  for (let house = 1; house <= 12; house += 1) {
    const key =
      house === 1 ? '1st_House' : house === 2 ? '2nd_House' : house === 3 ? '3rd_House' : `${house}th_House`;
    const rows = Array.isArray(map[key]) ? map[key] : [];
    for (const label of rows) {
      const planet = String(label || '').split('_')[0];
      if (!planet) continue;
      expectedHouseByPlanet[planet.toLowerCase()] = house;
    }
  }

  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const conflicts = [];
  for (const planet of planets) {
    const expected = expectedHouseByPlanet[planet.toLowerCase()];
    if (!Number.isFinite(expected)) continue;
    const re = new RegExp(`\\b${planet}\\b[^\\n.]{0,48}?\\b(?:in|at)\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+house\\b`, 'gi');
    let match;
    while ((match = re.exec(text)) !== null) {
      const claimed = Number(match[1]);
      if (claimed >= 1 && claimed <= 12 && claimed !== expected) {
        conflicts.push({
          planet,
          expectedHouse: expected,
          claimedHouse: claimed
        });
      }
    }
  }
  return conflicts;
}

function extractLordshipConflicts(answerText, immutableSignLordship) {
  const text = String(answerText || '');
  const map = immutableSignLordship && typeof immutableSignLordship === 'object' ? immutableSignLordship : null;
  if (!text.trim() || !map) return [];

  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
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

  const planetByLower = Object.fromEntries(planets.map((p) => [p.toLowerCase(), p]));
  const signByLower = Object.fromEntries(signs.map((s) => [s.toLowerCase(), s]));
  const conflicts = [];

  const addConflict = (signRaw, claimedPlanetRaw) => {
    const sign = signByLower[String(signRaw || '').toLowerCase()];
    const claimedPlanet = planetByLower[String(claimedPlanetRaw || '').toLowerCase()];
    if (!sign || !claimedPlanet) return;
    const expectedPlanet = map[sign];
    if (!expectedPlanet) return;
    if (String(expectedPlanet).toLowerCase() !== String(claimedPlanet).toLowerCase()) {
      conflicts.push({
        sign,
        expectedLord: expectedPlanet,
        claimedLord: claimedPlanet
      });
    }
  };

  // "Mercury is lord of Cancer"
  const p1 = /\b(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\b[^.\n]{0,40}?\b(?:is|as)\b[^.\n]{0,20}?\b(?:lord|owner)\b[^.\n]{0,20}?\bof\b[^.\n]{0,10}?\b(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/gi;
  let m1;
  while ((m1 = p1.exec(text)) !== null) {
    addConflict(m1[2], m1[1]);
  }

  // "lord of Cancer is Mercury"
  const p2 = /\blord\b[^.\n]{0,10}?\bof\b[^.\n]{0,10}?\b(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b[^.\n]{0,30}?\b(?:is|:)\b[^.\n]{0,10}?\b(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\b/gi;
  let m2;
  while ((m2 = p2.exec(text)) !== null) {
    addConflict(m2[1], m2[2]);
  }

  return conflicts;
}

async function deterministicAstroFactsReply(chart) {
  // Use real-time Nepal snapshot (not fixed 6:00 AM daily anchor) so
  // "right now" questions don't feel stale around intraday transitions.
  const nowKtm = DateTime.now().setZone('Asia/Kathmandu');
  const ascForTransit = resolveAscendantAbsoluteDegree(chart);
  const snapshot = await buildTransitSnapshotAtUtc(nowKtm.toUTC().toISO(), ascForTransit);
  const astro = buildDeterministicAstroContextFromTransit(snapshot);
  const nepali = buildKathmanduDatePayload();
  const tithi = astro.currentTithiNepali && astro.currentTithiPakshaNepali
    ? `${astro.currentTithiPakshaNepali} ${astro.currentTithiNepali}`
    : astro.currentTithi || '—';
  const timeLabel = nowKtm.toFormat('hh:mm a');
  return `अहिले ${timeLabel} (नेपाल समय) अनुसार आजको मिति ${nepali.bsDateNepali} गते हो। तिथि ${tithi}, नक्षत्र ${astro.currentNakshatra || '—'}, र चन्द्र राशि ${astro.moonSign || '—'} हो। यो उत्तर real-time खगोलीय snapshot बाट निकालिएको हो।`;
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_MODEL_ALIASES = {
  'gemini-1.5-flash': DEFAULT_GEMINI_MODEL,
  'gemini-1.5-flash-latest': DEFAULT_GEMINI_MODEL,
  'gemini-1.5-flash-001': DEFAULT_GEMINI_MODEL,
  'gemini-1.5-flash-8b': DEFAULT_GEMINI_MODEL,
  'gemini-pro': DEFAULT_GEMINI_MODEL
};

function chatProviderMode() {
  return String(process.env.CHAT_PROVIDER || 'local').trim().toLowerCase();
}

function shouldUseOpenAI() {
  if (!String(process.env.OPENAI_API_KEY || '').trim()) return false;
  if (chatProviderMode() === 'gemini') return false;
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
  return GEMINI_MODEL_ALIASES[lowered] ?? raw;
}

function envPositiveInt(name, fallback) {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
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

function compactHistory(messages, maxTurns = 6, maxChars = 600) {
  const src = Array.isArray(messages) ? messages : [];
  const sliced = src.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content).slice(-maxTurns);
  return sliced.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content).slice(0, maxChars)
  }));
}

async function completeOpenAI({ systemText, userMessage, conversationHistory, maxTokens, temperature }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not configured');
    err.statusCode = 503;
    throw err;
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const hist = compactHistory(conversationHistory);
  const body = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [{ role: 'system', content: systemText }, ...hist, { role: 'user', content: userMessage }]
  };
  const attempts = Math.max(1, envPositiveInt('OPENAI_RETRY_ATTEMPTS', 3));
  const timeoutMs = Math.max(10000, envPositiveInt('OPENAI_TIMEOUT_MS', 45000));
  let lastErr;
  let res;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      res = await axios.post('https://api.openai.com/v1/chat/completions', body, {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: timeoutMs
      });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      if (!isTransientOpenAIError(e) || i === attempts) throw e;
      await sleep(600 * i);
    }
  }
  if (!res && lastErr) throw lastErr;
  const out = res?.data?.choices?.[0]?.message?.content;
  return typeof out === 'string' ? out.trim() : '';
}

async function completeGemini({ systemText, userMessage, conversationHistory, maxTokens, temperature }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured');
    err.statusCode = 503;
    throw err;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: resolvedGeminiModelId(),
    systemInstruction: systemText
  });
  const hist = [];
  const src = compactHistory(conversationHistory);
  for (const m of src) {
    if (m.role === 'user') hist.push({ role: 'user', parts: [{ text: m.content }] });
    else hist.push({ role: 'model', parts: [{ text: m.content }] });
  }
  const chat = model.startChat({
    history: hist,
    generationConfig: { maxOutputTokens: Math.min(1024, maxTokens + 200), temperature }
  });
  const result = await chat.sendMessage(userMessage);
  const text = result.response?.text?.();
  return typeof text === 'string' ? text.trim() : '';
}

async function invokeModel(params) {
  if (shouldUseOpenAI()) {
    return completeOpenAI(params);
  }
  if (shouldUseGemini()) {
    return completeGemini(params);
  }
  if (process.env.GEMINI_OFFLINE_AI === 'true') {
    return 'GrahaPath AI chat is in local-only mode. Configure OPENAI_API_KEY or GEMINI_API_KEY for live answers.';
  }
  const err = new Error('No chat model configured. Set OPENAI_API_KEY or use CHAT_PROVIDER=gemini with GEMINI_API_KEY.');
  err.statusCode = 503;
  throw err;
}

async function maybeDailyWeather(chart, intent) {
  if (intent !== 'daily_forecast' && intent !== 'small_talk') return null;
  try {
    return await buildDailyGrahaWeatherFromTransit(chart);
  } catch {
    return null;
  }
}

async function runGreeting({ chart, userPlan, premiumUnlocked, conversationHistory }) {
  const dw = await maybeDailyWeather(chart, 'small_talk');
  const ctx = await buildChatContext(chart, 'small_talk', { dailyWeather: dw, userPlan, premiumUnlocked });
  const systemBase = buildGreetingSystemPrompt({ userPlan, premiumUnlocked });
  const systemText = systemBase + JSON.stringify(ctx);
  const raw = await invokeModel({
    systemText,
    userMessage: 'Write the two-sentence greeting exactly as instructed in the system prompt.',
    conversationHistory: conversationHistory || [],
    maxTokens: 200,
    temperature: 0.55
  });
  const answer = formatAnswer(raw, 'hello');
  return { mode: 'greeting', intent: 'greeting', answer };
}

async function runMessage({
  chart,
  message,
  userPlan,
  premiumUnlocked,
  conversationHistory,
  surfaceMode
}) {
  if (isTomorrowPanchangaRequest(message)) {
    const tomorrow = DateTime.now().setZone('Asia/Kathmandu').plus({ days: 1 }).toISODate();
    const row = await buildPanchangaForDate(tomorrow);
    return { mode: 'message', intent: 'deterministic_panchanga', answer: `भोलिको पञ्चाङ्ग: ${renderPanchangaLine(row)}` };
  }
  if (isWeekPanchangaRequest(message)) {
    const start = DateTime.now().setZone('Asia/Kathmandu').toISODate();
    const rows = await buildPanchangaRange(start, 7);
    const lines = rows.map((r, i) => `${i + 1}. ${renderPanchangaLine(r)}`);
    return { mode: 'message', intent: 'deterministic_panchanga', answer: `यो हप्ताको पञ्चाङ्ग (७ दिन):\n${lines.join('\n')}` };
  }
  if (isExplicitDailyAstroQuery(message) && isDeterministicAstroFactRequest(message)) {
    return { mode: 'message', intent: 'deterministic_panchanga', answer: await deterministicAstroFactsReply(chart) };
  }

  const intent =
    surfaceMode === 'daily_transit' ? 'daily_forecast' : detectIntent(message);
  const dw = await maybeDailyWeather(chart, intent);
  const ctx = await buildChatContext(chart, intent, {
    dailyWeather: dw,
    userPlan,
    premiumUnlocked,
    userMessage: message
  });
  if (ctx.error === 'invalid_chart') {
    const err = new Error('Invalid chart data');
    err.statusCode = 400;
    throw err;
  }

  // Hard guard: fame/past-age timing must come from precomputed table, not
  // model improvisation that can accidentally use "current" dasha/transit.
  if (intent === 'fame_timing') {
    const answer = buildFameTimingDeterministicReply(ctx.fameTiming, message);
    const mode = surfaceMode === 'daily_transit' ? 'daily_transit' : 'message';
    return { mode, intent, answer };
  }

  const systemBase = buildSystemPrompt({
    intent,
    userPlan,
    premiumUnlocked,
    conversationHistory
  });
  const systemText = systemBase + JSON.stringify(ctx);
  const { maxTokens, temperature } = tokenAndTemperatureForIntent(intent, userPlan);

  let raw = await invokeModel({
    systemText,
    userMessage: message,
    conversationHistory: conversationHistory || [],
    maxTokens,
    temperature
  });

  if (looksLikeReportOrLifePhaseJson(raw)) {
    const retrySystem =
      systemText +
      '\n\nCRITICAL: Your previous reply was invalid. Reply in plain prose or markdown only. No JSON, no curly braces with schema, no coreInsight or phases.';
    raw = await invokeModel({
      systemText: retrySystem,
      userMessage: message,
      conversationHistory: conversationHistory || [],
      maxTokens,
      temperature: Math.min(0.7, temperature + 0.02)
    });
  }

  let answer = formatAnswer(raw, message);
  if (answer === BIRTH_DETAILS_REDIRECT) {
    const retrySystem =
      systemText +
      '\n\nCRITICAL: CHART_CONTEXT_JSON is already loaded. Do NOT ask for birth date, time, or place. ' +
      'Answer the user question directly using houses, planets, dasha, and transits from context. ' +
      'For timing/fame/recognition questions, give phase-based age windows (not exact guarantees).';
    raw = await invokeModel({
      systemText: retrySystem,
      userMessage: message,
      conversationHistory: conversationHistory || [],
      maxTokens,
      temperature: Math.min(0.72, temperature + 0.04)
    });
    answer = formatAnswer(raw, message);
    if (answer === BIRTH_DETAILS_REDIRECT) {
      answer = proseFallback(message);
    }
  }

  const conflicts = extractHouseClaimConflicts(answer, ctx.immutableChartState);
  const lordshipConflicts = extractLordshipConflicts(answer, ctx.immutableSignLordship);
  if (conflicts.length > 0 || lordshipConflicts.length > 0) {
    const retrySystem =
      systemText +
      '\n\nCRITICAL CORRECTION: Your previous answer contradicted immutableChartState planet-house mapping. ' +
      `House conflicts: ${JSON.stringify(conflicts)}. Lordship conflicts: ${JSON.stringify(lordshipConflicts)}. ` +
      'Rewrite the answer and keep every planet in its exact immutable house. Also keep sign lordship exactly as immutableSignLordship.';
    raw = await invokeModel({
      systemText: retrySystem,
      userMessage: message,
      conversationHistory: conversationHistory || [],
      maxTokens,
      temperature: Math.min(0.68, temperature)
    });
    answer = formatAnswer(raw, message);
  }

  const finalHouseConflicts = extractHouseClaimConflicts(answer, ctx.immutableChartState);
  const finalLordshipConflicts = extractLordshipConflicts(answer, ctx.immutableSignLordship);
  if (finalHouseConflicts.length > 0 || finalLordshipConflicts.length > 0) {
    const retrySystem =
      systemText +
      '\n\nFINAL CORRECTION: Rewrite as natural conversational prose (not a placement dump). ' +
      'Use only immutableChartState for house placements. ' +
      `Do not contradict: houses=${JSON.stringify(finalHouseConflicts)} lordship=${JSON.stringify(finalLordshipConflicts)}.`;
    raw = await invokeModel({
      systemText: retrySystem,
      userMessage: message,
      conversationHistory: conversationHistory || [],
      maxTokens,
      temperature: 0.55
    });
    answer = formatAnswer(raw, message);
    if (answer === BIRTH_DETAILS_REDIRECT) answer = proseFallback(message);
  }

  const mode = surfaceMode === 'daily_transit' ? 'daily_transit' : 'message';
  return { mode, intent, answer };
}

/**
 * Main entry for POST /chat-v2
 */
async function processChatV2Request({
  chart,
  message,
  userPlan,
  conversationHistory,
  surfaceMode = 'message',
  premiumUnlocked = false,
  mode = 'message'
}) {
  const plan = normalizePlan(userPlan);
  if (mode === 'greeting') {
    return runGreeting({
      chart,
      userPlan: plan,
      premiumUnlocked,
      conversationHistory: conversationHistory || []
    });
  }
  const msg = String(message || '').trim();
  if (!msg) {
    const err = new Error('message is required when mode is not greeting');
    err.statusCode = 400;
    throw err;
  }
  return runMessage({
    chart,
    message: msg,
    userPlan: plan,
    premiumUnlocked,
    conversationHistory: conversationHistory || [],
    surfaceMode
  });
}

module.exports = {
  processChatV2Request,
  normalizePlan,
  shouldUseOpenAI,
  shouldUseGemini
};
