function parseEventDate(value) {
  const ts = Date.parse(value || '');
  return Number.isFinite(ts) ? new Date(ts) : null;
}

/**
 * Anchor instant for a life event: full calendar day, or month-year (15th UTC noon).
 * Used by rectification + dasha-range checks so approximate events still participate.
 */
function resolveLifeEventAnchorDate(evt = {}) {
  const d = String(evt?.date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const ts = Date.parse(`${d}T12:00:00.000Z`);
    return Number.isFinite(ts) ? new Date(ts) : null;
  }
  const ym = String(evt?.yearMonth || '').trim();
  if (/^\d{4}-\d{2}$/.test(ym)) {
    const [y, m] = ym.split('-').map((x) => Number(x));
    if (y >= 1800 && y <= 2200 && m >= 1 && m <= 12) {
      const ts = Date.parse(`${y}-${String(m).padStart(2, '0')}-15T12:00:00.000Z`);
      return Number.isFinite(ts) ? new Date(ts) : null;
    }
  }
  return parseEventDate(d);
}

const RECTIFICATION_MIN_DELTA = Number(process.env.RECTIFICATION_MIN_DELTA || 0.08);
const RECTIFICATION_MIN_EVENTS = Number(process.env.RECTIFICATION_MIN_EVENTS || 3);
const RECTIFICATION_MIN_EVENT_CATEGORIES = Number(process.env.RECTIFICATION_MIN_EVENT_CATEGORIES || 2);
const RECTIFICATION_MIN_CATEGORY_QUALITY = Number(process.env.RECTIFICATION_MIN_CATEGORY_QUALITY || 1.35);

const CATEGORY_QUALITY_WEIGHT = {
  career: 0.9,
  job: 0.7,
  education: 0.7,
  marriage: 0.95,
  relationship: 0.85,
  breakup: 0.9,
  health: 0.95,
  relocation: 0.8,
  travel: 0.55,
  finance: 0.8,
  loss: 0.75,
  child: 0.95,
  family: 0.7,
  accident: 1.0,
  general: 0.45
};

/** Per-event impact: major milestones weigh more than minor notes in rectification averages. */
const IMPACT_WEIGHTS = {
  major: 1.35,
  high: 1.15,
  standard: 1.0,
  minor: 0.65,
  micro: 0.45
};

const CATEGORY_DEFAULT_IMPACT = {
  marriage: 'major',
  child: 'major',
  accident: 'major',
  breakup: 'high',
  health: 'high',
  loss: 'high',
  career: 'standard',
  job: 'standard',
  education: 'standard',
  relationship: 'standard',
  relocation: 'standard',
  finance: 'standard',
  family: 'standard',
  travel: 'minor',
  general: 'minor'
};

const NOTE_MAJOR_HINTS = [
  'wedding',
  'funeral',
  'death',
  'childbirth',
  'born child',
  'gave birth',
  'major surgery',
  'surgery',
  'graduated',
  'graduation',
  'milestone',
  'first child',
  'divorce finalized',
  'divorce'
];
const NOTE_HIGH_HINTS = [
  'promotion',
  'fired',
  'laid off',
  'engagement',
  'broke up',
  'serious illness',
  'hospitalized',
  'moved abroad',
  'immigration',
  'major move'
];
const NOTE_MINOR_HINTS = ['weekend', 'vacation', 'short trip', 'day trip', 'minor', 'small trip', 'casual trip'];

function dateInRange(date, start, end) {
  if (!date || !start || !end) return false;
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function countValidDatedEvents(lifeEvents = []) {
  return (lifeEvents || []).reduce((sum, evt) => {
    const validDate = resolveLifeEventAnchorDate(evt);
    return sum + (validDate ? 1 : 0);
  }, 0);
}

const EVENT_RULES = {
  career: { houses: [10, 6, 11, 2], planets: ['Saturn', 'Sun', 'Mars', 'Mercury'] },
  job: { houses: [10, 6, 11, 2], planets: ['Saturn', 'Sun', 'Mars', 'Mercury'] },
  education: { houses: [4, 5, 9], planets: ['Jupiter', 'Mercury', 'Moon'] },
  marriage: { houses: [7, 2, 11], planets: ['Venus', 'Jupiter', 'Moon'] },
  relationship: { houses: [7, 5, 8], planets: ['Venus', 'Moon', 'Rahu', 'Ketu'] },
  breakup: { houses: [8, 12, 6], planets: ['Ketu', 'Saturn', 'Rahu'] },
  health: { houses: [6, 8, 12], planets: ['Saturn', 'Mars', 'Ketu', 'Moon'] },
  relocation: { houses: [4, 12, 9], planets: ['Rahu', 'Moon', 'Saturn'] },
  travel: { houses: [9, 12, 3], planets: ['Rahu', 'Moon', 'Mercury'] },
  finance: { houses: [2, 11, 8], planets: ['Jupiter', 'Venus', 'Mercury', 'Rahu'] },
  loss: { houses: [8, 12], planets: ['Ketu', 'Saturn', 'Rahu'] },
  child: { houses: [5, 9, 2], planets: ['Jupiter', 'Moon', 'Venus'] },
  family: { houses: [2, 4], planets: ['Moon', 'Venus', 'Jupiter'] },
  accident: { houses: [8, 6], planets: ['Mars', 'Saturn', 'Rahu', 'Ketu'] }
};

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function pickEventRule(event = {}) {
  const typeTokens = tokenize(event?.type);
  const noteTokens = tokenize(event?.note);
  const all = [...typeTokens, ...noteTokens];
  for (const token of all) {
    if (EVENT_RULES[token]) return EVENT_RULES[token];
  }
  return { houses: [1, 4, 7, 10], planets: ['Moon', 'Saturn', 'Jupiter'] };
}

function resolveEventImpact(event = {}) {
  const explicit = normalizeText(event.impact || event.milestone || event.severity);
  if (explicit && IMPACT_WEIGHTS[explicit]) {
    return { label: explicit, weight: IMPACT_WEIGHTS[explicit], source: 'explicit' };
  }

  const hay = `${normalizeText(event.note)} ${normalizeText(event.type)}`;
  if (NOTE_MAJOR_HINTS.some((h) => hay.includes(h))) {
    return { label: 'major', weight: IMPACT_WEIGHTS.major, source: 'inferred_note' };
  }
  if (NOTE_HIGH_HINTS.some((h) => hay.includes(h))) {
    return { label: 'high', weight: IMPACT_WEIGHTS.high, source: 'inferred_note' };
  }
  if (NOTE_MINOR_HINTS.some((h) => hay.includes(h))) {
    return { label: 'minor', weight: IMPACT_WEIGHTS.minor, source: 'inferred_note' };
  }

  const cat = normalizeEventCategory(event);
  const tier = CATEGORY_DEFAULT_IMPACT[cat] || 'standard';
  return { label: tier, weight: IMPACT_WEIGHTS[tier] || IMPACT_WEIGHTS.standard, source: 'category_default' };
}

function normalizeEventCategory(event = {}) {
  const typeTokens = tokenize(event?.type);
  const noteTokens = tokenize(event?.note);
  const all = [...typeTokens, ...noteTokens];
  for (const token of all) {
    if (EVENT_RULES[token]) return token;
  }
  return 'general';
}

function countDistinctEventCategories(lifeEvents = []) {
  const categories = new Set();
  (lifeEvents || []).forEach((evt) => {
    if (!resolveLifeEventAnchorDate(evt)) return;
    categories.add(normalizeEventCategory(evt));
  });
  return {
    count: categories.size,
    categories: Array.from(categories)
  };
}

function categoryQualityScore(categories = []) {
  return Number(
    (categories || [])
      .reduce((sum, c) => sum + (CATEGORY_QUALITY_WEIGHT[c] || CATEGORY_QUALITY_WEIGHT.general), 0)
      .toFixed(3)
  );
}

function currentDashaWindow(dasha = {}) {
  const windows = [];
  if (dasha?.currentDasha?.startDateApprox && dasha?.currentDasha?.endDateApprox) {
    windows.push({
      startDateApprox: dasha.currentDasha.startDateApprox,
      endDateApprox: dasha.currentDasha.endDateApprox,
      label: dasha.currentDasha.planet || 'Mahadasha'
    });
  }
  if (dasha?.currentAntardasha?.startDateApprox && dasha?.currentAntardasha?.endDateApprox) {
    windows.push({
      startDateApprox: dasha.currentAntardasha.startDateApprox,
      endDateApprox: dasha.currentAntardasha.endDateApprox,
      label: dasha.currentAntardasha.antarLord || 'Antardasha'
    });
  }
  return windows;
}

function scoreLifeEventsAgainstDasha(lifeEvents = [], dasha = {}) {
  const timeline = currentDashaWindow(dasha);
  if (!timeline.length || !lifeEvents.length) {
    return { score: 0, matched: 0, total: lifeEvents.length, byEvent: [] };
  }

  let matched = 0;
  const byEvent = [];
  lifeEvents.forEach((evt) => {
    const eventDate = resolveLifeEventAnchorDate(evt);
    if (!eventDate) {
      byEvent.push({
        event: evt?.type || 'unknown',
        date: evt?.date || null,
        dateAligned: false,
        reason: 'Invalid or missing date'
      });
      return;
    }
    const hit = timeline.find((d) => {
      const start = parseEventDate(d.startDateApprox);
      const end = parseEventDate(d.endDateApprox);
      return dateInRange(eventDate, start, end);
    });
    if (hit) matched += 1;
    byEvent.push({
      event: evt?.type || 'unknown',
      date: evt?.date || null,
      dateAligned: Boolean(hit),
      matchedWindow: hit?.label || null
    });
  });

  return {
    score: lifeEvents.length ? matched / lifeEvents.length : 0,
    matched,
    total: lifeEvents.length,
    byEvent
  };
}

function mapHouseLordsByHouse(houseLords = {}) {
  const out = {};
  (houseLords?.houses || []).forEach((h) => {
    out[h.house] = h?.lord || null;
  });
  return out;
}

function structuralEventScore(event, chart = {}) {
  const rule = pickEventRule(event);
  const dashaLord = chart?.astroBrain?.currentDasha?.planet || null;
  const antarLord = chart?.astroBrain?.currentAntardasha?.antarLord || null;
  const lordByHouse = mapHouseLordsByHouse(chart?.astroBrain?.debug?.houseLords || chart?.astroBrain?.houseLords);
  const dominant = new Set((chart?.astroBrain?.dominantPlanets || []).map((x) => x.planet));
  const challenged = new Set((chart?.astroBrain?.challengedPlanets || []).map((x) => x.planet));
  const activeLords = new Set(
    rule.houses
      .map((h) => lordByHouse[h])
      .filter(Boolean)
  );

  let points = 0;
  const evidence = [];

  if (dashaLord && (rule.planets.includes(dashaLord) || activeLords.has(dashaLord))) {
    points += 0.42;
    evidence.push(`Dasha lord ${dashaLord} matches event rule`);
  }
  if (antarLord && (rule.planets.includes(antarLord) || activeLords.has(antarLord))) {
    points += 0.28;
    evidence.push(`Antardasha lord ${antarLord} matches event rule`);
  }

  let dominantHits = 0;
  let challengedHits = 0;
  rule.planets.forEach((p) => {
    if (dominant.has(p)) dominantHits += 1;
    if (challenged.has(p)) challengedHits += 1;
  });
  if (dominantHits > 0) {
    points += Math.min(0.2, dominantHits * 0.08);
    evidence.push(`Dominant planet overlap: ${dominantHits}`);
  }
  if (challengedHits > 0) {
    points += Math.min(0.14, challengedHits * 0.05);
    evidence.push(`Challenged planet overlap: ${challengedHits}`);
  }

  const normalized = Math.max(0, Math.min(1, points));
  return {
    score: Number(normalized.toFixed(3)),
    confidence: normalized >= 0.7 ? 'high' : normalized >= 0.45 ? 'medium' : 'low',
    evidence
  };
}

function combinedEventAlignment(dateAlignment = {}, lifeEvents = [], chart = {}) {
  if (!lifeEvents.length) {
    return {
      score: 0,
      matched: 0,
      total: 0,
      weightedMatched: 0,
      totalImpactMass: 0,
      matchedImpactMass: 0,
      byEvent: []
    };
  }

  let sumImpactWeightedCombined = 0;
  let totalImpactMass = 0;
  let matchedImpactMass = 0;
  const byEvent = lifeEvents.map((evt, idx) => {
    const timing = dateAlignment.byEvent?.[idx] || {};
    const structural = structuralEventScore(evt, chart);
    const timingScore = timing.dateAligned ? 1 : 0;
    const combined = 0.45 * timingScore + 0.55 * structural.score;
    const impact = resolveEventImpact(evt);
    const hasValidDate = Boolean(resolveLifeEventAnchorDate(evt));

    if (hasValidDate) {
      sumImpactWeightedCombined += impact.weight * combined;
      totalImpactMass += impact.weight;
      if (combined >= 0.5) matchedImpactMass += impact.weight;
    }

    return {
      event: evt?.type || 'unknown',
      date: evt?.date || null,
      timingAligned: Boolean(timing.dateAligned),
      structuralScore: structural.score,
      combinedScore: Number(combined.toFixed(3)),
      structuralConfidence: structural.confidence,
      evidence: structural.evidence,
      impact: {
        label: impact.label,
        weight: impact.weight,
        source: impact.source
      }
    };
  });

  const matched = byEvent.filter((x, i) => {
    if (!resolveLifeEventAnchorDate(lifeEvents[i])) return false;
    return x.combinedScore >= 0.5;
  }).length;

  const score = totalImpactMass > 0 ? sumImpactWeightedCombined / totalImpactMass : 0;

  return {
    score: Number(score.toFixed(3)),
    matched,
    total: lifeEvents.length,
    weightedMatched: Number(sumImpactWeightedCombined.toFixed(3)),
    totalImpactMass: Number(totalImpactMass.toFixed(3)),
    matchedImpactMass: Number(matchedImpactMass.toFixed(3)),
    byEvent
  };
}

function buildRectificationSuggestion(timeSensitivity, eventScore, hasEventData) {
  const unstable = timeSensitivity?.unstable === true;
  const matched = eventScore?.matched || 0;
  const total = eventScore?.total || 0;
  const ratio = eventScore?.score || 0;

  if (!hasEventData || total === 0) {
    return {
      status: unstable ? 'needs_time_refinement' : 'acceptable',
      confidence: unstable ? 'low' : 'medium',
      note: unstable
        ? 'House pattern is time-sensitive. Add life-event checkpoints (career, relationship, relocation) for better birth-time refinement.'
        : 'Provide life-event checkpoints to refine timing confidence further.'
    };
  }

  if (unstable && ratio < 0.5) {
    return {
      status: 'refinement_recommended',
      confidence: 'low',
      note: `Only ${matched}/${total} weighted events align with dasha + house-lord signatures and chart is time-sensitive. Consider refining birth time.`
    };
  }

  if (ratio >= 0.7) {
    return {
      status: 'strong_alignment',
      confidence: unstable ? 'medium' : 'high',
      note: `${matched}/${total} weighted events align with dasha + house-lord signatures, supporting current birth-time frame.`
    };
  }

  return {
    status: 'partial_alignment',
    confidence: unstable ? 'low' : 'medium',
    note: `${matched}/${total} weighted events align with dasha + house-lord signatures. More event anchors can improve rectification certainty.`
  };
}

function evaluateBirthTimeRectification(chart, lifeEvents = []) {
  const dateAlignment = scoreLifeEventsAgainstDasha(lifeEvents, chart?.astroBrain || {});
  const eventScore = combinedEventAlignment(dateAlignment, lifeEvents, chart);
  const suggestion = buildRectificationSuggestion(chart?.timeSensitivity, eventScore, lifeEvents.length > 0);
  return {
    model: 'rectification_v3_per_event_impact',
    dateAlignment,
    eventAlignment: eventScore,
    suggestion,
    caveat:
      'Rectification assistant is an evidence-weighted heuristic and not a substitute for full manual rectification practice. Event alignment score uses per-event impact weights (major milestones count more than minor notes).'
  };
}

function compareRectificationOffsets(candidates = [], lifeEvents = []) {
  const validEventCount = countValidDatedEvents(lifeEvents);
  const eventDiversity = countDistinctEventCategories(lifeEvents);
  const rows = (candidates || [])
    .filter((c) => c && c.chart)
    .map((c) => {
      const result = evaluateBirthTimeRectification(c.chart, lifeEvents);
      const ea = result?.eventAlignment || {};
      const mass = Number(ea.totalImpactMass || 0);
      const matchedMass = Number(ea.matchedImpactMass || 0);
      return {
        offsetMinutes: Number.isFinite(c.offsetMinutes) ? c.offsetMinutes : 0,
        localDateTime: c.chart?.localDateTime || null,
        eventAlignmentScore: Number(ea.score || 0),
        matchedEvents: Number(ea.matched || 0),
        totalEvents: Number(ea.total || 0),
        totalImpactMass: mass,
        matchedImpactMass: matchedMass,
        matchedImpactRatio: mass > 0 ? Number((matchedMass / mass).toFixed(3)) : 0,
        suggestion: result?.suggestion || null
      };
    })
    .sort((a, b) => {
      if (b.eventAlignmentScore !== a.eventAlignmentScore) {
        return b.eventAlignmentScore - a.eventAlignmentScore;
      }
      return Math.abs(a.offsetMinutes) - Math.abs(b.offsetMinutes);
    });

  const best = rows[0] || null;
  const baseline = rows.find((r) => r.offsetMinutes === 0) || null;
  const deltaFromBaseline =
    best && baseline ? Number((best.eventAlignmentScore - baseline.eventAlignmentScore).toFixed(3)) : 0;
  const hasMeaningfulLift = deltaFromBaseline >= RECTIFICATION_MIN_DELTA;
  const hasMinimumEvents = validEventCount >= RECTIFICATION_MIN_EVENTS;
  const hasCategoryDiversity = eventDiversity.count >= RECTIFICATION_MIN_EVENT_CATEGORIES;
  const observedCategoryQuality = categoryQualityScore(eventDiversity.categories);
  const hasCategoryQuality = observedCategoryQuality >= RECTIFICATION_MIN_CATEGORY_QUALITY;
  const suggestShift = Boolean(
    best &&
      baseline &&
      best.offsetMinutes !== 0 &&
      hasMeaningfulLift &&
      hasMinimumEvents &&
      hasCategoryDiversity &&
      hasCategoryQuality
  );
  const gateStatus = !best || !baseline
    ? 'insufficient_data'
    : !hasMinimumEvents
      ? 'insufficient_events'
      : !hasCategoryDiversity
        ? 'insufficient_event_diversity'
        : !hasCategoryQuality
          ? 'insufficient_event_quality'
      : suggestShift
        ? 'shift_recommended'
        : 'keep_baseline';

  return {
    confidenceGate: {
      minDeltaRequired: RECTIFICATION_MIN_DELTA,
      minValidEventsRequired: RECTIFICATION_MIN_EVENTS,
      minDistinctEventCategoriesRequired: RECTIFICATION_MIN_EVENT_CATEGORIES,
      minCategoryQualityRequired: RECTIFICATION_MIN_CATEGORY_QUALITY,
      validEventCount,
      distinctEventCategoryCount: eventDiversity.count,
      eventCategories: eventDiversity.categories,
      observedCategoryQuality,
      observedDelta: deltaFromBaseline,
      passed: suggestShift,
      status: gateStatus
    },
    testedOffsetsMinutes: rows.map((r) => r.offsetMinutes),
    bestCandidate: suggestShift ? best : baseline || best,
    bestRawCandidate: best,
    baselineCandidate: baseline,
    scoreDeltaFromBaseline: deltaFromBaseline,
    recommendation:
      !best || !baseline
        ? 'Not enough data to compare offsets.'
        : !hasMinimumEvents
          ? `Need at least ${RECTIFICATION_MIN_EVENTS} valid dated life events (got ${validEventCount}) before recommending birth-time shift.`
        : !hasCategoryDiversity
          ? `Need at least ${RECTIFICATION_MIN_EVENT_CATEGORIES} distinct valid event categories (got ${eventDiversity.count}) before recommending birth-time shift.`
        : !hasCategoryQuality
          ? `Event-category quality score is too low (${observedCategoryQuality} < ${RECTIFICATION_MIN_CATEGORY_QUALITY}); add higher-signal categories (for example: career + marriage/health/accident).`
        : !hasMeaningfulLift
          ? `Evidence lift is below threshold (${deltaFromBaseline} < ${RECTIFICATION_MIN_DELTA}); keep exact provided time.`
          : best.offsetMinutes === 0
          ? 'Exact provided time remains best fit against current life-event evidence.'
          : `Offset ${best.offsetMinutes > 0 ? '+' : ''}${best.offsetMinutes} minutes fits life-event evidence better than exact time.`,
    rankedCandidates: rows
  };
}

module.exports = {
  evaluateBirthTimeRectification,
  compareRectificationOffsets,
  resolveEventImpact,
  resolveLifeEventAnchorDate,
  pickEventRule,
  normalizeEventCategory
};

