const { weightedEvidence, confidenceFromWeights } = require('./evidenceWeighting');

function byPlanet(grahaProfiles, name) {
  return (grahaProfiles || []).find((g) => g.planet === name) || null;
}

function variantIndex(seedText) {
  const seed = String(seedText || '')
    .split('')
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return seed % 3;
}

function pick(array, i) {
  return array[i % array.length];
}

const SIGN_BEHAVIOR = {
  Aries: 'quick reaction and immediate action',
  Taurus: 'steady response and resistance to sudden change',
  Gemini: 'mental branching and frequent reframing',
  Cancer: 'protective response and emotional memory',
  Leo: 'self-expression and pride-sensitive decisions',
  Virgo: 'detail-checking and correction mode',
  Libra: 'balance-seeking and relational calibration',
  Scorpio: 'deep processing and trust sensitivity',
  Sagittarius: 'meaning-seeking and future framing',
  Capricorn: 'duty-first response and delayed gratification',
  Aquarius: 'detached analysis and unconventional framing',
  Pisces: 'empathic absorption and fluid boundaries'
};

function safeHouse(h) {
  return Number.isFinite(h) ? `house ${h}` : 'an uncertain house context';
}

function interactionHint(interactionPatterns, key) {
  return (interactionPatterns || []).find((p) => p.type.toLowerCase().includes(key.toLowerCase())) || null;
}

function findDrishti(drishtiLinks, from, to) {
  return (drishtiLinks || []).find((d) => d.from === from && d.to === to) || null;
}

function buildCausalInsights(chartPayload, strength, houseLords, dasha, interactionPatterns, drishtiLinks = []) {
  const grahaProfiles = chartPayload?.astroBrainDebug?.grahaProfiles || chartPayload?.grahaProfiles || [];
  const moon = byPlanet(grahaProfiles, 'Moon');
  const saturn = byPlanet(grahaProfiles, 'Saturn');
  const rahu = byPlanet(grahaProfiles, 'Rahu');
  const ketu = byPlanet(grahaProfiles, 'Ketu');
  const lagnaLordName = houseLords?.houses?.find((h) => h.house === 1)?.lord;
  const lagnaLord = lagnaLordName ? byPlanet(grahaProfiles, lagnaLordName) : null;
  const tenthLordRow = houseLords?.houses?.find((h) => h.house === 10);
  const tenthLord = tenthLordRow?.lord ? byPlanet(grahaProfiles, tenthLordRow.lord) : null;
  const dominant = (strength?.dominantPlanets || []).slice(0, 3);
  const challenged = (strength?.challengedPlanets || []).slice(0, 2);
  const currentDasha = dasha?.currentDasha?.planet || dasha?.startingDasha?.planet;
  const currentAntardasha = dasha?.currentAntardasha?.antarLord || null;

  const v = variantIndex(
    `${chartPayload?.ascendant || ''}-${chartPayload?.moonSign || ''}-${chartPayload?.sunSign || ''}-${currentDasha || ''}`
  );

  const intros = [
    'A repeating pattern in your chart is',
    'A clear behavioral signal in your chart is',
    'A strong life pattern showing up in your chart is'
  ];
  const causeLead = ['This happens because', 'This pattern is driven by', 'This can be traced to'];
  const effectLead = ['In real life, this often shows as', 'You are likely to notice this as', 'Practically, this tends to appear as'];

  const moonSaturn = interactionHint(interactionPatterns, 'Moon-Saturn');
  const moonRahu = interactionHint(interactionPatterns, 'Moon-Rahu');
  const rahuKetuAxis = interactionHint(interactionPatterns, 'Rahu-Ketu axis');
  const saturnCareer = interactionHint(interactionPatterns, 'Saturn-10th');
  const moonSaturnDrishti = findDrishti(drishtiLinks, 'Saturn', 'Moon') || findDrishti(drishtiLinks, 'Moon', 'Saturn');
  const moonRahuDrishti = findDrishti(drishtiLinks, 'Rahu', 'Moon') || findDrishti(drishtiLinks, 'Moon', 'Rahu');

  const personality = {
    section: 'personality',
    observation: `${pick(intros, v)} internal processing that is deeper than what you show publicly.`,
    cause: lagnaLord
      ? `${pick(causeLead, v)} your Lagna lord ${lagnaLord.planet} in ${lagnaLord.sign} (${safeHouse(lagnaLord.house)}) shaping your default response style.`
      : `${pick(causeLead, v)} your ascendant dynamics and Moon pattern working together.`,
    effect: `${pick(effectLead, v)} appearing composed outside while still replaying decisions internally before closure, especially with a ${lagnaLord?.sign || 'chart'} style of ${SIGN_BEHAVIOR[lagnaLord?.sign] || 'mixed processing'}.`,
    interactionCause: moonSaturn
      ? `Interaction: ${moonSaturn.meaning}`
      : moon
        ? `Interaction: Moon in ${moon.sign} (${safeHouse(moon.house)}) adds internal emotional processing.`
        : null,
    confidence: 'moderate'
  };

  const emotionalSignals = [
    moon ? { label: `Moon in ${moon.sign} (${safeHouse(moon.house)})`, weight: 1.6 } : null,
    moonRahu ? { label: moonRahu.meaning, weight: 2.2 } : null,
    moonSaturn ? { label: moonSaturn.meaning, weight: 1.9 } : null,
    moonRahuDrishti ? { label: `Drishti tie: ${moonRahuDrishti.rule}`, weight: 1.8 } : null,
    moonSaturnDrishti ? { label: `Drishti tie: ${moonSaturnDrishti.rule}`, weight: 1.5 } : null
  ];

  const emotional = {
    section: 'emotional',
    observation: 'Your emotional pattern reacts quickly first, then processes for longer in the background.',
    cause: moon
      ? `${pick(causeLead, v + 1)} Moon in ${moon.sign} (${safeHouse(moon.house)}), which sets your emotional rhythm and recovery style.`
      : `${pick(causeLead, v + 1)} lunar dynamics in your chart.`,
    effect: `${pick(effectLead, v + 1)} overthinking after emotionally charged moments, with a ${moon?.sign || 'lunar'} style of ${SIGN_BEHAVIOR[moon?.sign] || 'internal processing'} that can feel intense before it settles.`,
    interactionCause: moonRahu
      ? `Interaction: ${moonRahu.meaning}`
      : moonSaturn
        ? `Interaction: ${moonSaturn.meaning}`
        : null,
    confidence: confidenceFromWeights(emotionalSignals),
    evidence: weightedEvidence(emotionalSignals, 3)
  };

  const careerSignals = [
    tenthLord ? { label: `10th-lord ${tenthLord.planet} in ${tenthLord.sign} (${safeHouse(tenthLord.house)})`, weight: 2 } : null,
    saturnCareer ? { label: saturnCareer.meaning, weight: 2.2 } : null,
    findDrishti(drishtiLinks, 'Saturn', tenthLord?.planet || '') ? { label: `Drishti tie: Saturn -> ${tenthLord.planet}`, weight: 1.5 } : null
  ];

  const career = {
    section: 'career',
    observation: 'Career growth is likely to reward consistency and pressure-handling more than quick recognition.',
    cause: tenthLord
      ? `${pick(causeLead, v + 2)} 10th-lord ${tenthLord.planet} placed in ${tenthLord.sign} (${safeHouse(
          tenthLord.house
        )}), defining how status and work outcomes mature.`
      : `${pick(causeLead, v + 2)} 10th-house and Saturn signals around responsibility.`,
    effect: `${pick(effectLead, v + 2)} delayed recognition despite effort, then sharper credibility once your ${tenthLord?.sign || 'career'} mode of ${
      SIGN_BEHAVIOR[tenthLord?.sign] || 'disciplined iteration'
    } is sustained.`,
    interactionCause: saturnCareer ? `Interaction: ${saturnCareer.meaning}` : null,
    confidence: confidenceFromWeights(careerSignals),
    evidence: weightedEvidence(careerSignals, 3)
  };

  const direction = {
    section: 'lifeDirection',
    observation: 'Your direction improves when ambition and detachment are balanced instead of polarized.',
    cause: rahu && ketu
      ? `${pick(causeLead, v)} Rahu in ${rahu.sign} (${safeHouse(rahu.house)}) pushing growth and Ketu in ${ketu.sign} (${safeHouse(
          ketu.house
        )}) pulling release.`
      : `${pick(causeLead, v)} nodal axis dynamics in your chart.`,
    effect: `${pick(effectLead, v)} switching between intense drive and sudden disengagement unless priorities are explicitly structured around the Rahu-${rahu?.house || '?'} / Ketu-${ketu?.house || '?'} axis.`,
    interactionCause: rahuKetuAxis ? `Interaction: ${rahuKetuAxis.meaning}` : null,
    confidence: rahuKetuAxis ? 'strong' : 'moderate'
  };

  const timing = {
    section: 'timingNow',
    observation: `Your current life tone is governed by ${currentDasha || 'the active dasha cycle'}${
      currentAntardasha ? ` with ${currentAntardasha} sub-period influence` : ''
    }.`,
    cause: `${pick(causeLead, v + 1)} Vimshottari timing: Mahadasha ${currentDasha || 'unknown'}${
      currentAntardasha ? ` + Antardasha ${currentAntardasha}` : ''
    }.`,
    effect: `${pick(effectLead, v + 1)} decisions clustering around the themes of these lords, making certain topics feel urgent now.`,
    interactionCause: null,
    confidence: currentDasha ? 'strong' : 'possible',
    evidence: weightedEvidence(
      [
        currentDasha ? { label: `Mahadasha ${currentDasha}`, weight: 2.2 } : null,
        currentAntardasha ? { label: `Antardasha ${currentAntardasha}`, weight: 1.8 } : null
      ],
      2
    )
  };

  return {
    insights: [personality, emotional, career, direction, timing],
    dominantDrivers: dominant,
    frictionDrivers: challenged
  };
}

module.exports = {
  buildCausalInsights
};

