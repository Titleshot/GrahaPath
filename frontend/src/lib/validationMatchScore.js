const POINTS = {
  match: 35,
  partial: 20,
  no: 5
};

const MAX_POINTS = 35 * 3;

/**
 * @param {Record<string, string>} responses phaseId -> 'match' | 'partial' | 'no'
 * @param {{ id: string }[]} phases
 */
export function computePastPatternMatchPercent(responses, phases) {
  if (!phases?.length) {
    return null;
  }

  const answeredAll = phases.every((phase) => {
    const v = responses[phase.id];
    return v != null && Object.prototype.hasOwnProperty.call(POINTS, v);
  });

  if (!answeredAll) {
    return null;
  }

  const total = phases.reduce((sum, phase) => sum + (POINTS[responses[phase.id]] || 0), 0);
  return Math.round((total / MAX_POINTS) * 100);
}
