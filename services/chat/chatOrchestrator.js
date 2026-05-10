const { detectChatIntent } = require('./intentDetector');
const { buildIntentAwareChatContext } = require('./contextBuilder');
const { buildOrchestrationDirectives, normalizeUserPlan, llmCapsForPlan } = require('./responseStyleRules');
const { buildDailyGrahaWeatherFromTransit } = require('../dailyGrahaWeatherService');
const { generateReply } = require('../grahapathGeminiService');

/**
 * Chart-aware conversational chat — intent routing + slim context + style rules.
 * Life-phase JSON is served only from POST /life-phase-validation, not from here.
 */
async function generateChatResponse({
  userMessage,
  chartData,
  dailyWeather: dailyWeatherIn,
  conversationHistory,
  userPlan,
  mode = 'message',
  premiumUnlocked = false,
  freeTier = true,
  freeUsed = 0,
  freeLimit = 0,
  forcePlainProse = false
}) {
  const chart = chartData;
  if (!chart || typeof chart !== 'object') {
    throw new Error('generateChatResponse: chartData required');
  }

  let intent = detectChatIntent(userMessage);
  if (String(mode || '') === 'daily_transit') {
    intent = 'daily_forecast';
  }

  const plan = normalizeUserPlan(userPlan);

  let dailyWeather = dailyWeatherIn;
  if ((intent === 'daily_forecast' || intent === 'small_talk') && !dailyWeather) {
    try {
      dailyWeather = await buildDailyGrahaWeatherFromTransit(chart);
    } catch {
      dailyWeather = null;
    }
  }

  const strictUserData = await buildIntentAwareChatContext(chart, intent, { dailyWeather, userPlan: plan, premiumUnlocked });

  const recentAssistantTexts = (Array.isArray(conversationHistory) ? conversationHistory : [])
    .filter((m) => m && m.role === 'assistant' && m.content)
    .slice(-2)
    .map((m) => String(m.content));

  const orchestrationDirectives = buildOrchestrationDirectives({
    intent,
    userPlan: plan,
    premiumUnlocked,
    recentAssistantTexts,
    forcePlainProse
  });

  const caps = llmCapsForPlan(plan, intent);

  return generateReply(chart, conversationHistory, userMessage, mode, {
    premiumUnlocked,
    freeTier,
    freeUsed,
    freeLimit,
    strictUserDataOverride: strictUserData,
    orchestrationDirectives,
    maxTokens: caps.maxTokens,
    temperature: caps.temperature,
    detectedIntent: intent
  });
}

module.exports = { generateChatResponse };
