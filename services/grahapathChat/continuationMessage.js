const TOPIC_HINTS = [
  {
    test: /career|profession|work|job|10th\s*house|professional|करियर|पेशा|रोजगार|काम/i,
    label: 'career timing and professional direction from my chart'
  },
  {
    test: /relationship|marriage|partner|love|7th\s*house|partnership|सम्बन्ध|विवाह|प्रेम|साथी/i,
    label: 'relationship patterns and partnership timing from my chart'
  },
  {
    test: /emotional|emotion|feel|inner|mind|moon\s*pattern|processing|भावना|मन|चिन्ता|भावनात्मक/i,
    label: 'emotional patterns and how I process feelings from my chart'
  },
  {
    test: /dasha|timing|phase|transit|activation|life\s*phase|दशा|समय|चरण|गोचर/i,
    label: 'my current dasha phase and what it is activating now'
  }
];

/** English, romanized Nepali, and Devanagari — common “yes, go on” replies only. */
const EXACT_AGREEMENT =
  /^(ok|okay|okie|k|yes|yeah|yep|yup|sure|sounds\s+good|go\s+on|go\s+ahead|continue|please|let'?s\s+do\s+(it|that)|let'?s\s+go|that\s+works|fine|alright|all\s+right|got\s+it|understood|do\s+it|proceed|tell\s+me\s+more|more\s+please|continue\s+please|yes\s+please|ok\s+please|please\s+continue|ha|han|ho|hmm\s+ok|thank\s+you|thanks|thx|nice|great|good|ho|huncha|hunchha|thik\s*cha|thik\s*chha|thik\s*cha|la|l|hai|huss|hus|ramro|sabai|bhannus|bhannu|jannus|jannu|surua|suru|agadi|badha|badhau|bhanos|bhanu|jaos|jau|हो|हुन्छ|हुन्छा|ठीक|ठिक|ठीक\s*छ|ठिक\s*छ|ल|हाँ|हां|हुस|राम्रो|बढाउनुहोस्|भन्नुहोस्|सुरु|अगाडि|अघि|जानुहोस्|जाऔं|हुन्छ\s*न|ठीक\s*छ\s*न)(\s+(please|thanks|hola|dai))?$/iu;

function isBriefContinuation(rawText) {
  const raw = String(rawText || '').trim();
  if (!raw || raw.length > 56) return false;

  const stripped = raw.replace(/[!?.…।]+$/u, '').trim();
  if (EXACT_AGREEMENT.test(stripped)) return true;

  // Short reply, not a question — likely “yes / go on” in any language the model already used
  if (/[?？]/.test(raw)) return false;
  const words = stripped.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 6) return false;

  const agreementStart =
    /^(ok|yes|ho|la|thik|huncha|ramro|please|continue|हो|ठीक|ठिक|ल|भन्न|सुरु|अगाडि|हुन्छ|हाँ|हां)/iu;
  return agreementStart.test(stripped);
}

function lastAssistantTurn(conversationHistory) {
  const list = Array.isArray(conversationHistory) ? conversationHistory : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const row = list[i];
    if (row?.role === 'assistant' && String(row.content || '').trim()) {
      return String(row.content).trim();
    }
  }
  return '';
}

function assistantOfferedFollowUp(assistantText) {
  const t = String(assistantText || '');
  return (
    /explore|dive\s+into|let\s+me\s+know|what\s+feels|how\s+about|interested\s+in|we\s+can|next\b|which\s+(area|topic)|pick\s+one|choose|shall\s+we/i.test(
      t
    ) ||
    /(के\s+चाहनु|भन्नु|हेर्न|अन्वेषण|अर्को|जान्न|रुचि|विषय|सुरु\s*गर|अगाडि|बताउ|बताऊ|छान्नु)/u.test(t)
  );
}

function topicsFromAssistant(assistantText) {
  const found = [];
  for (const hint of TOPIC_HINTS) {
    if (hint.test.test(assistantText)) found.push(hint.label);
  }
  return found;
}

/**
 * Turn brief agreement into an explicit chart question when the assistant just offered topics.
 * Internal expansion is in English so the model routes to the right intent; user-facing reply stays in their language.
 */
function expandContinuationMessage(message, conversationHistory) {
  const raw = String(message || '').trim();
  if (!isBriefContinuation(raw)) return raw;

  const assistantText = lastAssistantTurn(conversationHistory);
  if (!assistantText || !assistantOfferedFollowUp(assistantText)) return raw;

  const topics = topicsFromAssistant(assistantText);
  const primary = topics[0] || 'the follow-up you just offered about my chart';
  const secondary =
    topics.length > 1 ? ` After that, touch briefly on ${topics.slice(1, 3).join(' and ')}.` : '';

  return (
    `Yes, please continue now. Start with ${primary}, using my chart placements and current dasha timing.` +
    `${secondary} Give a substantive reading — do not ask me to pick a topic again. ` +
    `Reply in the same language the user has been using in this conversation.`
  );
}

module.exports = {
  isBriefContinuation,
  expandContinuationMessage
};
