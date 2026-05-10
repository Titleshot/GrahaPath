const VALIDATION_OPTIONS = [
  { value: 'match', label: '✔ This matches me', score: 1 },
  { value: 'partial', label: '⚠ Partially', score: 0.55 },
  { value: 'no', label: '✖ Not really', score: 0 }
];

const SIGN_TONES = {
  Aries: 'fast response and direct expression',
  Taurus: 'steady processing and stability-seeking',
  Gemini: 'mental agility and multiple viewpoints',
  Cancer: 'protective emotion and memory depth',
  Leo: 'identity-led expression and visibility needs',
  Virgo: 'analysis, correction, and detail focus',
  Libra: 'balance-seeking and relational calibration',
  Scorpio: 'deep internal processing and trust testing',
  Sagittarius: 'meaning-seeking and future framing',
  Capricorn: 'duty-focused maturity and delayed rewards',
  Aquarius: 'detached insight and unconventional framing',
  Pisces: 'sensitivity, permeability, and symbolic processing'
};

const FALLBACK_PHASES = [
  {
    id: 'early-formation',
    phase: 'Phase 1',
    ageRange: '0-14',
    title: 'Early Emotional & Mental Formation',
    paragraphs: [
      'During early years, your pattern suggests heightened emotional observation before expression.',
      'You may have processed situations internally before reacting outwardly.',
      'This can create strong self-awareness later, even if it felt like overthinking early on.'
    ]
  },
  {
    id: 'identity-direction',
    phase: 'Phase 2',
    ageRange: '15-24',
    title: 'Identity Building & Internal Conflict',
    paragraphs: [
      'This phase often brings identity testing through study, peers, and early responsibility.',
      'You may have explored multiple paths before committing to one direction.',
      'The tension between freedom and structure can be part of your growth arc.'
    ]
  },
  {
    id: 'pressure-alignment',
    phase: 'Phase 3',
    ageRange: '25-Present',
    title: 'Responsibility, Career Pressure & Alignment',
    paragraphs: [
      'This period tends to prioritize clarity in work, finances, and long-term direction.',
      'Pressure can increase as external expectations meet internal refinement.',
      'Sustained consistency often matters more than fast outcomes in this phase.'
    ]
  }
];

function planetByName(chart, name) {
  return chart?.planets?.find((p) => p.name === name) || null;
}

function houseTone(house) {
  if ([1, 4, 7, 10].includes(house)) return 'high visibility and direct life pressure';
  if ([6, 8, 12].includes(house)) return 'internal pressure, complexity, and slower integration';
  if ([2, 11].includes(house)) return 'value and resource-oriented focus';
  return 'skill-building and directional experimentation';
}

function describeSignal(p) {
  if (!p) return 'a mixed planetary signal';
  return `${p.name} in ${p.sign} (house ${p.house})`;
}

function dynamicLifePhases(chart) {
  const moon = planetByName(chart, 'Moon');
  const saturn = planetByName(chart, 'Saturn');
  const rahu = planetByName(chart, 'Rahu');
  const lagna = chart?.ascendant || 'your ascendant';
  const dasha = chart?.astroBrain?.currentDasha?.planet || null;

  const moonTone = moon ? SIGN_TONES[moon.sign] || 'emotional processing depth' : 'emotional processing depth';
  const saturnTone = saturn ? houseTone(saturn.house) : 'responsibility pressure';
  const rahuTone = rahu ? houseTone(rahu.house) : 'ambition and uncertainty';

  return [
    {
      id: 'early-formation',
      phase: 'Phase 1',
      ageRange: '0-14',
      title: `Early Formation Through ${moon?.sign || 'Emotional'} Processing`,
      paragraphs: [
        `Your early years likely carried a ${moonTone} style of internal development, where you understood more than you expressed.`,
        `This pattern is linked to ${describeSignal(moon)}, which often builds silent observation before outward confidence.`,
        `There may have been moments of feeling slightly out-of-sync with peers, not from disconnection but from deeper internal processing.`,
        `As a result, early sensitivity may later become pattern-recognition strength in adult life.`
      ]
    },
    {
      id: 'identity-direction',
      phase: 'Phase 2',
      ageRange: '15-24',
      title: 'Identity Building Through Pressure and Experimentation',
      paragraphs: [
        `This phase often reflects tension between self-definition and external pressure, especially with ${describeSignal(saturn)} in the chart narrative.`,
        `You may have tested multiple directions while trying to reconcile personal identity (${lagna}) with practical expectations.`,
        `The push-pull dynamic can look like wanting clarity while resisting premature commitment — a normal growth pattern, not a flaw.`,
        `By the end of this phase, decision quality usually improves because your internal filters become sharper.`
      ]
    },
    {
      id: 'pressure-alignment',
      phase: 'Phase 3',
      ageRange: '25-Present',
      title: 'Current Alignment: Responsibility Meets Direction',
      paragraphs: [
        `Your current phase emphasizes long-term structuring in career, money, and personal direction, with ${saturnTone} themes becoming more visible.`,
        `This is reinforced by ${describeSignal(rahu)}, which can increase ambition while also testing focus and consistency.`,
        dasha
          ? `The active ${dasha} period can make these themes feel immediate right now, increasing pressure to choose what is sustainable.`
          : 'Current timing suggests a consolidation period where steady effort matters more than speed.',
        `Growth in this phase usually comes from disciplined execution and clearer boundaries, not instant certainty.`
      ]
    }
  ];
}

function getLifePhaseValidation(chart = null) {
  const phases = chart ? dynamicLifePhases(chart) : FALLBACK_PHASES;
  return {
    phases: phases.map((phase) => ({
      ...phase,
      validationOptions: VALIDATION_OPTIONS,
      paragraphs: phase.paragraphs || phase.content
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
  const normalizedResponses = FALLBACK_PHASES.map((phase) => {
    const response = responseList.find((item) => item.phaseId === phase.id);
    const value = response && scoreByValue.has(response.value) ? response.value : null;

    return {
      phaseId: phase.id,
      value,
      score: value ? scoreByValue.get(value) : 0
    };
  });
  const totalScore = normalizedResponses.reduce((sum, response) => sum + response.score, 0);
  const alignmentScore = Math.round((totalScore / FALLBACK_PHASES.length) * 100);

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
  LIFE_PHASES: FALLBACK_PHASES,
  VALIDATION_OPTIONS,
  buildLifePhaseValidation: getLifePhaseValidation,
  getLifePhaseValidation,
  scorePhaseValidation: scorePhaseResponses,
  scorePhaseResponses
};
