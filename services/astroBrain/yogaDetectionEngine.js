const { SIGN_LORD } = require('./constants');

function buildGrahaIndex(grahaProfiles) {
  const idx = {};
  grahaProfiles.forEach((g) => {
    idx[g.planet] = g;
  });
  return idx;
}

function lordOfHouse(houseLordData, houseNum) {
  const row = houseLordData.houses.find((h) => h.house === houseNum);
  return row ? row.lord : null;
}

function lordHouseFromIndex(grahaIndex, lordName) {
  return grahaIndex[lordName]?.house ?? null;
}

function sameHouse(a, b) {
  return a != null && b != null && a === b;
}

function kendraFromLagna(h) {
  return [1, 4, 7, 10].includes(h);
}

function detectYogas(grahaProfiles, houseLordData) {
  const yogas = [];
  const grahaIndex = buildGrahaIndex(grahaProfiles);
  const ctx = { ...houseLordData, grahaIndex };

  const L2 = lordOfHouse(ctx, 2);
  const L5 = lordOfHouse(ctx, 5);
  const L9 = lordOfHouse(ctx, 9);
  const L10 = lordOfHouse(ctx, 10);
  const L11 = lordOfHouse(ctx, 11);
  const h = (lord) => lordHouseFromIndex(grahaIndex, lord);

  if (L2 && L11 && sameHouse(h(L2), h(L11))) {
    yogas.push({
      name: 'Dhana Yoga (possible)',
      strength: 'moderate',
      evidence: ['Second and eleventh lords occupy the same whole-sign house (same-house heuristic).'],
      interpretation:
        'May suggest a link between values or savings and gains or networks — a wealth-relevant theme to explore, not a promise of income.',
      caution: 'Do not equate automated yoga tags with financial guarantees.'
    });
  }

  if (L2 && L5 && sameHouse(h(L2), h(L5))) {
    yogas.push({
      name: 'Dhana Yoga variant (possible)',
      strength: 'weak',
      evidence: ['Second lord and fifth lord share a house (merit–resource link heuristic).'],
      interpretation: 'May suggest creativity or merit lines supporting resources — tendency language only.',
      caution: 'Heuristic; refine with divisional charts if needed.'
    });
  } else if (L2 && L9 && sameHouse(h(L2), h(L9))) {
    yogas.push({
      name: 'Dhana Yoga variant (possible)',
      strength: 'weak',
      evidence: ['Second lord and ninth lord share a house (fortune–resource link heuristic).'],
      interpretation: 'May suggest fortune or belief lines supporting resources — tendency language only.',
      caution: 'Heuristic; refine with divisional charts if needed.'
    });
  }

  const beneficsInWealthAxis = (grahaProfiles || []).filter(
    (g) => ['Jupiter', 'Venus', 'Mercury'].includes(g.planet) && (g.house === 2 || g.house === 11)
  );
  if (beneficsInWealthAxis.length) {
    yogas.push({
      name: 'Benefic presence on wealth axis (possible)',
      strength: 'weak',
      evidence: beneficsInWealthAxis.map((g) => `${g.planet} in house ${g.house}`),
      interpretation:
        'May suggest supportive tone for speech, values, or gains — still depends on dignity and dasha context.',
      caution: 'Presence alone is not a standalone verdict.'
    });
  }

  const houses = ctx.houses || [];
  const kendraLords = houses.filter((x) => [1, 4, 7, 10].includes(x.house)).map((x) => x.lord);
  const trikonaLords = houses.filter((x) => [1, 5, 9].includes(x.house)).map((x) => x.lord);
  let rajFound = false;
  for (const kl of kendraLords) {
    for (const tl of trikonaLords) {
      if (kl && tl && kl !== tl && sameHouse(h(kl), h(tl))) {
        rajFound = true;
      }
    }
  }
  if (L9 && L10 && sameHouse(h(L9), h(L10))) rajFound = true;
  if (L5 && L10 && sameHouse(h(L5), h(L10))) rajFound = true;

  if (rajFound) {
    yogas.push({
      name: 'Raj Yoga (possible)',
      strength: 'moderate',
      evidence: [
        'Kendra–trikona lord same-house heuristic and/or 9th–10th or 5th–10th lord same-house heuristic.'
      ],
      interpretation:
        'May suggest purpose and visibility lines reinforcing each other — responsibility paired with merit or creativity.',
      caution: 'Classical Raj Yoga has many conditions; this is a simplified structural hint only.'
    });
  }

  const L6 = lordOfHouse(ctx, 6);
  const L8 = lordOfHouse(ctx, 8);
  const L12 = lordOfHouse(ctx, 12);
  const vipreet =
    L6 &&
    L8 &&
    L12 &&
    [6, 8, 12].includes(h(L6)) &&
    [6, 8, 12].includes(h(L8)) &&
    [6, 8, 12].includes(h(L12));

  if (vipreet) {
    yogas.push({
      name: 'Vipreet Raj Yoga (possible)',
      strength: 'weak',
      evidence: ['Lords of 6, 8, and 12 placed in dusthana houses (coarse heuristic).'],
      interpretation:
        'Growth through difficulty, competition, recovery, or hidden strength may appear as a recurring pattern — not permanent misfortune.',
      caution: 'Avoid fear-based language; this is exploratory.'
    });
  }

  grahaProfiles.forEach((g) => {
    if (g.dignity !== 'debilitated' || g.planet === 'Rahu' || g.planet === 'Ketu') return;
    const signLordName = SIGN_LORD[g.sign];
    const lordP = grahaIndex[signLordName];
    if (lordP && kendraFromLagna(lordP.house)) {
      yogas.push({
        name: `Neecha Bhanga hint for ${g.planet} (possible)`,
        strength: 'weak',
        evidence: [
          `${g.planet} debilitated in ${g.sign}; sign ruler ${signLordName} occupies kendra from lagna (basic check).`
        ],
        interpretation:
          'Relief-after-pressure themes may appear — suggests resilience potential rather than fixed weakness.',
        caution: 'Full cancellation rules are stricter; treat as exploratory flag.'
      });
    }
  });

  const moon = grahaIndex.Moon;
  const jup = grahaIndex.Jupiter;
  if (moon && jup && moon.house && jup.house) {
    const diff = ((jup.house - moon.house + 12) % 12) + 1;
    if ([1, 4, 7, 10].includes(diff)) {
      yogas.push({
        name: 'Gaja Kesari Yoga (possible)',
        strength: 'moderate',
        evidence: ['Jupiter in kendra from Moon by whole-sign house count (heuristic).'],
        interpretation:
          'May suggest emotional steadiness supported by judgment or guidance — protective tone, not certainty.',
        caution: 'Degree-based strength not modeled in MVP.'
      });
    }
  }

  const mars = grahaIndex.Mars;
  if (moon && mars && sameHouse(moon.house, mars.house)) {
    yogas.push({
      name: 'Chandra–Mangal Yoga (possible)',
      strength: 'moderate',
      evidence: ['Moon and Mars share the same whole-sign house.'],
      interpretation:
        'May suggest emotional drive linked with action or material initiative — monitor impulsivity as a growth edge.',
      caution: 'Same-house is a coarse conjunction proxy.'
    });
  } else if (moon && mars) {
    const diff = ((mars.house - moon.house + 12) % 12) + 1;
    if ([1, 4, 7, 10].includes(diff)) {
      yogas.push({
        name: 'Chandra–Mangal Yoga (weak possible)',
        strength: 'weak',
        evidence: ['Moon and Mars in mutual kendra by whole-sign count (heuristic).'],
        interpretation: 'May suggest activity affecting emotional or material rhythms — exploratory only.',
        caution: 'Not a classical exact aspect.'
      });
    }
  }

  const sat = grahaIndex.Saturn;
  if (sat && [1, 4, 7, 10].includes(sat.house)) {
    yogas.push({
      name: 'Saturn emphasis on an angle (pattern)',
      strength: 'moderate',
      evidence: [`Saturn occupies house ${sat.house} (kendra from lagna).`],
      interpretation:
        'Responsibility, pacing, or maturation pressure may show in visible life areas — support and pacing matter.',
      caution: 'Not a statement about fixed outcomes.'
    });
  }

  const rahu = grahaIndex.Rahu;
  const ketu = grahaIndex.Ketu;
  if (rahu && ketu) {
    yogas.push({
      name: 'Rahu–Ketu axis (life tension pattern)',
      strength: 'moderate',
      evidence: [`Rahu house ${rahu.house}`, `Ketu house ${ketu.house}`],
      interpretation:
        'Rahu’s house may suggest amplification or hunger themes; Ketu’s house may suggest release or insight themes — integration work, not fate.',
      caution: 'Shadow nodes are sensitive; avoid obsession-as-destiny framing.'
    });
  }

  if (!yogas.length) {
    yogas.push({
      name: 'Yoga scan',
      strength: 'weak',
      evidence: ['No strong heuristic yogas detected with current rules.'],
      interpretation: 'The chart may still hold nuanced combinations not captured by this MVP engine.',
      caution: 'Not enough data for stronger automated claims.'
    });
  }

  return { yogas };
}

module.exports = {
  detectYogas
};
