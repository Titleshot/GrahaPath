const GEMSTONE_DB = {
  Sun: {
    stone: 'Ruby (Manik)',
    alternatives: ['Red garnet', 'Sun mantra + sunrise discipline'],
    wear: {
      metal: 'Gold or copper',
      finger: 'Ring finger',
      day: 'Sunday',
      timing: 'Morning (after sunrise)'
    },
    contraindications: ['Avoid if Sun is severely malefic in your custom tradition review.'],
    budgetTiers: {
      low: 'Red garnet + mantra + routine protocol',
      medium: 'Natural ruby (smaller size) with proper consultation',
      premium: 'Higher-clarity ruby only after expert review'
    }
  },
  Moon: {
    stone: 'Pearl (Moti)',
    alternatives: ['Moonstone', 'Som mantra + sleep/emotion regulation'],
    wear: {
      metal: 'Silver',
      finger: 'Little finger',
      day: 'Monday',
      timing: 'Evening or moonrise tradition window'
    },
    contraindications: ['Use caution if Moon is functionally malefic in your chart system.'],
    budgetTiers: {
      low: 'Moonstone + emotional hygiene routine',
      medium: 'Cultured pearl with ritualized wearing',
      premium: 'High-quality natural pearl after expert validation'
    }
  },
  Mars: {
    stone: 'Red Coral (Moonga)',
    alternatives: ['Carnelian', 'Hanuman practice + anger discipline'],
    wear: {
      metal: 'Copper or gold',
      finger: 'Ring finger',
      day: 'Tuesday',
      timing: 'Morning'
    },
    contraindications: ['Avoid when Mars already over-heats conflict patterns.'],
    budgetTiers: {
      low: 'Carnelian + physical training routine',
      medium: 'Italian/Japanese coral (modest size)',
      premium: 'Top-grade coral only with strong suitability'
    }
  },
  Mercury: {
    stone: 'Emerald (Panna)',
    alternatives: ['Peridot', 'Budh mantra + communication discipline'],
    wear: {
      metal: 'Gold or silver',
      finger: 'Little finger',
      day: 'Wednesday',
      timing: 'Morning'
    },
    contraindications: ['Avoid if Mercury is strongly afflicted by incompatible factors.'],
    budgetTiers: {
      low: 'Peridot + structured writing/speaking habit',
      medium: 'Natural emerald (smaller clean piece)',
      premium: 'Higher-grade emerald after proper matching'
    }
  },
  Jupiter: {
    stone: 'Yellow Sapphire (Pukhraj)',
    alternatives: ['Yellow topaz', 'Guru mantra + ethics-study routine'],
    wear: {
      metal: 'Gold',
      finger: 'Index finger',
      day: 'Thursday',
      timing: 'Morning'
    },
    contraindications: ['Avoid blind use when Jupiter is a chart stressor in your lineage method.'],
    budgetTiers: {
      low: 'Yellow topaz + study/mentor discipline',
      medium: 'Natural yellow sapphire (modest weight)',
      premium: 'Certified yellow sapphire with expert supervision'
    }
  },
  Venus: {
    stone: 'Diamond (Heera)',
    alternatives: ['White sapphire', 'Shukra mantra + value/relationship hygiene'],
    wear: {
      metal: 'Platinum, silver, or white gold',
      finger: 'Ring finger',
      day: 'Friday',
      timing: 'Morning'
    },
    contraindications: ['Avoid when Venus indulgence/addiction themes are already excessive.'],
    budgetTiers: {
      low: 'White zircon + disciplined luxury spending',
      medium: 'White sapphire',
      premium: 'Diamond only after strong suitability confirmation'
    }
  },
  Saturn: {
    stone: 'Blue Sapphire (Neelam)',
    alternatives: ['Amethyst', 'Shani discipline + service protocol'],
    wear: {
      metal: 'Steel or silver',
      finger: 'Middle finger',
      day: 'Saturday',
      timing: 'Evening or Saturn hora tradition'
    },
    contraindications: ['Do not wear abruptly; trial and expert review are strongly advised.'],
    budgetTiers: {
      low: 'Amethyst + strict routine/service remedies',
      medium: 'Blue sapphire trial stone approach',
      premium: 'Certified blue sapphire only after compatibility check'
    }
  },
  Rahu: {
    stone: 'Hessonite (Gomed)',
    alternatives: ['Smoky quartz', 'Rahu detox protocol + clarity discipline'],
    wear: {
      metal: 'Silver',
      finger: 'Middle finger',
      day: 'Saturday',
      timing: 'Evening'
    },
    contraindications: ['Avoid when confusion/impulsivity spikes after wearing tests.'],
    budgetTiers: {
      low: 'Smoky quartz + digital detox',
      medium: 'Natural hessonite (small calibrated)',
      premium: 'High-grade hessonite after careful evaluation'
    }
  },
  Ketu: {
    stone: "Cat's Eye (Lehsunia)",
    alternatives: ['Tiger eye', 'Ketu grounding + meditation discipline'],
    wear: {
      metal: 'Silver',
      finger: 'Middle finger or little finger (tradition-dependent)',
      day: 'Tuesday or Thursday (tradition-dependent)',
      timing: 'Morning'
    },
    contraindications: ['Use only after compatibility checks due to strong effects.'],
    budgetTiers: {
      low: 'Tiger eye + grounding routine',
      medium: "Cat's eye trial approach",
      premium: "High-grade cat's eye with strict supervision"
    }
  }
};

function isGemstoneQuery(userMessage) {
  const t = String(userMessage || '').toLowerCase();
  return /gem|stone|ratna|रत्न|जेमस्टोन|पुखराज|नीलम|माणिक|मोती|gomed|lehsunia|panna|ruby|sapphire|diamond/.test(t);
}

function asksForAllGemstoneOptions(userMessage) {
  const t = String(userMessage || '').toLowerCase();
  return (
    /all options|show all|all stones|all gemstones|every option|all recommendations/.test(t) ||
    /सबै विकल्प|सबै option|सबै रत्न|सबै gemstone/.test(t)
  );
}

function prioritizedPlanetsFromChart(chart) {
  const byMapping = Array.isArray(chart?.remedyMapping?.prioritizedPlanets)
    ? chart.remedyMapping.prioritizedPlanets
    : [];
  const byDominant = Array.isArray(chart?.astroBrain?.dominantPlanets)
    ? chart.astroBrain.dominantPlanets
        .map((x) => (typeof x === 'string' ? x : x?.planet || x?.name || null))
        .filter(Boolean)
    : [];
  return [...new Set([...byMapping, ...byDominant])].slice(0, 3);
}

function currentDashaPlanets(chart) {
  const md = chart?.astroBrain?.currentDasha?.planet || chart?.astroBrain?.summary?.currentMahadashaPlanet || null;
  const ad =
    chart?.astroBrain?.currentAntardasha?.antarLord || chart?.astroBrain?.summary?.currentAntardashaLord || null;
  return [md, ad].filter(Boolean);
}

function challengedPlanetSet(chart) {
  const rows = Array.isArray(chart?.astroBrain?.challengedPlanets) ? chart.astroBrain.challengedPlanets : [];
  const names = rows
    .map((x) => (typeof x === 'string' ? x : x?.planet || x?.name || x?.graha || null))
    .filter(Boolean);
  return new Set(names);
}

function contraindicationRisk(rec) {
  const text = (rec?.contraindications || []).join(' ').toLowerCase();
  if (text.includes('only after compatibility') || text.includes('do not wear abruptly')) return 2;
  if (text.includes('avoid')) return 1;
  return 0;
}

function toSuitabilityLabel(score) {
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

function scoreGemstoneSuitability({ chart, planet, rec, prioritizedPlanets }) {
  let score = 0;
  const reasons = [];
  const dasha = new Set(currentDashaPlanets(chart));
  const challenged = challengedPlanetSet(chart);

  if (prioritizedPlanets.includes(planet)) {
    score += 2;
    reasons.push('Planet appears in prioritized weakness/importance set.');
  }
  if (dasha.has(planet)) {
    score += 2;
    reasons.push('Planet aligns with active dasha window.');
  }
  if (challenged.has(planet)) {
    score += 1;
    reasons.push('Planet appears in challenged-planet indicators.');
  }

  const risk = contraindicationRisk(rec);
  if (risk > 0) {
    score -= risk;
    reasons.push('Contraindication caution lowers confidence.');
  }

  const finalScore = Math.max(0, Math.min(5, score));
  return {
    score: finalScore,
    level: toSuitabilityLabel(finalScore),
    reasons
  };
}

function buildGemstoneContext(chart, userMessage) {
  if (!isGemstoneQuery(userMessage)) return null;
  const includeLowSuitability = asksForAllGemstoneOptions(userMessage);
  const prioritizedPlanets = prioritizedPlanetsFromChart(chart);
  const scored = prioritizedPlanets
    .map((planet) => {
      const rec = GEMSTONE_DB[planet];
      if (!rec) return null;
      const suitability = scoreGemstoneSuitability({ chart, planet, rec, prioritizedPlanets });
      return {
        planet,
        suitability,
        ...rec
      };
    })
    .filter(Boolean);
  const rows = includeLowSuitability
    ? scored
    : scored.filter((row) => row?.suitability?.level === 'high' || row?.suitability?.level === 'medium');
  const suppressedLow = includeLowSuitability ? 0 : Math.max(0, scored.length - rows.length);

  return {
    requested: true,
    includeLowSuitability,
    prioritizedPlanets,
    recommendations: rows,
    suppressedLowSuitabilityCount: suppressedLow,
    disclaimer:
      'Gemstones are optional and secondary. Start with behavior/mantra/ritual. Use expert review before expensive purchases.'
  };
}

module.exports = {
  GEMSTONE_DB,
  isGemstoneQuery,
  buildGemstoneContext
};

