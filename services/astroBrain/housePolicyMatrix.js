const SECTION_HOUSE_POLICY = {
  personality: { wholeSignWeight: 0.7, bhavaWeight: 0.3 },
  emotional: { wholeSignWeight: 0.65, bhavaWeight: 0.35 },
  relationship: { wholeSignWeight: 0.6, bhavaWeight: 0.4 },
  career: { wholeSignWeight: 0.55, bhavaWeight: 0.45 },
  wealth: { wholeSignWeight: 0.58, bhavaWeight: 0.42 },
  health: { wholeSignWeight: 0.5, bhavaWeight: 0.5 },
  timing: { wholeSignWeight: 0.4, bhavaWeight: 0.6 },
  remedies: { wholeSignWeight: 0.65, bhavaWeight: 0.35 },
  default: { wholeSignWeight: 0.6, bhavaWeight: 0.4 }
};

function policyFor(sectionKey) {
  return SECTION_HOUSE_POLICY[sectionKey] || SECTION_HOUSE_POLICY.default;
}

function effectiveHouseForSection(profile, sectionKey) {
  if (!profile) return null;
  const wholeHouse = Number.isFinite(profile.house) ? profile.house : null;
  const bhavaHouse = Number.isFinite(profile.activeBhavaHouse) ? profile.activeBhavaHouse : wholeHouse;
  if (!Number.isFinite(wholeHouse) && !Number.isFinite(bhavaHouse)) return null;
  if (wholeHouse === bhavaHouse) return wholeHouse;
  const policy = policyFor(sectionKey);
  const weighted = (wholeHouse || 0) * policy.wholeSignWeight + (bhavaHouse || 0) * policy.bhavaWeight;
  return Math.round(weighted);
}

function buildHousePolicyMatrix() {
  return {
    policy: SECTION_HOUSE_POLICY,
    caveat:
      'Whole-sign remains foundational. Bhava-chalit receives higher weight for event/timing-sensitive sections.'
  };
}

module.exports = {
  buildHousePolicyMatrix,
  policyFor,
  effectiveHouseForSection
};

