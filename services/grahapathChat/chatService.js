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
const { formatAnswer, looksLikeReportOrLifePhaseJson } = require('./responseFormatter');
const { buildDailyGrahaWeatherFromTransit } = require('../dailyGrahaWeatherService');
const { DateTime } = require('luxon');
const { buildPanchangaForDate, buildPanchangaRange } = require('../currentAstronomyService');

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
    /(तिथि|नक्षत्र|राशि|चन्द्र|चन्द्रमा|आजको\s*तिथि|आजको\s*नक्षत्र|चन्द्र\s*राशि|आजको\s*मिति|नेपाली\s*मिति)/u.test(t) ||
    /(tithi|nakshatra|current\s*tithi|current\s*nakshatra)/i.test(t) ||
    (hasDailyMarker && (/(चन्द्र\s*राशि|moon\s*sign|rashi|राशि)/i.test(t) || /(आजको\s*मिति|नेपाली\s*मिति|today'?s?\s*date)/i.test(t))) ||
    hasBsDateMismatchMarker
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

async function deterministicAstroFactsReply(chart) {
  const today = DateTime.now().setZone('Asia/Kathmandu').toISODate();
  const day = await buildPanchangaForDate(today);
  const tithi = day.tithiNepali && day.pakshaNepali ? `${day.pakshaNepali} ${day.tithiNepali}` : day.tithi;
  return `आजको मिति ${day.bsDateNepali} गते हो। आजको तिथि ${tithi} हो, नक्षत्र ${day.nakshatra} हो, र चन्द्र राशि ${day.moonSign} हो।`;
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
  if (isDeterministicAstroFactRequest(message)) {
    return { mode: 'message', intent: 'deterministic_panchanga', answer: await deterministicAstroFactsReply(chart) };
  }

  const intent =
    surfaceMode === 'daily_transit' ? 'daily_forecast' : detectIntent(message);
  const dw = await maybeDailyWeather(chart, intent);
  const ctx = await buildChatContext(chart, intent, { dailyWeather: dw, userPlan, premiumUnlocked });
  if (ctx.error === 'invalid_chart') {
    const err = new Error('Invalid chart data');
    err.statusCode = 400;
    throw err;
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

  const answer = formatAnswer(raw, message);
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
