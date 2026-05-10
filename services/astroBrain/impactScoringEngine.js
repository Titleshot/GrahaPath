/**
 * Event / insight impact tiers for UI and downstream ranking (not deterministic prediction).
 */
function clampEvidenceCount(n) {
  const x = Number(n);
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
}

/**
 * @param {{ confidence?: string, evidenceCount?: number }} input
 * @returns {'major' | 'moderate' | 'minor'}
 */
function classifyInsightImpactLevel(input = {}) {
  const c = String(input.confidence || 'possible').toLowerCase();
  const ec = clampEvidenceCount(input.evidenceCount);

  if ((c === 'strong' && ec >= 3) || (c === 'moderate' && ec >= 5)) {
    return 'major';
  }
  if (c === 'strong' || c === 'moderate' || ec >= 2) {
    return 'moderate';
  }
  return 'minor';
}

function applyImpactToCausalInsights(causalInsights = {}) {
  const insights = (causalInsights.insights || []).map((ins) => {
    const evidenceCount = Array.isArray(ins.evidence) ? ins.evidence.filter(Boolean).length : 0;
    return {
      ...ins,
      impactLevel: classifyInsightImpactLevel({ confidence: ins.confidence, evidenceCount })
    };
  });
  return { ...causalInsights, insights };
}

function applyImpactToFutureSections(futureSections = {}) {
  return Object.fromEntries(
    Object.entries(futureSections).map(([key, sec]) => {
      if (!sec || typeof sec !== 'object') return [key, sec];
      const evidenceCount = Array.isArray(sec.evidence) ? sec.evidence.filter(Boolean).length : 0;
      return [
        key,
        {
          ...sec,
          impactLevel: classifyInsightImpactLevel({ confidence: sec.confidence, evidenceCount })
        }
      ];
    })
  );
}

function applyImpactToPatterns(patterns = {}) {
  const next = { ...patterns };
  Object.keys(next).forEach((key) => {
    const val = next[key];
    if (!val || typeof val !== 'object' || Array.isArray(val)) return;
    const evidenceCount = Array.isArray(val.evidence) ? val.evidence.filter(Boolean).length : 0;
    const summaryLen = String(val.summary || '').length;
    let level = 'minor';
    if (evidenceCount >= 4 || summaryLen > 140) level = 'moderate';
    if (evidenceCount >= 6 && summaryLen > 200) level = 'major';
    next[key] = { ...val, impactLevel: level };
  });
  return next;
}

module.exports = {
  classifyInsightImpactLevel,
  applyImpactToCausalInsights,
  applyImpactToFutureSections,
  applyImpactToPatterns
};
