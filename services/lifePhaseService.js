const VALIDATION_OPTIONS = [
  { value: 'match', label: '✔ This matches me', score: 1 },
  { value: 'partial', label: '⚠ Partially', score: 0.55 },
  { value: 'no', label: '✖ Not really', score: 0 }
];

const LIFE_PHASES = [
  {
    id: 'early-formation',
    phase: 'Phase 1',
    ageRange: '0-14',
    title: 'Early Emotional & Mental Formation',
    content: [
      'During your early years, your chart suggests that your emotional sensitivity and awareness developed faster than your surroundings could fully understand.',
      'You may have noticed moments where you observed more than you expressed — processing things internally rather than reacting outwardly.',
      'There could have been phases where you felt slightly different from others, not necessarily disconnected, but more aware of your environment and people’s behavior.',
      'This phase often shapes a deep inner world — one that later becomes your strength, but early on, may have felt like overthinking or emotional depth without clear direction.'
    ],
    validationOptions: VALIDATION_OPTIONS
  },
  {
    id: 'identity-direction',
    phase: 'Phase 2',
    ageRange: '15-24',
    title: 'Identity Building & Internal Conflict',
    content: [
      'As you moved into your teenage and early adult years, your chart indicates a phase of questioning direction and identity.',
      'You may have explored multiple paths — academically, socially, or personally — without feeling fully settled in one.',
      'There is often a push-pull dynamic here: one part of you seeks clarity and structure, while another part resists limitation and seeks freedom.',
      'This phase may have brought moments of self-doubt, comparison, or pressure to “figure things out,” even when the internal path was still forming.',
      'However, this exploration is not a weakness — it is how your system learns depth before direction.'
    ],
    validationOptions: VALIDATION_OPTIONS
  },
  {
    id: 'pressure-alignment',
    phase: 'Phase 3',
    ageRange: '25-Present',
    title: 'Responsibility, Career Pressure & Alignment',
    content: [
      'In your current phase, your chart shows increasing pressure to stabilize your path — especially in areas related to career, finances, and long-term direction.',
      'You may feel a growing need to become “clear” and “settled,” while internally still refining what truly aligns with you.',
      'There can be moments where external expectations feel heavier than your internal readiness, creating a sense of pressure or urgency.',
      'At the same time, your chart indicates that this phase is where your real growth begins — not through instant clarity, but through consistent effort and self-understanding.',
      'This is the phase where your life starts shaping into something real.'
    ],
    validationOptions: VALIDATION_OPTIONS
  }
];

function getLifePhaseValidation() {
  return {
    phases: LIFE_PHASES.map((phase) => ({
      ...phase,
      paragraphs: phase.content
    })),
    transition: {
      title: 'Your responses show strong alignment with your planetary life pattern.',
      body:
        'These same planetary forces don’t just explain your past — they define your future direction, career growth, financial potential, relationships, and life outcomes.',
      cta: 'Unlock Your Future Analysis'
    }
  };
}

function scorePhaseResponses(responses = []) {
  const scoreByValue = new Map(VALIDATION_OPTIONS.map((option) => [option.value, option.score]));
  const responseList = Array.isArray(responses)
    ? responses
    : Object.entries(responses).map(([phaseId, value]) => ({ phaseId, value }));
  const normalizedResponses = LIFE_PHASES.map((phase) => {
    const response = responseList.find((item) => item.phaseId === phase.id);
    const value = response && scoreByValue.has(response.value) ? response.value : null;

    return {
      phaseId: phase.id,
      value,
      score: value ? scoreByValue.get(value) : 0
    };
  });
  const totalScore = normalizedResponses.reduce((sum, response) => sum + response.score, 0);
  const alignmentScore = Math.round((totalScore / LIFE_PHASES.length) * 100);

  return {
    alignmentScore,
    alignmentLevel:
      alignmentScore >= 75 ? 'strong' : alignmentScore >= 45 ? 'moderate' : 'low',
    responses: normalizedResponses,
    showPaywallPrompt: alignmentScore >= 45,
    transition: getLifePhaseValidation().transition,
    transitionBlock: getLifePhaseValidation().transition.body,
    cta: getLifePhaseValidation().transition.cta
  };
}

module.exports = {
  LIFE_PHASES,
  VALIDATION_OPTIONS,
  buildLifePhaseValidation: getLifePhaseValidation,
  getLifePhaseValidation,
  scorePhaseValidation: scorePhaseResponses,
  scorePhaseResponses
};
