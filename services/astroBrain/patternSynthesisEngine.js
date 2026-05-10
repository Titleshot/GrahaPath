const { EXALTATION, DEBILITATION, OWN_SIGNS } = require('./constants');

function d1StructuralGrade(dignity) {
  if (dignity === 'exalted' || dignity === 'own') return 1;
  if (dignity === 'debilitated') return -1;
  if (dignity === 'friendly') return 0.5;
  if (dignity === 'enemy') return -0.5;
  return 0;
}

function d9StructuralGrade(planet, d9Sign) {
  if (!planet || !d9Sign) return 0;
  if (EXALTATION[planet] === d9Sign) return 1;
  if (DEBILITATION[planet] === d9Sign) return -1;
  const own = OWN_SIGNS[planet];
  if (Array.isArray(own) && own.includes(d9Sign)) return 1;
  return 0;
}

function topPlanets(strength, n = 3) {
  return [...(strength.scores || [])].sort((a, b) => b.totalScore - a.totalScore).slice(0, n);
}

function evidenceFromPlanets(planets, label) {
  return planets.map((p) => `${p.planet} (${label}, score ${p.totalScore})`);
}

const REASON_LEADS = [
  'This pattern is influenced by',
  'This pattern comes from',
  'This reflects',
  'This can be traced to'
];

function softReasonLine(idx, detail) {
  if (!detail) {
    return '';
  }
  return `\nReason: ${REASON_LEADS[idx % REASON_LEADS.length]} ${detail}.`;
}

function synthesizePatterns(
  grahaProfiles,
  strength,
  houseLordData,
  yogas,
  dasha,
  charaKarakas = {},
  planetState = {},
  argala = {},
  divisional = {},
  transitWindows = {}
) {
  const top = topPlanets(strength, 4);
  const topNames = top.map((p) => p.planet).join(', ');
  const moon = grahaProfiles.find((g) => g.planet === 'Moon');
  const sat = grahaProfiles.find((g) => g.planet === 'Saturn');
  const jup = grahaProfiles.find((g) => g.planet === 'Jupiter');
  const ven = grahaProfiles.find((g) => g.planet === 'Venus');

  const tenth = houseLordData.houses?.find((h) => h.house === 10);
  const second = houseLordData.houses?.find((h) => h.house === 2);
  const seventh = houseLordData.houses?.find((h) => h.house === 7);
  const sixth = houseLordData.houses?.find((h) => h.house === 6);
  const twelfth = houseLordData.houses?.find((h) => h.house === 12);

  const yogaNames = (yogas.yogas || []).map((y) => y.name).slice(0, 4);
  const dashaHint = dasha.currentDasha?.planet || dasha.startingDasha?.planet;

  const coreLifePattern = {
    summary: `The chart may emphasize a small set of repeating tones — strongest signals first — rather than listing every placement.${softReasonLine(
      0,
      top[0] ? `${top[0].planet} and ${top[1]?.planet || top[0].planet} carrying the strongest structural weight` : null
    )}`,
    evidence: [
      ...evidenceFromPlanets(top, 'structural emphasis'),
      ...(dashaHint ? [`Mahadasha context (MVP): ${dashaHint}`] : [])
    ],
    positive: 'Awareness of strongest tones may help you choose where to invest patience and skill.',
    challenge: 'Over-identifying with one planet’s story may hide other supportive tones.'
  };

  const emotionalPattern = {
    summary: moon
      ? `Emotional processing may lean toward ${moon.sign} themes in house ${moon.house} — ${moon.lifeDomains}.${softReasonLine(
          1,
          `Moon in ${moon.sign}${sat ? ` with Saturn pressure from house ${sat.house}` : ''}`
        )}`
      : 'Emotional processing may lean toward lunar themes once Moon data is available.',
    evidence: moon
      ? [`Moon dignity: ${moon.dignity}`, moon.challengingExpression, ...(sat ? [`Saturn tone for contrast: house ${sat.house}`] : [])]
      : ['Moon data unavailable for this synthesis pass.'],
    positive: 'Naming emotional patterns may reduce shame and reactivity.',
    challenge: 'Stress sensitivity may rise when sleep or routines slip — a rhythm issue, not a verdict.'
  };

  const careerPattern = {
    summary: tenth
      ? `Career tone may link to the tenth-house field (${tenth.meaning}) and where its lord (${tenth.lord}) sits (house ${tenth.lordPlacement?.house}).${softReasonLine(
          2,
          `${tenth.lord} ruling the 10th and operating through house ${tenth.lordPlacement?.house ?? 'unknown'}${sat && [1, 4, 7, 10].includes(sat.house) ? ', plus Saturn angle influence' : ''}`
        )}`
      : 'Career tone may link to tenth-house themes once house data is available.',
    evidence: [
      tenth ? `10th sign: ${tenth.sign}, lord ${tenth.lord}` : 'Tenth-house row missing',
      ...(sat && [1, 4, 7, 10].includes(sat.house) ? ['Saturn on an angle may add responsibility arcs.'] : [])
    ],
    positive: 'Slow mastery and public responsibility may become strengths when paced well.',
    challenge: 'Delayed recognition or pressure spikes may appear — treat as pacing, not punishment.'
  };

  const wealthPattern = {
    summary: second
      ? `Wealth-and-values tone may connect second-house themes (${second.meaning}) with where lord ${second.lord} sits (house ${second.lordPlacement?.house}).`
      : 'Wealth-and-values tone may connect second-house themes once house data is available.',
    evidence: [
      second ? `2nd sign ${second.sign}` : 'Second-house row missing',
      ...(jup && [2, 5, 9, 11].includes(jup.house) ? ['Jupiter touching wealth or gains houses may suggest growth style.'] : [])
    ],
    positive: 'Steady habits around speech and values may support security over time.',
    challenge: 'Comparison or scarcity thinking may flare — a mindset pattern to work with.'
  };

  const relationshipPattern = {
    summary: seventh
      ? `Partnership tone may reflect seventh-house themes (${seventh.meaning}) and lord ${seventh.lord} in house ${seventh.lordPlacement?.house}.${softReasonLine(
          3,
          `${seventh.lord} steering the 7th house pattern${ven ? ` with Venus in ${ven.sign}` : ''}`
        )}`
      : 'Partnership tone may reflect seventh-house themes once house data is available.',
    evidence: [
      ven ? `Venus in ${ven.sign}, house ${ven.house}` : 'Venus placement unavailable',
      seventh ? `7th sign ${seventh.sign}` : 'Seventh-house row missing'
    ],
    positive: 'Clear needs and boundaries may improve harmony without suppressing honesty.',
    challenge: 'Avoidance or intensity swings may show — communication skills are leverage.'
  };

  const healthEnergyPattern = {
    summary:
      'Energy and stress sensitivity may fluctuate with routine, sleep, and workload — discuss medical concerns only with qualified professionals.',
    evidence: [
      sixth ? `Sixth-house discipline theme: ${sixth.meaning}` : 'Sixth-house row missing',
      moon ? `Moon rhythm tone: ${moon.sign}` : 'Moon unavailable',
      ...(twelfth ? [`Twelfth-house rest theme: ${twelfth.meaning}`] : [])
    ],
    positive: 'Consistent sleep, meals, and movement often stabilize mood and focus.',
    challenge: 'Digestion or tension may track stress — use gentle regulation, not fear.'
  };

  const spiritualPattern = {
    summary:
      'Meaning-making may show through Jupiter and Ketu tones — growth through belief, release, or study.',
    evidence: [
      jup ? `Jupiter in ${jup.sign}, house ${jup.house}` : 'Jupiter unavailable',
      grahaProfiles.find((g) => g.planet === 'Ketu')
        ? `Ketu in house ${grahaProfiles.find((g) => g.planet === 'Ketu').house}`
        : 'Ketu unavailable',
      ...(yogaNames.length ? [`Yoga hints: ${yogaNames.join('; ')}`] : [])
    ],
    positive: 'Reflection practices may help integrate change without forcing certainty.',
    challenge: 'Detachment as avoidance is a common pitfall — balance solitude with connection.'
  };

  const rows = divisional?.divisionalRows || [];
  const outerStrongInnerSoft = [];
  const innerStrongOuterSoft = [];
  (grahaProfiles || []).forEach((g) => {
    if (!g || !g.planet || ['Rahu', 'Ketu'].includes(g.planet)) return;
    const row = rows.find((r) => r.planet === g.planet);
    if (!row || !row.d9Sign) return;
    const d1 = d1StructuralGrade(g.dignity);
    const d9 = d9StructuralGrade(g.planet, row.d9Sign);
    if (d1 >= 1 && d9 <= 0) {
      outerStrongInnerSoft.push(`${g.planet}: stronger D1 (${g.sign}) vs softer D9 (${row.d9Sign})`);
    }
    if (d1 <= -0.5 && d9 >= 1) {
      innerStrongOuterSoft.push(`${g.planet}: softer D1 (${g.sign}) vs stronger D9 (${row.d9Sign})`);
    }
  });

  const innerOuterBridge =
    outerStrongInnerSoft.length || innerStrongOuterSoft.length
      ? 'When D1 (outer life structure) and D9 (inner maturity / relationship refinement) disagree, people often feel either “successful outside but unsettled inside,” or “deep internally but not yet matched outwardly.” This is a pacing mismatch, not proof something is wrong with you.'
      : null;

  const conflictPatterns = {
    summary:
      innerOuterBridge && outerStrongInnerSoft.length
        ? `Friction may cluster around challenged structural scores, while some grahas show outer strength with a quieter Navamsa layer — a classic inner-vs-outer pacing theme.${softReasonLine(
            4,
            outerStrongInnerSoft.slice(0, 2).join('; ')
          )}`
        : innerOuterBridge && innerStrongOuterSoft.length
          ? `Friction may cluster around challenged structural scores, while some grahas show inner Navamsa strength that is not yet fully mirrored in outer-chart condition — patience across both layers helps.${softReasonLine(
              4,
              innerStrongOuterSoft.slice(0, 2).join('; ')
            )}`
          : 'Friction may cluster around the most challenged structural scores — use as a workshop list, not destiny.',
    evidence: [
      ...evidenceFromPlanets(
        [...(strength.scores || [])].sort((a, b) => a.totalScore - b.totalScore).slice(0, 3),
        'lower structural score'
      ),
      ...(outerStrongInnerSoft.length ? outerStrongInnerSoft.slice(0, 3) : []),
      ...(innerStrongOuterSoft.length ? innerStrongOuterSoft.slice(0, 3) : [])
    ],
    positive: innerOuterBridge
      ? 'Separating “outer story” from “inner maturation story” reduces shame and false urgency.'
      : 'Naming conflicts reduces rumination.',
    challenge: innerOuterBridge
      ? 'Avoid forcing one layer to prove the other; integrate with small experiments instead of total reinvention.'
      : 'Do not use labels to justify self-attack.',
    conflictBridge: innerOuterBridge
  };

  const supportPatterns = {
    summary: `Supportive leverage may sit with: ${topNames}.`,
    evidence: evidenceFromPlanets(top, 'higher structural score'),
    positive: 'Lean on strengths for experiments and recovery after stress.',
    challenge: 'Strengths overused can become blind spots — keep feedback channels open.'
  };

  const dominantThemes = [
    ...top.map((p) => `${p.planet}: ${p.strengthLabel}`),
    ...(dashaHint ? [`Dasha emphasis (MVP): ${dashaHint}`] : [])
  ];

  const riskAreas = [
    'Over-certainty from partial chart data',
    'Sleep and stress loops if routines break',
    'Relationship misunderstandings when stress is high'
  ];

  const growthKeys = [
    'Track one habit for 21 days (sleep or journaling)',
    'Separate facts from story when anxious',
    'Ask for professional help for health or legal decisions'
  ];

  const atmakaraka = charaKarakas?.atmakaraka;
  const retrograde = planetState?.retrogradePlanets || [];
  const combust = planetState?.combustPlanets || [];
  const strongestSupport = (argala?.support || []).slice(0, 3).map((x) => x.note);
  const strongestObstacles = (argala?.obstacles || []).slice(0, 3).map((x) => x.note);

  const innateDrivePattern = {
    summary: atmakaraka
      ? `Innate drive may center on ${atmakaraka.planet} themes, with soul-growth emphasis through ${atmakaraka.sign} style expression in house ${atmakaraka.house}.`
      : 'Innate drive pattern emerges more clearly once Chara Karaka ranking is available.',
    evidence: [
      atmakaraka
        ? `Atmakaraka: ${atmakaraka.planet} (${atmakaraka.degreeInSign}° in ${atmakaraka.sign})`
        : 'Atmakaraka unavailable',
      ...((charaKarakas?.karakas || []).slice(1, 3).map((k) => `${k.role}: ${k.planet}`))
    ],
    positive: 'Purpose clarity increases when actions align with the Atmakaraka tone.',
    challenge: 'Disconnection from core drive can feel like recurring emptiness despite outer progress.'
  };

  const hiddenChallengesPattern = {
    summary:
      'Hidden friction may come from subtle planetary states and behind-the-scenes blockage patterns, even when outer chart signals look favorable.',
    evidence: [
      retrograde.length ? `Retrograde influences: ${retrograde.join(', ')}` : 'No major retrograde flags.',
      combust.length ? `Combust influences: ${combust.join(', ')}` : 'No major combustion flags.',
      ...strongestObstacles
    ],
    positive: 'Recognizing hidden blockers early helps reduce repeated loops.',
    challenge:
      'Unseen conflicts can feel like “everything looks right, but results delay” unless consciously addressed.'
  };

  const hiddenSupportPattern = {
    summary: 'Hidden support can arrive through quiet structural argala patterns that strengthen outcomes over time.',
    evidence: strongestSupport.length ? strongestSupport : ['No standout argala support pattern in current frame.'],
    positive: 'Consistent effort activates hidden support and improves follow-through.',
    challenge: 'Ignoring subtle support patterns can make progress feel slower than it needs to be.'
  };

  const innerOuterTensionPattern =
    outerStrongInnerSoft.length + innerStrongOuterSoft.length === 0
      ? null
      : {
          summary: `Navamsa (D9) and Rashi (D1) do not tell identical stories for every graha. When they diverge, life may alternate between outer-role competence and inner refinement needs — or the reverse — without either side being “wrong.”${softReasonLine(
            5,
            outerStrongInnerSoft.length
              ? `Examples of outer-strong / inner-softer mix: ${outerStrongInnerSoft.slice(0, 2).join('; ')}`
              : `Examples of inner-strong / outer-softer mix: ${innerStrongOuterSoft.slice(0, 2).join('; ')}`
          )}`,
          evidence: [...outerStrongInnerSoft, ...innerStrongOuterSoft].slice(0, 8),
          positive:
            'Treat D1 as circumstance and craft, and D9 as relationship-to-self and long-arc maturity — integrate them on different timelines.',
          challenge:
            'Comparing your outer resume to your inner emotional truth on the same clock creates unnecessary suffering.',
          conflictBridge:
            'If D1 reads strong while D9 reads softer for the same planet, you may still need inner relationship skills even when outer roles look fine. If D9 reads strong while D1 reads softer, inner clarity may arrive before the world catches up — keep building without invalidating either signal.'
        };

  const bavStrong = Number(transitWindows?.bavTransitLayer?.strongMinimumBindu ?? 5);

  const criticalEventTimingPattern =
    transitWindows?.criticalEventWindows?.length > 0
      ? {
          summary:
            'Critical event-style timing windows stack **current pratyantar lord** with **strong transit BAV** (Bhinnaṣṭakavarga) for the occupied house — convergence of micro-dasha and per-graha bindu density.',
          evidence: transitWindows.criticalEventWindows.map(
            (w) =>
              `${w.transitPlanet} (pratyantar lord match): transit house ${w.occupiedHouse}, BAV ${w.bhinnaAshtakavargaPoints} (strong ≥ ${bavStrong}), SAV house ~${w.sarvashtakavargaHousePoints ?? 'n/a'}.`
          ),
          positive:
            'Use these stacks for intentional scheduling of themes aligned with that graha — still indicative, not deterministic.',
          challenge:
            'Avoid certainty language; external life is noisy even when inner timing signals align.'
        }
      : null;

  const underlyingEvidence = [];
  if (divisional?.vargottamaPlanets?.length) {
    underlyingEvidence.push(
      `Vargottama (same sign D1/D9): ${divisional.vargottamaPlanets.join(', ')} — emphasis often tracks more cleanly across outer and inner story.`
    );
  }
  if (divisional?.hiddenStrugglePlanets?.length) {
    underlyingEvidence.push(
      `Hidden struggle pattern (strong Rashi dignity, weak Navamsa dignity for same graha): ${divisional.hiddenStrugglePlanets.join(
        ', '
      )} — outer life can outpace inner settlement until Navamsa themes mature.`
    );
  }
  (transitWindows?.sarvaTransitLayer?.houseSnapshots || []).slice(0, 5).forEach((s) => {
    underlyingEvidence.push(
      `Transit ${s.graha} over house ${s.house}: Sarvashtakavarga bindu ~${
        s.sarvashtakavargaHousePoints ?? 'n/a'
      } (${s.savTransitTone}).`
    );
  });
  if (transitWindows?.confluence?.ingredients?.savSoftenedTransitAspects > 0) {
    underlyingEvidence.push(
      `${transitWindows.confluence.ingredients.savSoftenedTransitAspects} transit aspects softened because their occupied houses sit below the SAV density threshold.`
    );
  }
  if (transitWindows?.criticalEventWindows?.length > 0) {
    underlyingEvidence.push(
      `${transitWindows.criticalEventWindows.length} critical stacked window(s): pratyantar lord matches strong-BAV transit graha.`
    );
  }

  const underlyingPatterns =
    underlyingEvidence.length > 0
      ? {
          summary:
            'Underlying patterns combine Navamsa synergy, bindu-weighted transits, and nakshatra-lord friction already folded into structural scores — they explain why two charts with “similar” placements can feel different in timing.',
          evidence: underlyingEvidence.slice(0, 14),
          positive:
            'These layers reward patience: effects cluster when repetition proves the pattern rather than a single dramatic week.',
          challenge:
            'Do not treat any single sub-layer as a verdict; they are tension knobs, not fate switches.'
        }
      : null;

  const base = {
    coreLifePattern,
    emotionalPattern,
    careerPattern,
    wealthPattern,
    relationshipPattern,
    healthEnergyPattern,
    spiritualPattern,
    conflictPatterns,
    supportPatterns,
    innateDrivePattern,
    hiddenChallengesPattern,
    hiddenSupportPattern,
    dominantThemes,
    riskAreas,
    growthKeys
  };

  if (innerOuterTensionPattern) {
    base.innerOuterTensionPattern = innerOuterTensionPattern;
  }
  if (underlyingPatterns) {
    base.underlyingPatterns = underlyingPatterns;
  }
  if (criticalEventTimingPattern) {
    base.criticalEventTimingPattern = criticalEventTimingPattern;
  }

  return base;
}

module.exports = {
  synthesizePatterns
};
