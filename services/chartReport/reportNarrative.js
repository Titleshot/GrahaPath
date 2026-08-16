const {
  HOUSE_MEANINGS,
  PLANET_MEANINGS,
  SIGN_MEANINGS
} = require('../interpretationService');

function planetByName(chart, name) {
  return (chart?.planets || []).find((p) => String(p?.name || '') === name) || null;
}

function occupantsOfHouse(chart, house) {
  return (chart?.planets || []).filter((p) => Number(p?.house) === Number(house));
}

function dashaBlock(chart) {
  const brain = chart?.astroBrain || {};
  return {
    current: brain.currentDasha || null,
    antar: brain.currentAntardasha || null,
    pratyantar: brain.currentPratyantar || null,
    timeline: Array.isArray(brain.vimshottariTimeline) ? brain.vimshottariTimeline : [],
    snapshot: chart?.dashaSnapshot || null
  };
}

function expandPlanet(planet) {
  const base = PLANET_MEANINGS[planet?.name] || {
    theme: 'a core life function',
    psychological: 'a patterned way of meeting the world',
    strengths: ['focus'],
    challenges: ['imbalance']
  };
  const interp = planet?.interpretation || {};
  const houseMeaning = HOUSE_MEANINGS[planet?.house] || 'this area of life';
  const signMeaning = SIGN_MEANINGS[planet?.sign] || 'a mixed style of expression';
  const reportLine = interp.reportLine || interp.theme || `${planet?.name} is working through ${houseMeaning}.`;

  return [
    `${planet.name} is placed in ${planet.sign} in house ${planet.house}` +
      (planet.nakshatra ? `, in ${planet.nakshatra} nakshatra` : '') +
      (planet.nakshatraPada ? ` (pada ${planet.nakshatraPada})` : '') +
      (planet.retrograde ? '. It is retrograde, so its theme often turns inward before it shows outwardly.' : '.'),
    `Core theme: ${base.theme}. Psychologically this planet describes ${base.psychological}.`,
    `In this chart, house ${planet.house} colors that theme through ${houseMeaning}. ${planet.sign} adds a style that is ${signMeaning}.`,
    reportLine,
    interp.psychological ? `Inner pattern: ${interp.psychological}` : '',
    interp.strength || interp.strengths
      ? `Supportive expression: ${interp.strength || (Array.isArray(base.strengths) ? base.strengths.join(', ') : '')}`
      : `Supportive expression often includes ${base.strengths.join(', ')}.`,
    interp.challenge || interp.challenges
      ? `Pressure point: ${interp.challenge || (Array.isArray(base.challenges) ? base.challenges.join(', ') : '')}`
      : `Pressure can appear as ${base.challenges.join(', ')}.`,
    `How to work with it: notice when ${planet.name}'s theme of ${base.theme} is running, then ask whether the house ${planet.house} situation (related to ${houseMeaning}) is asking for skill, patience, or a clearer boundary. The chart does not force an outcome; it names the field where effort compounds.`,
    `In conversation and choice-making, ${planet.name} in ${planet.sign} often shows as a repeating preference. People may experience you through this placement before they understand the rest of the chart. Treat that first impression as a clue, not a cage.`
  ].filter(Boolean);
}

function expandHouse(chart, house) {
  const meaning = HOUSE_MEANINGS[house];
  const occ = occupantsOfHouse(chart, house);
  const cusp = (chart?.houseCusps || []).find((c) => Number(c.house) === house);
  const sign = cusp?.sign || null;
  const lines = [
    `House ${house} describes ${meaning}.` +
      (sign ? ` In this whole-sign kundali, house ${house} falls in ${sign}, so the topics of this house take on a ${SIGN_MEANINGS[sign] || 'mixed'} flavor.` : ''),
    occ.length
      ? `Planets activating this house: ${occ
          .map((p) => `${p.name} in ${p.sign}${p.nakshatra ? ` (${p.nakshatra})` : ''}`)
          .join('; ')}.`
      : `No graha occupies house ${house}. An empty house is not “missing life.” It usually means this area is shaped more by the house lord, aspects, and dasha periods than by a planet sitting inside it.`,
    `Lived texture: when house ${house} is active in timing, people often feel the story of ${meaning} more vividly — through people, places, work, or inner weather. Track those seasons instead of forcing a permanent label.`,
    `Practice: write one concrete example from the last year that touched ${meaning}. Then re-read this house page. The chart becomes useful when it maps onto a real scene, not when it stays abstract.`
  ];
  occ.forEach((p) => {
    const line = p?.interpretation?.reportLine;
    if (line) lines.push(`${p.name} here: ${line}`);
  });
  return lines;
}

function buildReportSections(chart) {
  const moon = planetByName(chart, 'Moon');
  const sun = planetByName(chart, 'Sun');
  const brain = chart?.astroBrain || {};
  const dasha = dashaBlock(chart);
  const yogas = Array.isArray(brain.yogas) ? brain.yogas : [];
  const aspects = Array.isArray(brain.aspects) ? brain.aspects : [];
  const drishti = Array.isArray(brain.drishti) ? brain.drishti : [];
  const future = brain.futureSections || {};
  const career = chart?.careerWealth || {};
  const phases = Array.isArray(chart?.lifePhases) ? chart.lifePhases : [];
  const remedies = chart?.remedyMapping || chart?.remedies || null;
  const panchanga = brain.panchanga || {};

  const sections = [];

  sections.push({
    title: 'How to read this report',
    paragraphs: [
      'This document is generated from your calculated Vedic birth chart (Lahiri ayanamsa, whole-sign houses) without calling an external language-model API. Every page is assembled from planetary positions, house occupancy, dasha timing, and GrahaPath’s local interpretation tables.',
      'Read it as a map of tendencies, not a verdict. A planet in a house names a field of experience. Dasha periods name when that field is more likely to be loud. You still choose the quality of response.',
      'The kundali diagram on the opening pages is the same wheel used in the GrahaPath interface: house 1 is Lagna, and grahas are placed in the houses they occupy. Use the picture to locate a planet, then jump to that planet’s chapter.',
      'If birth time is approximate, treat lagna, house cusps, and house-based statements as working hypotheses. Moon, Sun, and nakshatra remain more stable when time is slightly off; the first house is more sensitive.',
      'This is not medical, legal, or financial advice. It is a symbolic reading of a chart. Where the text sounds certain, read it as “this pattern is available,” not “this must happen.”'
    ]
  });

  sections.push({
    title: 'Birth snapshot',
    paragraphs: [
      `${chart.name || 'Native'} — chart calculated for ${chart.place || chart.location?.displayName || 'the given place'}.`,
      `Local birth date-time: ${chart.localDateTime || chart.birthDateAD || '—'}. Timezone: ${chart.timezone || '—'}. Ayanamsa: ${chart.ayanamsa || 'Lahiri'}. House system: ${chart.houseSystem || 'Whole Sign'}.`,
      `Lagna (Ascendant): ${chart.ascendant || '—'}${chart.ascendantDegree != null ? ` at ${Number(chart.ascendantDegree).toFixed(2)}°` : ''}. Moon sign: ${chart.moonSign || moon?.sign || '—'}. Sun sign: ${chart.sunSign || sun?.sign || '—'}.`,
      moon?.nakshatra ? `Moon nakshatra: ${moon.nakshatra}${moon.nakshatraPada ? `, pada ${moon.nakshatraPada}` : ''}.` : '',
      panchanga.tithi || panchanga.vara || panchanga.yoga
        ? `Panchanga notes: ${[panchanga.vara && `vara ${panchanga.vara}`, panchanga.tithi && `tithi ${panchanga.tithi}`, panchanga.nakshatra && `nakshatra ${panchanga.nakshatra}`, panchanga.yoga && `yoga ${panchanga.yoga}`].filter(Boolean).join('; ')}.`
        : '',
      chart.accuracy?.accuracyNotes?.length
        ? `Input notes: ${chart.accuracy.accuracyNotes.join(' ')}`
        : chart.timeInputMode === 'unknown_assumed_noon'
          ? 'Birth time was treated as unknown (noon assumed). House-based chapters should be held lightly.'
          : 'Birth time was treated as given. Still verify civil records if decisions depend on lagna.'
    ].filter(Boolean)
  });

  sections.push({
    title: 'Lagna — the seat of this life',
    paragraphs: [
      `Your lagna is ${chart.ascendant || 'unknown'}. Lagna is the chart’s “front door”: body, temperament, and how life approaches you before you explain yourself.`,
      SIGN_MEANINGS[chart.ascendant]
        ? `${chart.ascendant} lagna tends to present as ${SIGN_MEANINGS[chart.ascendant]}. That is the default costume of the personality, not the entire script.`
        : '',
      `House 1 also sets the whole-sign sequence. Every other house is counted from this sign. When people say “your 10th house career,” they mean the 10th sign from ${chart.ascendant || 'lagna'}.`,
      `Work with lagna by watching first impressions, vitality, and the stories you tell about “who I am.” If those stories feel tight, the rest of this report will show which grahas are pulling identity toward duty, desire, or withdrawal.`,
      `Lagna lord (the ruler of ${chart.ascendant || 'the rising sign'}) is the manager of this door. Find that planet in the graha chapters: its house tells you where identity is invested.`
    ].filter(Boolean)
  });

  sections.push({
    title: 'Sun and Moon — will and mind',
    paragraphs: [
      sun
        ? `Sun in ${sun.sign}, house ${sun.house}: ${PLANET_MEANINGS.Sun.theme}. ${sun.interpretation?.reportLine || ''} The Sun is how you try to stand in your own name — visibility, heat, and the need to matter.`
        : 'Sun placement was not present on this chart object.',
      moon
        ? `Moon in ${moon.sign}, house ${moon.house}: ${PLANET_MEANINGS.Moon.theme}. ${moon.interpretation?.reportLine || ''} The Moon is the weather of the mind: safety, memory, appetite, and the people who feel like home.`
        : 'Moon placement was not present on this chart object.',
      `Together, Sun and Moon are the two lights. When they cooperate, purpose and feeling walk in the same direction. When they strain, you may look confident while feeling unrested, or feel deeply while struggling to take up space. Neither is a defect; it is a rhythm to learn.`,
      `Daily practice: Sun chapters are useful in the morning (what am I standing for today). Moon chapters are useful at night (what actually soothed or scraped me). Over a month you will see the same two signatures repeating.`
    ]
  });

  const grahaOrder = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  grahaOrder.forEach((name) => {
    const planet = planetByName(chart, name);
    if (!planet) return;
    sections.push({
      title: `${name} — ${PLANET_MEANINGS[name]?.theme || 'graha chapter'}`,
      paragraphs: expandPlanet(planet)
    });
  });

  const houseGroups = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [10, 11, 12]
  ];
  houseGroups.forEach((group) => {
    sections.push({
      title: `Houses ${group[0]}–${group[2]}`,
      paragraphs: group.flatMap((h) => expandHouse(chart, h))
    });
  });

  sections.push({
    title: 'Yogas — named combinations',
    paragraphs: yogas.length
      ? yogas.slice(0, 18).flatMap((y) => [
          `${y.name || 'Yoga'}${y.strength ? ` (${y.strength})` : ''}: ${y.interpretation || y.caution || 'A combination is present.'}`,
          Array.isArray(y.evidence) && y.evidence.length ? `Evidence: ${y.evidence.join('; ')}.` : '',
          y.caution ? `Caution: ${y.caution}` : ''
        ]).filter(Boolean)
      : [
          'No named yogas were attached to this chart payload. That does not mean the chart is empty of combination; it means this export used the planet-and-house reading as the backbone. Re-generate with full astro-brain data if you need the yoga list.'
        ]
  });

  sections.push({
    title: 'Aspects and graha drishti',
    paragraphs: [
      aspects.length
        ? `Angular relationships (aspects) in this chart: ${aspects
            .slice(0, 24)
            .map((a) => `${a.planetA}–${a.planetB} ${a.aspectType} (orb ${Number(a.orb || 0).toFixed(1)}°)`)
            .join('; ')}.`
        : 'Western-style aspects were not included on this payload. Vedic house occupancy and drishti remain the primary relationship language in this report.',
      drishti.length
        ? `Classical graha drishti (sight): ${drishti
            .slice(0, 24)
            .map((d) => `${d.from} sees ${d.to} (house ${d.fromHouse} → ${d.toHouse}, distance ${d.drishtiDistance})`)
            .join('; ')}.`
        : 'Drishti rows were not attached. You can still read influence through house occupancy: a planet in a house colors that house even without a printed aspect list.',
      'When two grahas aspect or see each other, their themes blend. Conjunction is sharing a room. Opposition is a conversation across a table. Trine often feels like support. Square often feels like work. None of these is morally good or bad.'
    ]
  });

  const dashaParas = [];
  if (dasha.current) {
    dashaParas.push(
      `Current mahadasha: ${dasha.current.planet}` +
        (dasha.current.startDateApprox ? ` from about ${dasha.current.startDateApprox}` : '') +
        (dasha.current.endDateApprox ? ` to ${dasha.current.endDateApprox}` : '') +
        '.'
    );
    if (dasha.current.theme) dashaParas.push(`Theme: ${dasha.current.theme}`);
    if (dasha.current.likelyFocus) dashaParas.push(`Likely focus: ${dasha.current.likelyFocus}`);
    if (dasha.current.caution) dashaParas.push(`Caution: ${dasha.current.caution}`);
  } else if (dasha.snapshot) {
    dashaParas.push(
      `Dasha snapshot: maha ${dasha.snapshot.mahaDasha || '—'}, antar ${dasha.snapshot.antarDasha || '—'}, pratyantar ${dasha.snapshot.pratyantar || '—'}.`
    );
  } else {
    dashaParas.push('Vimśottari dasha details were not present on this chart object. Timing chapters will be thinner until the full brain payload is included.');
  }
  if (dasha.antar) {
    dashaParas.push(
      `Current antardasha: ${dasha.antar.antarLord || dasha.antar.planet}` +
        (dasha.antar.startDateApprox ? ` (${dasha.antar.startDateApprox} – ${dasha.antar.endDateApprox || '…'})` : '') +
        '.'
    );
  }
  if (dasha.pratyantar?.pratyantarLord) {
    dashaParas.push(`Current pratyantar: ${dasha.pratyantar.pratyantarLord}.`);
  }
  dashaParas.push(
    'Dasha is a sequencing tool. It does not replace free will. It tells you which planet’s classroom you are sitting in. Combine this chapter with that planet’s earlier page.'
  );
  sections.push({ title: 'Current dasha — the active classroom', paragraphs: dashaParas });

  if (dasha.timeline.length) {
    sections.push({
      title: 'Vimśottari mahadasha outline',
      paragraphs: dasha.timeline.slice(0, 12).map((row) => {
        const lord = row.planet || row.mahaLord || row.lord || 'Graha';
        const start = row.startDateApprox || row.startDate || row.startAge || '';
        const end = row.endDateApprox || row.endDate || row.endAge || '';
        const theme = row.theme || row.note || '';
        return `${lord}: ${start} → ${end}${theme ? `. ${theme}` : ''}`;
      })
    });
  }

  if (phases.length) {
    sections.push({
      title: 'Life-phase framing',
      paragraphs: phases.flatMap((ph) => [
        `${ph.phase || ''} ${ph.title || ''} (${ph.ageRange || ''})`.trim(),
        ...(Array.isArray(ph.paragraphs) ? ph.paragraphs : [])
      ])
    });
  }

  const futureKeys = [
    ['futureLifeDirection', 'Life direction'],
    ['earningsCareerPotential', 'Earnings and career potential'],
    ['relationshipEmotionalPattern', 'Relationship and emotional pattern'],
    ['healthEnergyTendencies', 'Health and energy tendencies'],
    ['personalizedRemedies', 'Personalized remedies']
  ];
  const futureParas = [];
  futureKeys.forEach(([key, label]) => {
    const val = future[key];
    if (!val) return;
    if (typeof val === 'string') futureParas.push(`${label}: ${val}`);
    else if (Array.isArray(val)) futureParas.push(`${label}: ${val.filter(Boolean).join(' ')}`);
    else if (typeof val === 'object') {
      const bits = Object.values(val)
        .flat()
        .filter((x) => typeof x === 'string' && x.trim());
      if (bits.length) futureParas.push(`${label}: ${bits.join(' ')}`);
    }
  });
  if (Array.isArray(brain.causalInsights?.insights)) {
    brain.causalInsights.insights.slice(0, 12).forEach((ins) => {
      futureParas.push(
        [ins.section, ins.observation, ins.cause, ins.effect].filter(Boolean).join(' — ')
      );
    });
  }
  if (futureParas.length) {
    sections.push({
      title: 'Direction, work, relating, energy',
      paragraphs: futureParas
    });
  }

  if (career?.insightCards || career?.meters) {
    const paras = [];
    if (career.meters) {
      paras.push(
        `Career meters (chart-derived scores, not destiny scores): lagna ${career.meters.lagnaStrength ?? '—'}, career points ${career.meters.careerPoints ?? '—'}, dasha alignment ${career.meters.dashaCareerAlignment ?? '—'}.`
      );
    }
    if (career.houses) {
      const tenth = career.houses.tenth;
      const eleventh = career.houses.eleventh;
      paras.push(
        `Tenth-house notes: ${typeof tenth === 'string' ? tenth : [tenth?.sign, tenth?.lord, tenth?.note].filter(Boolean).join(', ') || 'see house 10 chapter'}. Eleventh-house notes: ${typeof eleventh === 'string' ? eleventh : [eleventh?.sign, eleventh?.lord, eleventh?.note].filter(Boolean).join(', ') || 'see house 11 chapter'}.`
      );
    }
    if (Array.isArray(career.insightCards)) {
      career.insightCards.slice(0, 10).forEach((c) => {
        paras.push([c.title, c.body, c.text, c.insight].filter(Boolean).join(' — '));
      });
    }
    if (paras.length) sections.push({ title: 'Career and wealth notes', paragraphs: paras });
  }

  const remedyParas = [];
  if (Array.isArray(chart?.remedies)) {
    chart.remedies.slice(0, 16).forEach((r) => {
      remedyParas.push(typeof r === 'string' ? r : [r.title, r.text, r.practice, r.note].filter(Boolean).join(' — '));
    });
  }
  if (remedies && typeof remedies === 'object' && !Array.isArray(remedies)) {
    Object.entries(remedies)
      .slice(0, 20)
      .forEach(([k, v]) => {
        if (typeof v === 'string') remedyParas.push(`${k}: ${v}`);
        else if (Array.isArray(v)) remedyParas.push(`${k}: ${v.filter((x) => typeof x === 'string').join('; ')}`);
      });
  }
  remedyParas.push(
    'Remedies in GrahaPath are behavioral and contemplative first: sleep, speech, service, study, and honest limits. Mantra or ritual is optional coloring, not a substitute for the house work named earlier.'
  );
  sections.push({ title: 'Remedies and practice', paragraphs: remedyParas.filter(Boolean) });

  sections.push({
    title: 'Sign glossary',
    paragraphs: Object.entries(SIGN_MEANINGS).map(([sign, text]) => `${sign}: ${text}. When a graha sits here, its theme takes this style.`)
  });

  sections.push({
    title: 'Closing',
    paragraphs: [
      'You now have the picture of the kundali, the nine grahas, the twelve houses, timing, and practice notes. The useful next step is not to memorize the PDF. Pick one planet and one house that felt true this week, and watch them in ordinary life for fourteen days.',
      'GrahaPath’s live chat can discuss a moment; this report is the long form of the same chart. Neither replaces your judgment.',
      'Generated locally from chart calculation. No ChatGPT or Gemini call was required to write these pages.'
    ]
  });

  return sections;
}

module.exports = {
  buildReportSections,
  planetByName
};
