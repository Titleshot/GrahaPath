const SIGNS = [
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

function normalizeUserPlan(userPlan) {
  const p = String(userPlan || 'free').toLowerCase();
  if (p === 'full' || p === 'quick' || p === 'free') return p;
  return 'free';
}

function extractSignMentions(text) {
  const t = String(text || '');
  const out = [];
  for (const s of SIGNS) {
    if (new RegExp(`\\b${s}\\b`, 'i').test(t)) out.push(s);
  }
  return [...new Set(out)];
}

function buildRepetitionHints(recentAssistantTexts) {
  const joined = (Array.isArray(recentAssistantTexts) ? recentAssistantTexts : [])
    .map((x) => String(x || ''))
    .join('\n');
  if (!joined.trim()) return '';
  const signs = extractSignMentions(joined);
  const stock = [];
  if (/inner\s+conflict/i.test(joined)) stock.push('inner conflict');
  if (/saturn\s+pressure/i.test(joined)) stock.push('Saturn pressure');
  if (/dominant\s+life\s+pattern/i.test(joined)) stock.push('Dominant Life Pattern');
  if (/emotional\s+depth/i.test(joined)) stock.push('emotional depth');
  if (/scorpio\s+moon|gemini\s+rising/i.test(joined)) stock.push('repeated big-three phrasing');

  const bits = [];
  if (signs.length) bits.push(`sign labels already used: ${signs.slice(0, 6).join(', ')}`);
  if (stock.length) bits.push(`phrases to avoid repeating: ${stock.join(', ')}`);
  if (!bits.length) return '';
  return `Repetition guard (from recent assistant replies): ${bits.join(
    '. '
  )}. Prefer pattern language ("your Moon pattern", "communication axis", "timing layer") instead of restating the same sign/planet combo unless essential.`;
}

/**
 * Directives appended to system prompt — keeps base instruction short.
 */
function buildOrchestrationDirectives({
  intent,
  userPlan,
  premiumUnlocked,
  recentAssistantTexts,
  forcePlainProse
}) {
  const plan = normalizeUserPlan(userPlan);
  const rep = buildRepetitionHints(recentAssistantTexts);

  let depth = '';
  if (intent === 'small_talk') {
    depth =
      'Turn intent: SMALL_TALK. Reply casually in 3–5 short lines max. Do not list Lagna/Moon/Sun or give a natal report. At most one gentle mood line tied to data if present; end with a friendly offer to pick a topic (career, relationship, daily timing, emotional pattern).';
  } else if (intent === 'capability_question') {
    depth =
      'Turn intent: CAPABILITY. Explain what GrahaPath can analyze (patterns, timing, direction) in plain bullets. No personalized natal reading, no placements, no JSON.';
  } else if (intent === 'daily_forecast') {
    depth =
      'Turn intent: DAILY / NEAR-TERM. Focus on practical day energy using dailyWeather and transit context. Structure: main pattern; Good for; Avoid; short emotional note. Do not write a full natal personality essay. Optional one soft line about deeper timing in premium layer only if appropriate and not spammy.';
  } else if (intent === 'dasha_question') {
    depth =
      'Turn intent: DASHA_TIMING. Prioritize current mahadasha-antardasha as the timing layer, not static personality. Explain phase tone, practical focus, and caution in non-fatal language. Use phrasing like "this phase tends to..." and "this timing may reward...".';
  } else if (intent === 'natal_rashi_question') {
    depth =
      'Turn intent: NATAL_RASHI. Give natal identity summary using Moon sign (rashi) + Lagna, with optional Sun as secondary. Explain broad personality tendencies; do NOT switch to daily tithi/nakshatra unless user asked for today/daily.';
  } else if (intent === 'career_question') {
    depth =
      'Turn intent: CAREER. Use 10th house / careerWealth / relevant planets and dasha. Practical direction only; no guaranteed outcomes. Limit explicit chart citations to 1–2 in free mode.';
  } else if (intent === 'relationship_question') {
    depth =
      'Turn intent: RELATIONSHIP / MARRIAGE. Use Venus, 7th house, 7th lord, Moon, Rahu/Ketu, and current dasha to describe relationship patterns and TIMING WINDOWS. Emphasize emotional readiness, activation phases, and commitment-friendly periods. Never promise exact marriage dates or guaranteed events; avoid fear-based wording.';
  } else if (intent === 'emotional_pattern') {
    depth =
      'Turn intent: EMOTIONAL_PATTERN. Explain behavior patterns; cite Moon / Mercury / Saturn / nodes only when useful. Short in free mode.';
  } else if (intent === 'remedies_question') {
    depth =
      'Turn intent: REMEDIES. Safe mainstream suggestions only; no guarantees. Free: one soft general practice + optional gentle traditional note. Do not push expensive gemstones unless user asked.';
  } else if (intent === 'deep_analysis') {
    depth =
      'Turn intent: DEEP_ANALYSIS. User asked for depth — structured sections (A/B/C) and technical terms are allowed. Still no raw JSON.';
  } else {
    depth =
      'Turn intent: GENERAL. Answer the question conversationally; use chart data only if it helps. Do not default to a full natal synthesis.';
  }

  let budget = '';
  if (plan === 'free') {
    budget =
      'Length: FREE tier — target ~120–180 words. Shorter than premium. At most 1–2 explicit placement references. ' +
      'DEMO FEEL: Emotionally validate the present/past. Show brief chart reasoning. Tease deeper layers WITHOUT revealing them. ' +
      'End so user feels "there is more underneath" — never "you hit a limit." ' +
      'Do NOT predict specific future events — validation creates trust, trust creates curiosity.';
  } else if (plan === 'quick') {
    budget = 'Length: QUICK paid — up to ~300–450 words; clearer chart reasoning, timing windows, and emotional blueprint allowed. More layered than free.';
  } else {
    budget = 'Length: FULL access — deeper reasoning, structured sections, timing-aware analysis, multi-layered exploration. Feel expansive and conversational. Invite ongoing dialogue.';
  }

  let cta = '';
  if (!premiumUnlocked) {
    cta =
      'NEVER append sales lines like "unlock premium" or "upgrade now." The depth tease itself is the conversion. ' +
      'Only naturally reference deeper layers when the answer organically leads there.';
  }

  const prose = forcePlainProse
    ? 'CRITICAL: Reply in plain prose or markdown only. No JSON, no { curly schema }, no coreInsight/phases.'
    : '';
  const noBirthAsk =
    'Chart context is already loaded for this conversation. Do NOT ask user again for birth date/time/place or "more birth details".';

  return [depth, budget, cta, rep, noBirthAsk, prose].filter(Boolean).join('\n\n');
}

function llmCapsForPlan(userPlan, intent) {
  const plan = normalizeUserPlan(userPlan);
  if (intent === 'deep_analysis' && plan === 'full') {
    return { maxTokens: 1100, temperature: 0.65 };
  }
  if (plan === 'quick') {
    return { maxTokens: 700, temperature: 0.65 };
  }
  if (plan === 'free') {
    return { maxTokens: 380, temperature: 0.68 };
  }
  return { maxTokens: 900, temperature: 0.65 };
}

module.exports = {
  normalizeUserPlan,
  buildOrchestrationDirectives,
  llmCapsForPlan,
  extractSignMentions,
  buildRepetitionHints
};
