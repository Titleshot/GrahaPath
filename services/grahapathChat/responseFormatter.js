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

function asksForBirthDetails(text) {
  const t = String(text || '');
  return /(?:birth\s*(?:date|time|place|details)|जन्म\s*(?:मिति|समय|स्थान|विवरण)|dob)/i.test(t);
}

/**
 * Ensure chat never surfaces report JSON to the client.
 */
function formatAnswer(raw, userMessage) {
  let out = prettify(raw);
  if (looksLikeReportOrLifePhaseJson(out)) {
    out = proseFallback(userMessage);
  }
  if (asksForBirthDetails(out)) {
    out = 'तपाईंको जन्म विवरण र chart data पहिले नै load भएको छ। यही chart अनुसार म सिधै उत्तर दिन्छु। तपाईंको प्रश्नमै जाऔं।';
  }
  return out;
}

module.exports = {
  looksLikeReportOrLifePhaseJson,
  formatAnswer,
  proseFallback,
  prettify
};
