const STRONG_WORDS = [
  { from: /\bwill\b/gi, to: 'may' },
  { from: /\balways\b/gi, to: 'often' },
  { from: /\bguaranteed?\b/gi, to: 'possible' },
  { from: /\bdefinitely\b/gi, to: 'likely' },
  { from: /\bcertainly\b/gi, to: 'likely' },
  { from: /\bmust\b/gi, to: 'may need to' }
];

const PRESETS = {
  lenient: { minEvidenceCount: 1, mixedSignalStrongMin: 7, mixedSignalWeakMax: -6 },
  balanced: { minEvidenceCount: 2, mixedSignalStrongMin: 6, mixedSignalWeakMax: -5 },
  strict: { minEvidenceCount: 3, mixedSignalStrongMin: 5, mixedSignalWeakMax: -4 }
};

function resolveGuardrailConfig() {
  const presetKey = String(process.env.GUARDRAIL_PRESET || 'balanced').toLowerCase();
  const preset = PRESETS[presetKey] || PRESETS.balanced;

  return {
    preset: PRESETS[presetKey] ? presetKey : 'balanced',
    minEvidenceCount: Number(process.env.GUARDRAIL_MIN_EVIDENCE_COUNT || preset.minEvidenceCount),
    mixedSignalStrongMin: Number(process.env.GUARDRAIL_STRONG_MIN || preset.mixedSignalStrongMin),
    mixedSignalWeakMax: Number(process.env.GUARDRAIL_WEAK_MAX || preset.mixedSignalWeakMax)
  };
}

function softenText(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  STRONG_WORDS.forEach(({ from, to }) => {
    out = out.replace(from, to);
  });
  return out;
}

function downgradeConfidence(confidence) {
  if (confidence === 'strong') return 'moderate';
  if (confidence === 'moderate') return 'possible';
  return confidence || 'possible';
}

function applyGuardrailToSection(section, config, conflict = false) {
  if (!section || typeof section !== 'object') return section;
  const evidenceCount = Array.isArray(section.evidence) ? section.evidence.filter(Boolean).length : 0;
  const weakEvidence = evidenceCount < config.minEvidenceCount;
  const shouldSoften = weakEvidence || conflict;
  if (!shouldSoften) return section;

  return {
    ...section,
    title: softenText(section.title),
    observation: softenText(section.observation),
    cause: softenText(section.cause),
    timing: softenText(section.timing),
    action: softenText(section.action),
    effect: softenText(section.effect),
    summary: softenText(section.summary),
    confidence: downgradeConfidence(section.confidence),
    guardrailNote: weakEvidence
      ? 'Confidence softened due to limited evidence density.'
      : 'Confidence softened due to mixed or conflicting signals.'
  };
}

function hasConflictSignals(strength, config) {
  const scores = strength?.scores || [];
  const hasVeryStrong = scores.some((s) => Number(s.totalScore) >= config.mixedSignalStrongMin);
  const hasVeryWeak = scores.some((s) => Number(s.totalScore) <= config.mixedSignalWeakMax);
  return hasVeryStrong && hasVeryWeak;
}

function applyClaimGuardrails({ causalInsights, futureSections, patterns, strength, arbitration }) {
  const config = resolveGuardrailConfig();
  const conflict = hasConflictSignals(strength, config) || arbitration?.mode === 'conservative';

  const guardedCausal = {
    ...causalInsights,
    insights: (causalInsights?.insights || []).map((item) => applyGuardrailToSection(item, config, conflict))
  };

  const guardedFuture = Object.fromEntries(
    Object.entries(futureSections || {}).map(([key, value]) => [key, applyGuardrailToSection(value, config, conflict)])
  );

  const guardedPatterns = Object.fromEntries(
    Object.entries(patterns || {}).map(([key, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [key, value];
      return [key, applyGuardrailToSection(value, config, conflict)];
    })
  );

  return {
    causalInsights: guardedCausal,
    futureSections: guardedFuture,
    patterns: guardedPatterns,
    guardrailMeta: {
      conflictDetected: conflict,
      mode: conflict ? 'mixed_signal_softening' : 'weak_evidence_softening',
      config: {
        preset: config.preset,
        minEvidenceCount: config.minEvidenceCount,
        mixedSignalStrongMin: config.mixedSignalStrongMin,
        mixedSignalWeakMax: config.mixedSignalWeakMax
      }
    }
  };
}

module.exports = {
  applyClaimGuardrails
};

