const { detectIntent } = require('./intentDetector');

function looksLikeReportOrLifePhaseJson(text) {
  let t = String(text || '').trim();
  if (!t) return false;
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence) t = fence[1].trim();

  const hasCore = /coreInsight/i.test(t);
  const hasPhases = /"phases"\s*:|'phases'\s*:|"phases"\s*\[/i.test(t);
  if (hasCore && hasPhases) return true;
  if (/^\s*\{/.test(t) && (hasPhases || hasCore)) return true;
  if (/^\s*[\[{]/.test(t) && hasCore) return true;
  return false;
}

function proseFallback(userMessage) {
  const intent = detectIntent(userMessage);
  if (intent === 'small_talk') {
    return "Hey — good to connect. I'm here for your chart: career timing, daily energy, relationships, or emotional patterns — what should we look at first?";
  }
  return "I couldn't format that reply cleanly. Please ask again in a short sentence (career, daily timing, relationship, remedy, or emotional pattern).";
}

function prettify(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  let t = raw.replace(/\s-\s(?=[A-Z0-9])/g, '\n- ').replace(/:\s-\s/g, ':\n- ');
  if (t.length > 280 && !t.includes('\n\n')) {
    t = t.replace(/\. (?=[A-Z])/g, '.\n\n');
  }
  return t;
}

const BIRTH_DETAILS_REDIRECT = 'तपाईंको जन्म विवरण र chart data पहिले नै load भएको छ। यही chart अनुसार म सिधै उत्तर दिन्छु। तपाईंको प्रश्नमै जाऔं।';

/** Model already states chart/birth context is present — do not treat as asking user for input. */
const CHART_ALREADY_LOADED = /(?:already\s+(?:loaded|have|on\s+file)|पहिले\s*नै|load\s+भएको|chart\s+(?:data\s+)?(?:is\s+)?already|context\s+is\s+already|यही\s+chart|never\s+ask\s+again|do\s+not\s+ask\s+again)/i;

function modelIsAskingUserForBirthDetails(text) {
  const t = String(text || '').trim();
  if (!t || CHART_ALREADY_LOADED.test(t)) {
    return false;
  }

  const birthField = /(?:birth\s*(?:date|time|place|details|info|information)|जन्म\s*(?:मिति|समय|स्थान|विवरण)|\bdob\b)/i;
  if (!birthField.test(t)) {
    return false;
  }

  const solicitation =
    /(?:please|kindly|could\s+you|can\s+you|i\s+need|share|provide|enter|send|confirm|tell\s+me|what\s+is\s+your|before\s+i\s+can|to\s+analyze\s+your\s+chart|कृपया|भन्नुहोस्|दिनुहोस्|चाहिन्छ)/i;
  const directQuestion = /(?:what|when|where)\s+(?:is|was)\s+your\s+birth|जन्म\s*कहिले|जन्म\s*कहाँ/i;

  return solicitation.test(t) || directQuestion.test(t);
}

/**
 * Ensure chat never surfaces report JSON to the client.
 * Returns BIRTH_DETAILS_REDIRECT when the model wrongly asks for birth data (caller may retry).
 */
function formatAnswer(raw, userMessage) {
  let out = prettify(raw);
  if (looksLikeReportOrLifePhaseJson(out)) {
    out = proseFallback(userMessage);
  }
  if (modelIsAskingUserForBirthDetails(out)) {
    return BIRTH_DETAILS_REDIRECT;
  }
  return out;
}

module.exports = {
  looksLikeReportOrLifePhaseJson,
  formatAnswer,
  proseFallback,
  prettify,
  BIRTH_DETAILS_REDIRECT,
  modelIsAskingUserForBirthDetails
};
