const PLANET_MEANINGS = {
  Sun: {
    theme: 'identity, vitality, and authority',
    psychological: 'the need to express confidence, purpose, and personal direction',
    strengths: ['leadership', 'clarity', 'self-respect'],
    challenges: ['ego rigidity', 'pride', 'over-identification with status']
  },
  Moon: {
    theme: 'mind, emotions, and inner security',
    psychological: 'emotional patterning, memory, comfort needs, and instinctive reactions',
    strengths: ['empathy', 'adaptability', 'nurturing intelligence'],
    challenges: ['mood fluctuation', 'attachment', 'emotional dependency']
  },
  Mars: {
    theme: 'courage, action, and assertion',
    psychological: 'the drive to act, compete, protect boundaries, and pursue goals directly',
    strengths: ['initiative', 'bravery', 'physical drive'],
    challenges: ['impulsiveness', 'anger', 'conflict']
  },
  Mercury: {
    theme: 'communication, analysis, and learning',
    psychological: 'the mental style used for speech, commerce, reasoning, and adaptation',
    strengths: ['intelligence', 'skillfulness', 'curiosity'],
    challenges: ['overthinking', 'nervousness', 'inconsistency']
  },
  Jupiter: {
    theme: 'wisdom, growth, and guidance',
    psychological: 'the search for meaning, faith, ethics, teaching, and expansion',
    strengths: ['optimism', 'judgment', 'generosity'],
    challenges: ['excess', 'dogmatism', 'overconfidence']
  },
  Venus: {
    theme: 'love, harmony, and enjoyment',
    psychological: 'the capacity for affection, attraction, aesthetics, pleasure, and cooperation',
    strengths: ['charm', 'creativity', 'diplomacy'],
    challenges: ['indulgence', 'avoidance', 'attachment to comfort']
  },
  Saturn: {
    theme: 'discipline and effort',
    psychological: 'internal pressure to mature through responsibility, limits, and sustained work',
    strengths: ['resilience', 'persistence', 'self-control'],
    challenges: ['slow progress', 'fear', 'frustration']
  },
  Rahu: {
    theme: 'ambition, desire, and unconventional growth',
    psychological: 'a hunger for experience, recognition, novelty, and worldly expansion',
    strengths: ['innovation', 'strategy', 'breakthrough thinking'],
    challenges: ['obsession', 'confusion', 'restlessness']
  },
  Ketu: {
    theme: 'detachment, insight, and karmic release',
    psychological: 'a tendency to withdraw from ordinary validation and seek deeper truth',
    strengths: ['intuition', 'spiritual perception', 'non-attachment'],
    challenges: ['disconnection', 'doubt', 'avoidance']
  }
};

const HOUSE_MEANINGS = {
  1: 'self-expression, body, identity, and personal direction',
  2: 'speech, family, values, savings, and food habits',
  3: 'communication, courage, siblings, skills, and repeated effort',
  4: 'home, emotional foundations, mother, property, and inner peace',
  5: 'creativity, intelligence, children, romance, and past-life merit',
  6: 'service, illness, conflict, discipline, debts, and competition',
  7: 'partnership, marriage, contracts, and public interaction',
  8: 'transformation, secrets, vulnerability, inheritance, and longevity',
  9: 'dharma, fortune, teachers, belief, pilgrimage, and higher learning',
  10: 'career, responsibility, authority, public work, and reputation',
  11: 'income, networks, gains, ambitions, and community support',
  12: 'loss, sleep, foreign lands, solitude, liberation, and surrender'
};

const SIGN_MEANINGS = {
  Aries: 'direct, pioneering, assertive, and action-oriented',
  Taurus: 'steady, sensual, practical, and value-focused',
  Gemini: 'curious, communicative, flexible, and mentally active',
  Cancer: 'protective, emotional, nurturing, and security-seeking',
  Leo: 'expressive, proud, creative, and leadership-oriented',
  Virgo: 'analytical, precise, service-minded, and improvement-focused',
  Libra: 'balanced, relational, diplomatic, and harmony-seeking',
  Scorpio: 'intense, private, transformative, and psychologically deep',
  Sagittarius: 'philosophical, expansive, ethical, and truth-seeking',
  Capricorn: 'structured, disciplined, ambitious, and duty-oriented',
  Aquarius: 'innovative, social, detached, and systems-oriented',
  Pisces: 'sensitive, imaginative, spiritual, and compassionate'
};

// Specific combinations override or sharpen the general planet + house logic.
// This keeps the engine scalable: add new combinations here without changing
// interpretation assembly code.
const PLANET_HOUSE_COMBINATIONS = {
  Saturn: {
    3: {
      psychological: 'internal pressure in communication and effort-based skill development',
      strength: 'resilience and persistence through practice',
      challenge: 'slow progress, hesitation, or frustration while expressing ideas',
      reportLine:
        'You may feel that progress comes slowly, especially in areas where communication and effort are required.'
    },
    10: {
      psychological: 'a serious relationship with duty, public work, and long-term achievement',
      strength: 'capacity to build a durable professional reputation',
      challenge: 'career pressure, delayed recognition, or fear of failure',
      reportLine:
        'Your career path may demand patience, but consistent effort can create lasting authority.'
    }
  },
  Moon: {
    4: {
      psychological: 'strong emotional identification with home, family, and inner safety',
      strength: 'deep nurturing capacity and emotional sensitivity',
      challenge: 'mood changes tied to domestic or family conditions',
      reportLine:
        'Your emotional peace is strongly connected to home, family, and the quality of your private life.'
    }
  },
  Mars: {
    6: {
      psychological: 'a fighting spirit directed toward competition, service, and problem solving',
      strength: 'ability to defeat obstacles through courage and discipline',
      challenge: 'conflict, impatience, or inflammation under stress',
      reportLine:
        'You are driven to confront problems directly and can grow stronger through disciplined service.'
    }
  },
  Jupiter: {
    9: {
      psychological: 'faith, ethical reflection, and attraction toward teachers or higher wisdom',
      strength: 'good judgment and natural guidance from dharmic principles',
      challenge: 'overconfidence in beliefs or reliance on luck',
      reportLine:
        'Your growth is supported by learning, teachers, faith, and a sincere search for meaning.'
    }
  }
};

// Specific sign modifiers add dignity/style nuance to the planet's expression.
// Unknown combinations fall back to the general sign meaning.
const PLANET_SIGN_COMBINATIONS = {
  Saturn: {
    Aries: {
      psychological: 'discipline is tested by impatience and the need for immediate action',
      strength: 'courage to work through pressure',
      challenge: 'frustration when results require more time than expected'
    },
    Capricorn: {
      psychological: 'discipline expresses naturally through structure and responsibility',
      strength: 'strong endurance and practical authority',
      challenge: 'excessive seriousness or emotional reserve'
    }
  },
  Sun: {
    Leo: {
      psychological: 'identity expresses strongly through leadership and visibility',
      strength: 'confidence and creative authority',
      challenge: 'pride or dominance'
    },
    Libra: {
      psychological: 'identity is shaped through relationship, fairness, and social balance',
      strength: 'diplomatic leadership',
      challenge: 'difficulty asserting personal will'
    }
  },
  Moon: {
    Taurus: {
      psychological: 'the mind seeks stability, comfort, and reliable emotional rhythms',
      strength: 'emotional steadiness',
      challenge: 'attachment to familiar patterns'
    },
    Scorpio: {
      psychological: 'the mind experiences emotion with intensity and depth',
      strength: 'psychological insight',
      challenge: 'emotional turbulence or secrecy'
    }
  },
  Mars: {
    Aries: {
      psychological: 'action is direct, fast, and instinctive',
      strength: 'initiative and courage',
      challenge: 'impulsiveness'
    },
    Cancer: {
      psychological: 'assertion is filtered through emotion and protection needs',
      strength: 'protective courage',
      challenge: 'reactive anger or indirect conflict'
    }
  },
  Jupiter: {
    Sagittarius: {
      psychological: 'wisdom expresses through faith, teaching, and truth-seeking',
      strength: 'natural optimism and guidance',
      challenge: 'preaching or excess certainty'
    },
    Capricorn: {
      psychological: 'growth is practical, cautious, and tied to responsibility',
      strength: 'grounded judgment',
      challenge: 'restricted optimism'
    }
  },
  Venus: {
    Taurus: {
      psychological: 'affection expresses through loyalty, beauty, and sensory comfort',
      strength: 'stability in love and taste',
      challenge: 'possessiveness or indulgence'
    },
    Virgo: {
      psychological: 'love is refined through service, discernment, and practical care',
      strength: 'thoughtful devotion',
      challenge: 'criticism or difficulty relaxing into pleasure'
    }
  }
};

function firstValue(values, fallback) {
  return Array.isArray(values) && values.length > 0 ? values[0] : fallback;
}

function getCombination(combinationMap, planetName, key) {
  return combinationMap[planetName] ? combinationMap[planetName][key] : undefined;
}

function buildDefaultReportLine(planetName, house, sign, theme, challenge) {
  const houseMeaning = HOUSE_MEANINGS[house] || 'the life area activated by this house';
  const signMeaning = SIGN_MEANINGS[sign] || 'the style of this sign';

  return `${planetName} brings ${theme} into ${houseMeaning}, expressing through a ${signMeaning} style; the main growth edge is ${challenge}.`;
}

function interpretPlanet(planet) {
  if (!planet || typeof planet !== 'object') {
    throw new Error('Planet data is required for interpretation.');
  }

  const base = PLANET_MEANINGS[planet.name];

  if (!base) {
    throw new Error(`No interpretation mapping found for planet: ${planet.name}`);
  }

  const houseCombination = getCombination(PLANET_HOUSE_COMBINATIONS, planet.name, planet.house);
  const signCombination = getCombination(PLANET_SIGN_COMBINATIONS, planet.name, planet.sign);
  const strength = houseCombination?.strength || signCombination?.strength || firstValue(base.strengths, '');
  const challenge = houseCombination?.challenge || signCombination?.challenge || firstValue(base.challenges, '');
  const psychological =
    houseCombination?.psychological ||
    signCombination?.psychological ||
    `${base.psychological} in matters of ${HOUSE_MEANINGS[planet.house] || 'this house'}`;

  return {
    planet: planet.name,
    house: planet.house,
    sign: planet.sign,
    theme: base.theme,
    psychological,
    strength,
    challenge,
    reportLine:
      houseCombination?.reportLine ||
      buildDefaultReportLine(planet.name, planet.house, planet.sign, base.theme, challenge),
    details: {
      baseMeaning: base,
      houseMeaning: HOUSE_MEANINGS[planet.house] || null,
      signMeaning: SIGN_MEANINGS[planet.sign] || null,
      houseCombination: houseCombination || null,
      signCombination: signCombination || null
    }
  };
}

function interpretChart(chart) {
  if (!chart || !Array.isArray(chart.planets)) {
    throw new Error('Chart with planets array is required for interpretation.');
  }

  return chart.planets.map((planet) => interpretPlanet(planet));
}

function interpretChartPlanets(planets) {
  if (!Array.isArray(planets)) {
    throw new Error('Planets array is required for interpretation.');
  }

  return planets.map((planet) => interpretPlanet(planet));
}

module.exports = {
  HOUSE_MEANINGS,
  PLANET_HOUSE_COMBINATIONS,
  PLANET_MEANINGS,
  PLANET_SIGN_COMBINATIONS,
  SIGN_MEANINGS,
  interpretChart,
  interpretChartPlanets,
  interpretPlanet
};
