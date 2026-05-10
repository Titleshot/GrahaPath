const { weightedEvidence, confidenceFromWeights } = require('./evidenceWeighting');
const { effectiveHouseForSection } = require('./housePolicyMatrix');

function byPlanet(grahaProfiles, name) {
  return (grahaProfiles || []).find((g) => g.planet === name) || null;
}

function getHouse(houseLords, number) {
  return (houseLords?.houses || []).find((h) => h.house === number) || null;
}

const HOUSE_STYLES = {
  1: 'identity-led',
  2: 'value-and-resource',
  3: 'effort-and-skill',
  4: 'inner-foundation',
  5: 'creative-intelligence',
  6: 'discipline-and-friction',
  7: 'partnership-facing',
  8: 'transformational',
  9: 'belief-and-guidance',
  10: 'public-responsibility',
  11: 'network-and-gains',
  12: 'closure-and-retreat'
};

function hs(house) {
  return HOUSE_STYLES[house] || 'mixed';
}

function section(title, observation, cause, timing, action, signals) {
  const evidence = weightedEvidence(signals, 4);
  return {
    title,
    observation,
    cause,
    timing,
    action,
    evidence,
    confidence: confidenceFromWeights(signals)
  };
}

function findDrishti(drishtiLinks, from, to) {
  return (drishtiLinks || []).find((d) => d.from === from && d.to === to) || null;
}

function buildFutureSections(
  grahaProfiles,
  strength,
  houseLords,
  interactions,
  dasha,
  patterns,
  drishtiLinks = [],
  divisional = {},
  transitWindows = {},
  ashtakavarga = {}
) {
  const moon = byPlanet(grahaProfiles, 'Moon');
  const saturn = byPlanet(grahaProfiles, 'Saturn');
  const venus = byPlanet(grahaProfiles, 'Venus');
  const jupiter = byPlanet(grahaProfiles, 'Jupiter');
  const rahu = byPlanet(grahaProfiles, 'Rahu');
  const ketu = byPlanet(grahaProfiles, 'Ketu');
  const tenth = getHouse(houseLords, 10);
  const second = getHouse(houseLords, 2);
  const seventh = getHouse(houseLords, 7);
  const sixth = getHouse(houseLords, 6);
  const currentDasha = dasha?.currentDasha?.planet || 'current cycle';
  const currentAntar = dasha?.currentAntardasha?.antarLord;
  const timing = currentAntar ? `${currentDasha} / ${currentAntar}` : currentDasha;
  const luckOpportunity = ashtakavarga?.luckOpportunity;

  const moonSaturn = (interactions?.interactionPatterns || []).find((p) =>
    p.type.toLowerCase().includes('moon-saturn')
  );
  const rahuAxis = (interactions?.interactionPatterns || []).find((p) =>
    p.type.toLowerCase().includes('rahu-ketu axis')
  );
  const saturnCareer = (interactions?.interactionPatterns || []).find((p) =>
    p.type.toLowerCase().includes('saturn-10th')
  );

  const futureLifeDirection = section(
    'Future Life Direction',
    `Direction tends to improve when ${rahu ? hs(effectiveHouseForSection(rahu, 'timing')) : 'ambition'} momentum is coordinated with ${ketu ? hs(effectiveHouseForSection(ketu, 'timing')) : 'release'} priorities, instead of alternating between them.`,
    `Primary cause: ${
      rahu ? `Rahu in ${rahu.sign} (house ${effectiveHouseForSection(rahu, 'timing')})` : 'Rahu signal'
    } with ${ketu ? `Ketu in ${ketu.sign} (house ${effectiveHouseForSection(ketu, 'timing')})` : 'Ketu signal'}; ${
      saturn ? `Saturn in house ${effectiveHouseForSection(saturn, 'timing')}` : 'Saturn maturity signal'
    }.`,
    `Timing anchor: ${timing}.`,
    'Choose one 6-12 month direction and one weekly execution metric; avoid frequent strategic resets.',
    [
      rahu ? { label: `Rahu house ${rahu.house}`, weight: 1.6 } : null,
      ketu ? { label: `Ketu house ${ketu.house}`, weight: 1.6 } : null,
      saturn ? { label: `Saturn house ${saturn.house}`, weight: 1.2 } : null,
      rahuAxis ? { label: rahuAxis.type, weight: 2.1 } : null,
      findDrishti(drishtiLinks, 'Rahu', 'Ketu') ? { label: 'Drishti tie: Rahu influences Ketu axis', weight: 1.3 } : null,
      ...(transitWindows?.windows || [])
        .filter((w) => w.area === 'change_and_reorientation')
        .map((w) => ({ label: w.observation, weight: w.strength === 'high' ? 1.6 : 1.1 })),
      luckOpportunity
        ? {
            label: `Luck/Opportunity (${luckOpportunity.level}) avg ${luckOpportunity.averageScore}`,
            weight: luckOpportunity.level === 'high' ? 1.5 : luckOpportunity.level === 'moderate' ? 1.1 : 0.8
          }
        : null
    ]
  );

  const earningsCareerPotential = section(
    'Earnings & Career Potential',
    `Career outcomes are likely to strengthen through a ${tenth?.lordPlacement?.sign || 'structured'} style of specialization, with earnings shaped by ${
      second ? hs(effectiveHouseForSection(second.lordPlacement, 'career')) : 'resource'
    } patterns.`,
    `Primary cause: 10th house lord ${tenth?.lord || 'unknown'} in ${tenth?.lordPlacement?.sign || 'unknown sign'} (house ${tenth?.lordPlacement?.house ?? 'unknown'}) plus ${
      second ? `2nd house lord ${second.lord} in house ${second.lordPlacement?.house}` : 'resource-house signal'
    }.`,
    `Timing anchor: ${timing}; monitor milestones during current dasha themes.`,
    'Prioritize one core skill stack and one revenue channel; track compounding output monthly.',
    [
      tenth ? { label: `10th lord ${tenth.lord} -> house ${tenth.lordPlacement?.house}`, weight: 2.2 } : null,
      second ? { label: `2nd lord ${second.lord} -> house ${second.lordPlacement?.house}`, weight: 1.9 } : null,
      saturnCareer ? { label: saturnCareer.type, weight: 2.1 } : null,
      patterns?.careerPattern?.summary ? { label: patterns.careerPattern.summary, weight: 1 } : null,
      findDrishti(drishtiLinks, 'Saturn', tenth?.lord || '') ? { label: `Drishti tie: Saturn -> ${tenth.lord}`, weight: 1.4 } : null,
      ...(divisional?.d10CareerConfirmations || []).map((v) => ({ label: v, weight: 1.4 })),
      ...(transitWindows?.windows || [])
        .filter((w) => w.area === 'discipline_and_pressure' || w.area === 'growth_and_support')
        .map((w) => ({ label: w.observation, weight: w.strength === 'high' ? 1.5 : 1.1 })),
      luckOpportunity
        ? {
            label: `Ashtakavarga opportunity: ${luckOpportunity.level} (${luckOpportunity.averageScore})`,
            weight: luckOpportunity.level === 'high' ? 1.6 : luckOpportunity.level === 'moderate' ? 1.2 : 0.8
          }
        : null
    ]
  );

  const relationshipEmotionalPattern = section(
    'Relationship & Emotional Pattern',
    `Relationships often improve when your ${moon ? moon.sign : 'emotional'} processing rhythm is matched with communication pace, especially in ${
      seventh ? hs(effectiveHouseForSection(seventh.lordPlacement, 'relationship')) : 'partnership'
    } contexts.`,
    `Primary cause: ${moon ? `Moon in ${moon.sign} (house ${moon.house})` : 'Moon signal'} with ${
      seventh ? `7th lord ${seventh.lord} in house ${seventh.lordPlacement?.house}` : '7th-house signal'
    } and ${venus ? `Venus in ${venus.sign} (house ${venus.house})` : 'Venus signal'}.`,
    `Timing anchor: ${timing}; emotional themes can intensify during Moon/Venus-linked periods.`,
    'Use explicit check-ins: what was felt, what was meant, what is needed next.',
    [
      moon ? { label: `Moon house ${moon.house}`, weight: 1.8 } : null,
      seventh ? { label: `7th lord ${seventh.lord} -> house ${seventh.lordPlacement?.house}`, weight: 1.7 } : null,
      venus ? { label: `Venus house ${venus.house}`, weight: 1.5 } : null,
      moonSaturn ? { label: moonSaturn.type, weight: 2 } : null,
      findDrishti(drishtiLinks, 'Saturn', 'Moon') ? { label: 'Drishti tie: Saturn -> Moon', weight: 1.4 } : null,
      ...(divisional?.d9RelationshipConfirmations || []).map((v) => ({ label: v, weight: 1.4 }))
    ]
  );

  const healthEnergyTendencies = section(
    'Health & Energy Tendencies',
    `Energy stability appears linked to ${
      sixth ? hs(effectiveHouseForSection(sixth.lordPlacement, 'health')) : 'discipline'
    } routines, with load management becoming more important when ${
      saturn ? hs(effectiveHouseForSection(saturn, 'health')) : 'pressure'
    } themes rise.`,
    `Primary cause: ${sixth ? `6th lord ${sixth.lord} in house ${sixth.lordPlacement?.house}` : '6th-house signal'} with ${
      moon ? `Moon in house ${moon.house}` : 'Moon rhythm signal'
    } and ${saturn ? `Saturn pressure in house ${saturn.house}` : 'Saturn pressure signal'}.`,
    `Timing anchor: ${timing}; monitor energy rhythm shifts during current dasha period.`,
    'Anchor a fixed sleep window and workload pacing; treat fluctuations as regulation signals, not identity.',
    [
      sixth ? { label: `6th lord ${sixth.lord} -> house ${sixth.lordPlacement?.house}`, weight: 2 } : null,
      moon ? { label: `Moon house ${moon.house}`, weight: 1.7 } : null,
      saturn ? { label: `Saturn house ${saturn.house}`, weight: 1.6 } : null,
      patterns?.healthEnergyPattern?.summary ? { label: patterns.healthEnergyPattern.summary, weight: 1 } : null
    ]
  );

  const personalizedRemedies = section(
    'Personalized Remedies',
    `Remedies work best when linked to your specific dominant-friction mix (${(strength?.dominantPlanets || [])
      .slice(0, 2)
      .map((d) => d.planet)
      .join(', ') || 'chart drivers'}) rather than generic ritual lists.`,
    `Primary cause: dominant influences ${
      (strength?.dominantPlanets || []).map((d) => d.planet).join(', ') || 'not available'
    }; friction influences ${(strength?.challengedPlanets || []).map((c) => c.planet).join(', ') || 'not available'}.`,
    `Timing anchor: ${timing}; prioritize remedies aligned with current dasha lord(s).`,
    'Run one mantra/behavior/action protocol for 21 days per top friction planet, then reassess response.',
    [
      ...(strength?.dominantPlanets || [])
        .slice(0, 3)
        .map((d) => ({ label: `${d.planet} score ${d.totalScore}`, weight: 1.5 })),
      ...(strength?.challengedPlanets || [])
        .slice(0, 2)
        .map((c) => ({ label: `${c.planet} score ${c.totalScore}`, weight: 1.8 })),
      jupiter ? { label: `Jupiter house ${jupiter.house}`, weight: 1.2 } : null
    ]
  );

  return {
    futureLifeDirection,
    earningsCareerPotential,
    relationshipEmotionalPattern,
    healthEnergyTendencies,
    personalizedRemedies
  };
}

module.exports = {
  buildFutureSections
};

