const { DateTime } = require('luxon');
const { calculateDashaAtDate } = require('./dashaCalculator');
const {
  birthDateTime,
  chartForTiming,
  houseLordMap,
  planetsInHouse,
  ageOnDate,
  currentAgeYears,
  iterAntardashaSegments,
  lifeEventAgeBoosts,
  applyBoostsToSegments,
  formatAgeRangeLabel,
  formatYearRange
} = require('./timelineScanEngine');

/**
 * Phase 1 pilot: generalizes the fame_timing architecture (timeline scan ->
 * domain scoring -> ranking -> confidence -> deterministic reply) to career
 * timing questions. Relationship/finance/health can reuse the same
 * timelineScanEngine + this file's pattern later with their own scoring rules.
 */

const CAREER_SEGMENT_SCAN_MAX_AGE = 68;
// No one has a career breakthrough/setback/transition as a child -- without this
// floor the raw dasha-lord scoring can rank early-childhood segments highest
// (a technically "strong" score attached to an impossible age), which is worse
// than low confidence: it is confidently wrong. 16 is a deliberately early/
// permissive floor (some people do start working life in their late teens).
const CAREER_MIN_ELIGIBLE_AGE = 18;

/**
 * The lordship/benefic/house conditions below are static natal-chart facts --
 * they are identical for every occurrence of the same dasha-lord pair no
 * matter how old the person is when it recurs. Without an age factor, a
 * chart where (say) Mercury is both the 10th lord and treated as benefic
 * scores every single Mercury-ruled period the same, and the scan simply
 * picks whichever one falls earliest after the eligibility floor -- which is
 * how a career "breakthrough" ended up pinned to age 15-17. This is a
 * generic adult-career-stage curve (NOT tuned to any individual's biography):
 * career activity is least plausible pre-adulthood, ramps through early
 * career entry, is fully plausible through the core working-life band, and
 * tapers gradually past typical retirement age. It multiplies the raw score
 * BEFORE the 0-100 clip, so the exact same natal favorability now scores
 * differently depending on how career-plausible the age actually is --
 * breaking the "many unrelated ages all tie at 100" clustering.
 */
function careerAgePlausibilityWeight(age) {
  if (age == null) return 1;
  if (age < 18) return 0.3;
  if (age < 22) return 0.55;
  if (age < 25) return 0.78;
  if (age <= 58) return 1;
  if (age <= 65) return 0.85;
  return 0.65;
}

const CAREER_EVENT_TYPES = ['breakthrough', 'expansion', 'transition', 'setback', 'restructuring', 'leadership'];

const EVENT_TYPE_LABEL = {
  breakthrough: 'career breakthrough / recognition',
  expansion: 'career expansion',
  transition: 'career transition',
  setback: 'career setback / disruption',
  restructuring: 'career restructuring',
  leadership: 'leadership / status increase'
};

const MALEFICS = new Set(['Saturn', 'Rahu', 'Ketu', 'Mars']);
const BENEFICS = new Set(['Jupiter', 'Venus', 'Mercury', 'Sun', 'Moon']);

/**
 * Does this message ask to INTERPRET an already-identified career window/event
 * ("what happened during 1982-1985?", "what was the event in that window?")
 * rather than asking the system to find/re-find the strongest window? This is
 * checked FIRST and takes priority over isCareerTimingQuery, because phrases
 * like "most important event" (सबैभन्दा महत्वपूर्ण ... event) can otherwise be
 * mistaken for a fresh timing request even when a window was already given --
 * this is exactly the bug where a follow-up asking "what event was this?"
 * re-triggered the same ranked-window answer instead of being treated as a
 * different question.
 */
function isCareerEventInterpretationQuery(userMessage) {
  const t = String(userMessage || '').trim();
  if (!t) return false;
  const mentionsEvent = /(event|घटना)/i.test(t);
  const asksWhatHappened = /(what\s+happened|happened|भयो|\bwhat\s+(was|is)\b)/i.test(t);
  if (!(mentionsEvent && asksWhatHappened)) return false;
  const referencesAWindow =
    /((?:19|20)\d{2}\s*[-–—]\s*(?:19|20)?\d{2}|\bwindow\b|\bperiod\b|अवधि|यो\s*(?:career\s*)?(?:window|period)|त्यो\s*(?:career\s*)?(?:window|period))/i.test(
      t
    );
  return referencesAWindow;
}

/**
 * Does this career_question message actually ask for a specific timing answer
 * (a year, an age, "when", "turning point"...) rather than a broad "how is my
 * career" style question? Broad questions must NOT activate timing mode.
 * Event-interpretation follow-ups are excluded here too (not just at the call
 * site) so this function stays correct on its own if reused elsewhere.
 */
function isCareerTimingQuery(userMessage) {
  const t = String(userMessage || '').trim();
  if (!t) return false;
  if (isCareerEventInterpretationQuery(t)) return false;
  if (isDirectYearOrAgeQuery(t)) return false;
  const timingMarkers =
    /(when\s+(was|did|is|will)|which\s+year|what\s+year|at\s+what\s+age|which\s+age|turning\s+point|biggest\s+(career\s+)?(setback|breakthrough|change|disruption|shift|opportunity)|most\s+(significant|important)\s+(period|year|time|phase)|कहिले|कुन\s*वर्ष|कुन\s*वर्षमा|कुन\s*उमेर|कुन\s*उमेरमा|सबैभन्दा\s*(ठूलो|महत्वपूर्ण))/i;
  return timingMarkers.test(t);
}

/**
 * Mode C: DIRECT_YEAR_TIMING. Unlike isCareerTimingQuery (asks WHICH year/age
 * -- open discovery) or isCareerEventInterpretationQuery (asks about an
 * explicit RANGE using "event"/"happened" wording), this catches a message
 * that simply NAMES one specific year or age and asks about that period --
 * "2008 मा मेरो career कस्तो थियो?", "Was 2008 a setback year for my career?",
 * "At age 37, what was happening in my career?" -- with none of the other
 * two patterns' required wording. This was the exact gap that let the 2008
 * question fall through to the generic LLM path even though the underlying
 * dasha/score data for that year was already being calculated correctly.
 */
function isDirectYearOrAgeQuery(userMessage) {
  const t = String(userMessage || '').trim();
  if (!t) return false;
  if (isCareerEventInterpretationQuery(t)) return false; // mode B already owns explicit ranges
  const hasYear = /\b(19|20)\d{2}\b/.test(t);
  const hasAge = /\bage\s+\d{1,3}\b|उमेर\s*\d{1,3}|\d{1,3}\s*वर्षको\s*उमेर|\d{1,3}\s*वर्षमा/i.test(t);
  if (!hasYear && !hasAge) return false;
  // Require an actual "tell me about that period" signal, not just a year
  // mentioned in passing (e.g. "I started in 2008, how is my career going
  // now?" is about NOW, the year is only background) -- past-tense wording,
  // an explicit ask to explain/describe, or an explicit "period/time" word
  // attached to the question all count; bare present-tense phrasing does not.
  const interpretSignal =
    /(थियो|भयो|was|happened|were|explain|describe|tell\s+me\s+about|व्याख्या|बताउ|बारे|period|अवधि|\bसमय\b)/i.test(t);
  return interpretSignal;
}

/** Parse an explicit year range like "1982-1985" or "1982–85" from free text. */
function extractYearRangeFromText(text) {
  const m = String(text || '').match(/((?:19|20)\d{2})\s*[-–—]\s*((?:19|20)\d{2}|\d{2})/);
  if (!m) return null;
  const start = Number(m[1]);
  let end = Number(m[2]);
  if (end < 100) end = Math.floor(start / 100) * 100 + end;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

/** Parse a single bare year ("2008") into a one-year window {start: 2008, end: 2008}. */
function extractSingleYearFromText(text) {
  const m = String(text || '').match(/\b((?:19|20)\d{2})\b/);
  if (!m) return null;
  const year = Number(m[1]);
  return { start: year, end: year };
}

/** Parse an explicit age reference ("age 37", "उमेर 37", "37 वर्षमा") from free text. */
function extractAgeReferenceFromText(text) {
  const t = String(text || '');
  const m = t.match(/\bage\s+(\d{1,3})\b/i) || t.match(/उमेर\s*(\d{1,3})/) || t.match(/(\d{1,3})\s*वर्ष(?:को\s*उमेर(?:मा)?|मा)/);
  if (!m) return null;
  const age = Number(m[1]);
  return Number.isFinite(age) ? age : null;
}

/**
 * Resolves what specific period a message (or, failing that, conversation
 * history) is asking about: an explicit range, a bare year, or an explicit
 * age converted to that person's corresponding calendar year via their own
 * birth date. Shared by both mode B (WINDOW_EVENT_INTERPRETATION) and mode C
 * (DIRECT_YEAR_TIMING) -- they differ only in what wording triggers them, not
 * in how the target period is resolved or scored.
 */
function resolveTargetWindow(userMessage, conversationHistory, birth) {
  const range = extractYearRangeFromText(userMessage);
  if (range) return range;
  const singleYear = extractSingleYearFromText(userMessage);
  if (singleYear) return singleYear;
  const ageRef = extractAgeReferenceFromText(userMessage);
  if (ageRef != null && birth?.isValid) {
    const year = birth.plus({ years: ageRef }).year;
    return { start: year, end: year };
  }
  return findReferencedWindowFromHistory(conversationHistory);
}

/** Fallback: if the current message doesn't restate the year, look for the most recent career-timing answer's year range in conversation history. */
function findReferencedWindowFromHistory(conversationHistory) {
  const history = Array.isArray(conversationHistory) ? conversationHistory : [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const m = history[i];
    if (m?.role !== 'assistant' || typeof m.content !== 'string') continue;
    const range = extractYearRangeFromText(m.content);
    if (range) return range;
  }
  return null;
}

/**
 * Which flavor of career event is being asked about. Defaults to 'general'
 * (polarity-agnostic "biggest turning point") when the question does not name
 * a specific type -- breakthrough and setback are NOT assumed to be the same
 * period, so 'general' resolves to whichever signal is actually stronger in
 * the chart rather than guessing one direction.
 */
function detectCareerEventType(userMessage) {
  const t = String(userMessage || '').toLowerCase();
  if (/(setback|disrupt|failed|fired|lost\s+(the\s+|my\s+)?job|crisis|downfall|असफल|समस्या|संकट|गुम्यो|टुट्यो)/i.test(t)) {
    return 'setback';
  }
  if (/(breakthrough|recognition|recognized|achieved|breakout|success(ful)?|उपलब्धि|सफलता|पहिचान)/i.test(t)) {
    return 'breakthrough';
  }
  if (/(transition|shift|switch|change\s+(of\s+)?(career|profession|direction|path)|पेशा\s*परिवर्तन|बाटो\s*परिवर्तन|ठूलो\s*परिवर्तन)/i.test(t)) {
    return 'transition';
  }
  if (/(expand|expansion|growth|grew|scale[ds]?\s+up|वृद्धि|विस्तार)/i.test(t)) {
    return 'expansion';
  }
  if (/(restructur|reorgani[sz]|पुनर्संरचना)/i.test(t)) {
    return 'restructuring';
  }
  if (/(leadership|promot|status|authority|पद\s*वृद्धि|नेतृत्व)/i.test(t)) {
    return 'leadership';
  }
  return 'general';
}

/**
 * Past ("when was") vs future ("when is my next") framing. Historical
 * questions scan ages up to now; future questions scan ages from now onward.
 * Defaults to 'past' since most turning-point/setback/breakthrough phrasing
 * is retrospective.
 */
function detectCareerTiming_Tense(userMessage) {
  const t = String(userMessage || '').toLowerCase();
  const hasFutureMarker = /(next|upcoming|future|will\s+(be|come|happen)|is\s+going\s+to|coming\s+(year|period)|आउने|हुनेछ|भविष्य)/i.test(t);
  const hasPastMarker = /(was|were|happened|used\s+to|भयो|थियो|भएको)/i.test(t);
  if (hasFutureMarker && !hasPastMarker) return 'future';
  return 'past';
}

function tenthLordInDusthana(lords, chart) {
  const tenthLord = lords[10];
  if (!tenthLord) return false;
  const row = (chart?.planets || []).find((p) => p.name === tenthLord);
  return row?.house === 6 || row?.house === 8 || row?.house === 12;
}

/** Raw 0-100 activation score for ONE specific (non-'general') career event type. */
function scoreCareerEventTypeActivation(chart, mahaDasha, antarDasha, age, eventType) {
  const lords = houseLordMap(chart);
  const tenthLord = lords[10] || null;
  const eleventhLord = lords[11] || null;
  const sixthLord = lords[6] || null;
  const eighthLord = lords[8] || null;
  const twelfthLord = lords[12] || null;

  const md = mahaDasha || null;
  const ad = antarDasha || null;

  const h1 = planetsInHouse(chart, 1);
  const h6 = planetsInHouse(chart, 6);
  const h10 = planetsInHouse(chart, 10);
  const h11 = planetsInHouse(chart, 11);
  const sun = (chart?.planets || []).find((p) => p.name === 'Sun');
  const cw = chart?.careerWealth;
  const careerPoints = cw?.meters?.careerPoints;

  const onDisruptionAxis = (p) => p && (p === sixthLord || p === eighthLord || p === twelfthLord);
  const onGrowthAxis = (p) => p && (p === tenthLord || p === eleventhLord);

  let score = 24; // same neutral baseline used by fame scoring, for consistency across timing engines

  if (eventType === 'setback') {
    if (onDisruptionAxis(md)) score += 26;
    if (onDisruptionAxis(ad)) score += 22;
    if (md && MALEFICS.has(md) && ad && MALEFICS.has(ad)) score += 14;
    if (md && MALEFICS.has(md) && !(ad && BENEFICS.has(ad))) score += 8;
    if (h10.includes('Saturn') || h10.includes('Rahu') || h10.includes('Ketu')) score += 12;
    if (tenthLordInDusthana(lords, chart)) score += 14;
    if (md === 'Saturn' || ad === 'Saturn') score += 8;
    if ((md === 'Rahu' && ad === 'Ketu') || (md === 'Ketu' && ad === 'Rahu')) score += 6;
    if (onGrowthAxis(md) && ad && BENEFICS.has(ad)) score -= 14;
  } else if (eventType === 'breakthrough') {
    // md-on-axis, ad-on-axis, and "both on axis" used to be three separate
    // additive bonuses for what is largely the same underlying fact (this
    // dasha pair sits on the 10th/11th lordship axis) -- that alone summed to
    // 52 points before anything else was even checked. Collapsed into one
    // graduated bonus so a single strong signal no longer does the work of
    // three, leaving the age-plausibility weight below room to actually matter.
    if (onGrowthAxis(md) && onGrowthAxis(ad)) score += 30;
    else if (onGrowthAxis(md)) score += 20;
    else if (onGrowthAxis(ad)) score += 14;
    if (md && BENEFICS.has(md)) score += 6;
    if (ad && BENEFICS.has(ad)) score += 8;
    if (h10.includes('Sun') || h1.includes('Sun') || sun?.house === 10 || sun?.house === 1) score += 10;
    if (h10.includes('Jupiter') || h11.includes('Jupiter')) score += 6;
    if (h10.includes('Rahu') || h11.includes('Rahu')) score += 6;
    if (careerPoints != null && careerPoints >= 58) score += 6;
  } else if (eventType === 'expansion') {
    if (md === eleventhLord || md === 'Jupiter') score += 22;
    if (ad === eleventhLord || ad === 'Jupiter') score += 18;
    if (h11.includes('Jupiter') || h11.includes('Venus')) score += 10;
    if (md && BENEFICS.has(md) && ad && BENEFICS.has(ad)) score += 10;
    if (careerPoints != null && careerPoints >= 55) score += 6;
  } else if (eventType === 'transition') {
    if (md === 'Rahu' || md === 'Ketu' || ad === 'Rahu' || ad === 'Ketu') score += 22;
    if ((md === 'Rahu' && ad === 'Ketu') || (md === 'Ketu' && ad === 'Rahu')) score += 10;
    if (md === 'Mercury' || ad === 'Mercury') score += 8;
    if (md && MALEFICS.has(md) && ad && MALEFICS.has(ad)) score += 6;
  } else if (eventType === 'restructuring') {
    if (md === 'Saturn' || ad === 'Saturn') score += 24;
    if (h10.includes('Saturn') || h6.includes('Saturn')) score += 12;
    if (onDisruptionAxis(md)) score += 10;
    if (md === 'Saturn' && ad === 'Rahu') score += 8;
  } else if (eventType === 'leadership') {
    if (h1.includes('Sun') || h10.includes('Sun') || sun?.house === 1 || sun?.house === 10) score += 22;
    if (md === 'Sun' || ad === 'Sun') score += 18;
    if (md === 'Mars' || ad === 'Mars') score += 10;
    if (onGrowthAxis(md)) score += 10;
  }

  const weighted = score * careerAgePlausibilityWeight(age);
  return Math.max(0, Math.min(100, Math.round(weighted)));
}

/**
 * Public scorer. For a specific eventType, returns { score, resolvedType }.
 * For 'general' ("biggest turning point"), computes BOTH breakthrough and
 * setback signals and resolves to whichever is stronger -- the same period
 * is not assumed to mean the same thing for every question.
 */
function scoreCareerEventActivation(chart, mahaDasha, antarDasha, age, eventType = 'general') {
  if (eventType !== 'general' && CAREER_EVENT_TYPES.includes(eventType)) {
    return {
      score: scoreCareerEventTypeActivation(chart, mahaDasha, antarDasha, age, eventType),
      resolvedType: eventType
    };
  }
  const growth = scoreCareerEventTypeActivation(chart, mahaDasha, antarDasha, age, 'breakthrough');
  const disruption = scoreCareerEventTypeActivation(chart, mahaDasha, antarDasha, age, 'setback');
  return growth >= disruption
    ? { score: growth, resolvedType: 'breakthrough' }
    : { score: disruption, resolvedType: 'setback' };
}

/**
 * strong / moderate / possible using the existing evidenceWeighting vocabulary
 * (see services/astroBrain/evidenceWeighting.js) -- not a new confidence scale.
 * Requires both a high absolute score AND a clear gap over the runner-up,
 * otherwise the chart is treated as not supporting one exact period.
 */
function confidenceFromCareerWindows(top) {
  if (!top.length) return 'possible';
  const best = top[0].careerActivationScore;
  const second = top[1]?.careerActivationScore ?? 0;
  const gap = best - second;
  if (best >= 68 && gap >= 14) return 'strong';
  if (best >= 50 && gap >= 6) return 'moderate';
  return 'possible';
}

function buildTopCareerWindows(chart, options = {}) {
  const limit = options.limit ?? 5;
  const eventType = options.eventType || 'general';
  const tense = options.tense || 'past';
  const boosts = options.boosts ?? lifeEventAgeBoosts(chart);
  const scoreFn = (c, md, ad, age) => scoreCareerEventActivation(c, md, ad, age, eventType).score;

  let segments = applyBoostsToSegments(
    iterAntardashaSegments(chart, scoreFn, CAREER_SEGMENT_SCAN_MAX_AGE),
    boosts
  ).filter((s) => s.age >= CAREER_MIN_ELIGIBLE_AGE);

  const age = currentAgeYears(chart);
  if (age != null) {
    segments = tense === 'future' ? segments.filter((s) => s.age >= age - 0.5) : segments.filter((s) => s.age <= age + 0.5);
  }

  const ranked = [...segments].sort((a, b) => b.recognitionScore - a.recognitionScore);
  const picked = [];
  const used = new Set();
  for (const row of ranked) {
    const key = `${row.mahaDasha}|${row.antarDasha}|${row.antarStart}`;
    if (used.has(key)) continue;
    used.add(key);
    picked.push(row);
    if (picked.length >= limit) break;
  }

  return picked.map((row, index) => {
    const detail = scoreCareerEventActivation(chart, row.mahaDasha, row.antarDasha, row.age, eventType);
    return {
      rank: index + 1,
      age: row.age,
      ageRangeLabel: formatAgeRangeLabel(row.ageStart, row.ageEnd),
      calendarYear: row.calendarYear,
      calendarYears: formatYearRange(row),
      calendarDate: row.calendarDate,
      mahaDasha: row.mahaDasha,
      antarDasha: row.antarDasha,
      antarWindow: `${row.antarStart || '?'} – ${row.antarEnd || '?'}`,
      careerActivationScore: row.recognitionScore,
      resolvedEventType: detail.resolvedType,
      lifeEventBoost: row.lifeEventBoost || 0
    };
  });
}

/**
 * Precomputed career timing facts injected into chat context, mirroring
 * buildFameTimingContext's shape (timingDataStatus, primary window, ranked
 * list, rules/answerTemplate for the deterministic reply builder).
 */
function buildCareerTimingContext(chart, userMessage = '') {
  const chartCtx = chartForTiming(chart);
  const birth = birthDateTime(chartCtx);
  const eventType = detectCareerEventType(userMessage);
  const tense = detectCareerTiming_Tense(userMessage);
  const boosts = lifeEventAgeBoosts(chartCtx);
  const scoreFn = (c, md, ad, age) => scoreCareerEventActivation(c, md, ad, age, eventType).score;
  const rawSegments = applyBoostsToSegments(
    iterAntardashaSegments(chartCtx, scoreFn, CAREER_SEGMENT_SCAN_MAX_AGE),
    boosts
  ).filter((s) => s.age >= CAREER_MIN_ELIGIBLE_AGE);
  const timingAvailable = rawSegments.length > 0 && birth?.isValid;

  const topWindows = timingAvailable
    ? buildTopCareerWindows(chartCtx, { eventType, tense, limit: 5, boosts })
    : [];
  const primary = topWindows[0] || null;
  const confidence = confidenceFromCareerWindows(topWindows);

  // Note: we deliberately do NOT merge the primary and runner-up ages into one
  // wider span here. They are two distinct candidate periods, not a single
  // continuous window of uncertainty -- inventing a merged range would be its
  // own kind of false precision. Honesty about low confidence instead comes
  // from (a) the primary window's own natural age band (already a range, from
  // its antardasha start/end) and (b) surfacing the runner-up separately in
  // the reply, letting the reader see there are two close candidates.
  const displayAgeLabel = primary?.ageRangeLabel || (primary ? String(Math.floor(primary.age)) : null);

  return {
    timingDataStatus: timingAvailable ? 'ok' : 'unavailable',
    timingDataNote: timingAvailable
      ? null
      : 'Vimshottari timeline could not be built from this chart payload (often missing timingCore or Moon data). Tell the user to regenerate the chart from birth details — do not claim there is no career timing in the chart.',
    eventType,
    tense,
    birthYear: birth?.isValid ? birth.year : null,
    confidence,
    primaryCareerWindow: primary ? { ...primary, displayAgeLabel, confidence } : null,
    topCareerWindows: topWindows,
    rules: [
      'Use only this precomputed careerTiming table for specific years/ages — never currentDashaOnly or free improvisation.',
      'setback and breakthrough scores for the same period can differ; do not assume one implies the other.',
      'If confidence is "possible", present displayAgeLabel as a bounded range and say the chart does not support one exact year.',
      'Never invent a specific real-world event (company name, exact date) beyond what the dasha/house evidence supports.'
    ],
    answerTemplate:
      'Lead with primaryCareerWindow.displayAgeLabel + calendarYears + mahaDasha–antarDasha + careerActivationScore + confidence. One paragraph, then optional 2nd window.'
  };
}

function buildCareerTimingDeterministicReply(careerTiming, userMessage) {
  const ct = careerTiming || {};
  if (ct.timingDataStatus !== 'ok' || !ct.primaryCareerWindow) {
    return 'Career timing table is unavailable for this chart payload. Please regenerate the chart from birth details and try again.';
  }

  const p = ct.primaryCareerWindow;
  const label = EVENT_TYPE_LABEL[p.resolvedEventType] || EVENT_TYPE_LABEL[ct.eventType] || 'career shift';
  const ageLabel = p.displayAgeLabel || p.ageRangeLabel || String(Math.floor(p.age));
  const years = p.calendarYears || 'year unavailable';

  const opening =
    ct.tense === 'future'
      ? `Strongest upcoming ${label} window from your chart timing: age ${ageLabel} (${years}), ${p.mahaDasha || '—'}–${p.antarDasha || '—'} dasha, activation score ${p.careerActivationScore}.`
      : `Strongest ${label} window in your chart: age ${ageLabel} (${years}), ${p.mahaDasha || '—'}–${p.antarDasha || '—'} dasha, activation score ${p.careerActivationScore}.`;

  const reasoning =
    'This is based on your 10th/11th house lordship, dasha alignment, and planetary placements active during that period — not a guaranteed event.';

  const uncertainty =
    p.confidence === 'possible'
      ? 'Note: the chart shows a stronger period around this range, but does not support pinpointing one exact year with high confidence.'
      : '';

  const second = ct.topCareerWindows?.[1];
  const secondLine = second
    ? `Next strongest window: age ${second.ageRangeLabel || second.age} (${second.calendarYears || 'year unavailable'}), ${second.mahaDasha || '—'}–${second.antarDasha || '—'}, score ${second.careerActivationScore}.`
    : '';

  const confidenceLine = `Confidence: ${p.confidence}.`;

  return [opening, reasoning, uncertainty, secondLine, confidenceLine].filter(Boolean).join(' ');
}

/**
 * "What event happened during that window?" is a DIFFERENT question from
 * "what was my strongest window?" -- this does not re-scan/re-rank the
 * lifetime timeline at all. It takes the window the user already named (or,
 * failing that, the most recent one this conversation produced), reads the
 * dasha actually active at that specific point, and ranks all 6 career event
 * TYPES for that one dasha pair using the exact same scoreCareerEventActivation
 * function already used for timing -- no new astrology calculation, just a
 * different question asked of the same scoring engine.
 */
function buildCareerEventInterpretationContext(chart, userMessage, conversationHistory) {
  const chartCtx = chartForTiming(chart);
  const birth = birthDateTime(chartCtx);
  const yearRange = resolveTargetWindow(userMessage, conversationHistory, birth);

  if (!birth?.isValid || !yearRange) {
    return { status: 'window_not_identified' };
  }

  const midYear = Math.round((yearRange.start + yearRange.end) / 2);
  const midDate = DateTime.fromObject(
    { year: midYear, month: 7, day: 1 },
    { zone: chartCtx?.timezone || birth.zone || 'UTC' }
  );
  const age = ageOnDate(birth, midDate);
  const dasha = calculateDashaAtDate(chartCtx, midDate, { preferEngine: true });

  if (!dasha?.mahaDasha) {
    return { status: 'dasha_unavailable', yearRange };
  }

  const rankedEventTypes = CAREER_EVENT_TYPES.map((type) => ({
    type,
    score: scoreCareerEventTypeActivation(chartCtx, dasha.mahaDasha, dasha.antarDasha, age, type)
  })).sort((a, b) => b.score - a.score);

  return {
    status: 'ok',
    yearRange,
    age,
    mahaDasha: dasha.mahaDasha,
    antarDasha: dasha.antarDasha,
    rankedEventTypes
  };
}

/**
 * Explains what TYPE of career shift the chart indicates for an already-named
 * window -- and explicitly refuses to name or confirm a real-world event.
 * GrahaPath has no biographical/historical data source; pretending otherwise
 * would be exactly the kind of fabricated precision this whole engine exists
 * to avoid.
 */
function buildCareerEventInterpretationReply(interpretation) {
  const ctx = interpretation || {};
  if (ctx.status === 'window_not_identified') {
    return 'I can only read a specific window if you name it — for example "what happened during the 1982–1985 window?" Please restate the year range or age range you mean.';
  }
  if (ctx.status === 'dasha_unavailable') {
    return `I could not resolve the dasha active in ${ctx.yearRange.start}–${ctx.yearRange.end} from this chart payload. Please regenerate the chart and try again.`;
  }

  const [top, second] = ctx.rankedEventTypes;
  const label = EVENT_TYPE_LABEL[top.type];
  const secondLabel = second && second.score >= top.score - 8 ? EVENT_TYPE_LABEL[second.type] : null;

  const chartRead = secondLabel
    ? `The ${ctx.mahaDasha}–${ctx.antarDasha} dasha active in that period (around age ${Math.floor(ctx.age)}, ${ctx.yearRange.start}–${ctx.yearRange.end}) most closely matches a ${label} pattern, with secondary ${secondLabel} signals.`
    : `The ${ctx.mahaDasha}–${ctx.antarDasha} dasha active in that period (around age ${Math.floor(ctx.age)}, ${ctx.yearRange.start}–${ctx.yearRange.end}) most closely matches a ${label} pattern.`;

  const disclaimer =
    'GrahaPath does not have access to real-world biographical or historical records, so it cannot name or confirm the specific real-world event (a company, an incident, an exact date) that happened in this window — only the type of career shift the planetary pattern indicates. If you know what actually happened, share it and we can discuss how it maps to this pattern.';

  return `${chartRead} ${disclaimer}`;
}

module.exports = {
  isCareerTimingQuery,
  isCareerEventInterpretationQuery,
  isDirectYearOrAgeQuery,
  detectCareerEventType,
  detectCareerTiming_Tense,
  scoreCareerEventActivation,
  careerAgePlausibilityWeight,
  buildTopCareerWindows,
  buildCareerTimingContext,
  buildCareerTimingDeterministicReply,
  buildCareerEventInterpretationContext,
  buildCareerEventInterpretationReply,
  CAREER_EVENT_TYPES,
  CAREER_MIN_ELIGIBLE_AGE
};
