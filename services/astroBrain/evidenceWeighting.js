function weightedEvidence(signals = [], topN = 4) {
  return (signals || [])
    .filter((s) => s && s.label)
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .slice(0, topN)
    .map((s) => s.label);
}

function confidenceFromWeights(signals = []) {
  const total = (signals || []).reduce((sum, s) => sum + (s?.weight || 0), 0);
  if (total >= 6) return 'strong';
  if (total >= 3.5) return 'moderate';
  return 'possible';
}

module.exports = {
  weightedEvidence,
  confidenceFromWeights
};

