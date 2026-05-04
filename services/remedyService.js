const REMEDY_LIBRARY = {
  Saturn: {
    problem:
      'Your chart shows Saturn influence around discipline, patience, responsibility, and long-term growth.',
    logic:
      'Saturn represents structure, responsibility, and delayed rewards. When imbalanced, it can create pressure, self-doubt, and slow progress. Alignment with Saturn does not remove challenges; it helps transform pressure into stability and long-term success.',
    mantra: 'Om Sham Shanicharaya Namah',
    behavior: [
      'Maintain a consistent daily routine',
      'Complete tasks even when motivation is low',
      'Avoid procrastination patterns'
    ],
    action: [
      'Fix one daily habit such as sleep, work, or focus',
      'Track consistency for 21 days'
    ]
  },
  Moon: {
    problem: 'Your chart shows emotional fluctuation, sensitivity, or overthinking patterns.',
    logic:
      'Moon governs emotions and mental stability. When unstable, it can create mood shifts and internal confusion. Moon alignment helps create emotional steadiness without suppressing sensitivity.',
    mantra: 'Om Som Somaya Namah',
    behavior: [
      'Reduce overthinking loops',
      'Use journaling or quiet reflection',
      'Protect your emotional environment'
    ],
    action: [
      'Spend time near water or in a calm environment',
      'Reduce emotional overload before sleep'
    ]
  },
  Sun: {
    problem: 'Your chart shows identity, confidence, authority, or self-direction themes.',
    logic:
      'Sun represents vitality, confidence, and personal direction. When imbalanced, it can create pride, self-doubt, or pressure to prove yourself. Sun alignment helps strengthen clarity without forcing dominance.',
    mantra: 'Om Suryaya Namah',
    behavior: [
      'Practice clear self-expression',
      'Take responsibility without seeking constant approval',
      'Avoid ego-based comparison'
    ],
    action: [
      'Start the day with sunlight or a grounding morning routine',
      'Set one clear intention every morning'
    ]
  },
  Mars: {
    problem: 'Your chart shows action, anger, courage, or conflict-management themes.',
    logic:
      'Mars represents drive, courage, and decisive action. When imbalanced, it can create impatience, conflict, or reactive decisions. Mars alignment helps turn raw force into disciplined action.',
    mantra: 'Om Angarakaya Namah',
    behavior: [
      'Pause before reacting',
      'Channel anger into physical movement or focused work',
      'Choose direct but respectful communication'
    ],
    action: [
      'Use exercise or walking to release excess heat',
      'Complete one difficult task before distraction'
    ]
  },
  Mercury: {
    problem: 'Your chart shows communication, analysis, learning, or overthinking themes.',
    logic:
      'Mercury represents intelligence, speech, trade, and adaptability. When imbalanced, it can create nervousness, scattered thinking, or over-analysis. Mercury alignment helps sharpen thought into useful communication.',
    mantra: 'Om Budhaya Namah',
    behavior: [
      'Speak with precision',
      'Avoid over-explaining when clarity is enough',
      'Write ideas before acting on them'
    ],
    action: [
      'Keep a short daily learning or writing habit',
      'Reduce unnecessary information overload'
    ]
  },
  Jupiter: {
    problem: 'Your chart shows belief, growth, wisdom, teaching, or direction themes.',
    logic:
      'Jupiter represents wisdom, faith, ethics, and expansion. When imbalanced, it can create overconfidence or confusion around belief. Jupiter alignment helps growth become guided by judgment and humility.',
    mantra: 'Om Gurave Namah',
    behavior: [
      'Seek wisdom before making major decisions',
      'Balance optimism with practical judgment',
      'Learn from mentors or trusted guidance'
    ],
    action: [
      'Study or reflect on one meaningful principle daily',
      'Practice generosity without overextending yourself'
    ]
  },
  Venus: {
    problem: 'Your chart shows love, harmony, attachment, pleasure, or relationship themes.',
    logic:
      'Venus represents affection, beauty, pleasure, and connection. When imbalanced, it can create attachment, indulgence, or avoidance of discomfort. Venus alignment helps love and enjoyment become balanced rather than consuming.',
    mantra: 'Om Shukraya Namah',
    behavior: [
      'Practice balanced affection',
      'Avoid comfort-based avoidance',
      'Choose harmony without losing honesty'
    ],
    action: [
      'Create one beautiful, calming space in your routine',
      'Notice where pleasure becomes distraction'
    ]
  },
  Rahu: {
    problem: 'Your chart shows ambition, desire, restlessness, or unconventional growth themes.',
    logic:
      'Rahu represents hunger, ambition, innovation, and worldly expansion. When imbalanced, it can create obsession or confusion. Rahu alignment helps desire become strategy rather than compulsion.',
    mantra: 'Om Rahave Namah',
    behavior: [
      'Question obsessive urges before acting',
      'Turn ambition into a clear plan',
      'Avoid comparing your path with others'
    ],
    action: [
      'Limit one distracting habit for 21 days',
      'Convert one big desire into a practical next step'
    ]
  },
  Ketu: {
    problem: 'Your chart shows detachment, uncertainty, spiritual sensitivity, or withdrawal themes.',
    logic:
      'Ketu represents detachment, insight, and release. When imbalanced, it can create disconnection or doubt. Ketu alignment helps turn withdrawal into wisdom and quiet perception.',
    mantra: 'Om Ketave Namah',
    behavior: [
      'Avoid disappearing from responsibilities',
      'Use solitude intentionally',
      'Trust insight without rejecting practical life'
    ],
    action: [
      'Keep a short meditation or breath practice',
      'Complete one grounding task after reflection'
    ]
  }
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function scorePlanet(planet) {
  const interpretation = planet.interpretation || {};
  let score = 0;

  if ([1, 4, 7, 10].includes(planet.house)) {
    score += 3;
  }

  if (['Saturn', 'Moon', 'Rahu', 'Ketu'].includes(planet.name)) {
    score += 2;
  }

  if (interpretation.challenge) {
    score += 1;
  }

  return score;
}

function generateRemedies(chart, limit = 3) {
  const planets = [...(chart.planets || [])].sort((a, b) => scorePlanet(b) - scorePlanet(a));

  return planets
    .map((planet) => {
      const remedy = REMEDY_LIBRARY[planet.name];

      if (!remedy) {
        return null;
      }

      return {
        planet: planet.name,
        sign: planet.sign,
        house: planet.house,
        problem: remedy.problem,
        logic: remedy.logic,
        remedy: {
          mantra: remedy.mantra,
          repetition: '11 times daily',
          behaviorAlignment: remedy.behavior,
          practicalAction: remedy.action
        },
        note: 'This helps align your energy; it is not a promise to remove every challenge.'
      };
    })
    .filter(Boolean)
    .filter((remedy, index, remedies) => remedies.findIndex((item) => item.planet === remedy.planet) === index)
    .slice(0, limit);
}

module.exports = {
  REMEDY_LIBRARY,
  generateRemedies
};
