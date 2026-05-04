/**
 * Phase report + personalization hooks for GrahaPath.
 * Consumes existing chart + interpretation payloads from /generate-chart.
 * Wording avoids deterministic claims; uses pattern language.
 */

const PLANET_ALIASES = {
  moon: "Moon",
  chandra: "Moon",
  saturn: "Saturn",
  shani: "Saturn",
  rahu: "Rahu",
  ketu: "Ketu",
};

const ELEMENT_BY_SIGN = {
  Aries: "fire",
  Leo: "fire",
  Sagittarius: "fire",
  Taurus: "earth",
  Virgo: "earth",
  Capricorn: "earth",
  Gemini: "air",
  Libra: "air",
  Aquarius: "air",
  Cancer: "water",
  Scorpio: "water",
  Pisces: "water",
};

const NEPALI_SIGN_MAP = {
  मेष: "Aries",
  वृष: "Taurus",
  मिथुन: "Gemini",
  कर्कट: "Cancer",
  सिंह: "Leo",
  कन्या: "Virgo",
  तुला: "Libra",
  वृश्चिक: "Scorpio",
  धनु: "Sagittarius",
  मकर: "Capricorn",
  कुम्भ: "Aquarius",
  मीन: "Pisces",
};

function normalizeSign(sign) {
  if (!sign || typeof sign !== "string") return "";
  const trimmed = sign.trim();
  return NEPALI_SIGN_MAP[trimmed] || trimmed;
}

function normalizePlanetName(name) {
  if (!name || typeof name !== "string") return "";
  const key = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (PLANET_ALIASES[key]) return PLANET_ALIASES[key];
  if (key.includes("ketu")) return "Ketu";
  if (key.includes("rahu") || key === "north node" || key === "true node") return "Rahu";
  return name.trim();
}

function findPlanet(planets, targetCanonical) {
  if (!Array.isArray(planets)) return null;
  const want = targetCanonical.toLowerCase();
  for (const p of planets) {
    const n = normalizePlanetName(p?.name || p?.planet || "");
    if (n.toLowerCase() === want) return p;
  }
  return null;
}

function houseBucket(house) {
  const h = Number(house);
  if (!Number.isFinite(h) || h < 1 || h > 12) return "unknown";
  if (h <= 3) return "self_start";
  if (h <= 6) return "build_stabilize";
  if (h <= 9) return "relate_expand";
  return "release_integrate";
}

function angularRelation(h1, h2) {
  const a = Number(h1);
  const b = Number(h2);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  let d = Math.abs(a - b);
  if (d > 6) d = 12 - d;
  if (d === 0) return "same_house";
  if (d === 1) return "adjacent";
  if (d === 6) return "opposition_axis";
  if (d === 4 || d === 8) return "tension_aspect";
  return "other";
}

function pickSnippet(text, maxLen = 120) {
  if (!text || typeof text !== "string") return "";
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, maxLen - 1).trim()}…`;
}

function moonHouseVoice(bucket, element) {
  const el = element || "mixed";
  const byBucket = {
    self_start:
      "The emotional storyline often begins close to home—in identity, body, and the private pace you need before you show the world anything.",
    build_stabilize:
      "Feelings tend to seek a container: habits, work rhythms, and the small daily proofs that you are safe enough to soften.",
    relate_expand:
      "Mood and meaning often travel through people, ideas, and horizons—you learn yourself in dialogue, not only in solitude.",
    release_integrate:
      "Your inner weather may run quieter in public than it feels inside; integration and letting go can be as important as pushing forward.",
    unknown:
      "Your emotional pattern is less about one loud trait and more about how you recover after intensity.",
  };
  const byElement = {
    fire: "There is a spark in how you move through feelings—you rarely want them to sit still forever.",
    earth: "You may not trust feelings until they prove themselves in reality; steadiness is its own kind of courage.",
    air: "You often think your way into feelings, then feel your way back out—naming things helps you stay kind to yourself.",
    water: "Sensitivity runs deep; boundaries are not coldness—they are how you keep the signal clear.",
    mixed: "",
  };
  return `${byBucket[bucket] || byBucket.unknown} ${byElement[el] || ""}`.trim();
}

function saturnHouseVoice(bucket) {
  const map = {
    self_start:
      "Saturn here often asks for a slower first chapter: confidence built from repetition, not from performance.",
    build_stabilize:
      "Pressure may show up as duty, craft, and the long game—what looks like delay can be training.",
    relate_expand:
      "Commitments and standards may shape how you partner with life itself—promises weigh more than slogans.",
    release_integrate:
      "Some lessons arrive through endings, health rhythms, or invisible work—progress that others do not applaud.",
    unknown:
      "Discipline may arrive in seasons rather than as a constant mood.",
  };
  return map[bucket] || map.unknown;
}

function risingVsMoonVoice(ascendant, moonSign) {
  const asc = normalizeSign(ascendant);
  const moon = normalizeSign(moonSign);
  if (!asc || !moon || asc === moon) return "";
  return `Others may clock your ${asc} rising first, while your ${moon} Moon runs the weather underneath—two truths, different speeds.`;
}

function moonSaturnRelationVoice(relation) {
  const map = {
    same_house:
      "When Moon and Saturn share space, tenderness and toughness often arrive together—care that does not flinch from truth.",
    adjacent:
      "Feelings and responsibility can sit back-to-back: one day softness leads, the next day structure does, and both are you.",
    opposition_axis:
      "There can be a living tension between what you need emotionally and what you are willing to be accountable for—negotiation is the skill, not picking a winner.",
    tension_aspect:
      "Old fears sometimes dress up as realism; naming the difference tends to loosen the grip.",
    other:
      "Moon and Saturn still talk across your chart—comfort and consequence rarely stay in separate rooms for long.",
  };
  return map[relation] || map.other;
}

/**
 * Builds a high-signal, chart-specific emotional hook from Moon + Saturn + houses,
 * layered with existing interpretation text when present.
 *
 * @param {object} chartPayload
 * @param {Array<{name?: string, planet?: string, sign?: string, house?: number, nakshatra?: string}>} [chartPayload.planets]
 * @param {string} [chartPayload.ascendant]
 * @param {string} [chartPayload.moonSign]
 * @param {string} [chartPayload.sunSign]
 * @param {{theme?: string, psychological?: string, strength?: string, challenge?: string}} [chartPayload.interpretation]
 * @returns {{ keyInsight: string, headline: string, body: string, signalsUsed: string[] }}
 */
function generateKeyInsight(chartPayload = {}) {
  const signalsUsed = [];
  const planets = chartPayload.planets || chartPayload.planetPlacements || [];
  const moon = findPlanet(planets, "Moon");
  const saturn = findPlanet(planets, "Saturn");

  const moonSign = normalizeSign(
    moon?.sign || chartPayload.moonSign || chartPayload.moon_sign || ""
  );
  const moonHouse = moon?.house ?? moon?.houseNumber ?? moon?.bhava;
  const moonNak = moon?.nakshatra || moon?.nakshatraName || "";
  const saturnHouse = saturn?.house ?? saturn?.houseNumber ?? saturn?.bhava;
  const ascendant =
    chartPayload.ascendant ||
    chartPayload.ascendantSign ||
    chartPayload.lagna ||
    "";

  const moonBucket = houseBucket(moonHouse);
  const saturnBucket = houseBucket(saturnHouse);
  const moonElement = ELEMENT_BY_SIGN[moonSign] || "mixed";

  if (moon) {
    const nakBit = moonNak ? ` · ${moonNak}` : "";
    signalsUsed.push(
      `Moon: H${moonHouse ?? "?"} ${moonSign || moon?.sign || ""}${nakBit}`.trim()
    );
  } else if (moonSign) signalsUsed.push(`Moon sign: ${moonSign}`);
  if (saturn) {
    signalsUsed.push(
      `Saturn: H${saturnHouse ?? "?"} ${normalizeSign(saturn?.sign) || saturn?.sign || ""}`.trim()
    );
  }

  const relation = angularRelation(moonHouse, saturnHouse);
  if (relation) signalsUsed.push(`Moon–Saturn relation: ${relation}`);
  const ascNorm = normalizeSign(ascendant);
  if (ascNorm && moonSign && ascNorm !== moonSign) {
    signalsUsed.push(`Rising vs Moon: ${ascNorm} vs ${moonSign}`);
  }

  const interp = chartPayload.interpretation || chartPayload.interpretationData || {};
  const themeLine = pickSnippet(interp.theme, 140);
  const psychLine = pickSnippet(interp.psychological, 140);
  const strengthLine = pickSnippet(interp.strength, 120);
  const challengeLine = pickSnippet(interp.challenge, 120);

  const partMoon = moonHouseVoice(moonBucket, moonElement);
  const partSaturn = saturn ? saturnHouseVoice(saturnBucket) : saturnHouseVoice("unknown");
  const partRelation =
    moon && saturn && relation ? moonSaturnRelationVoice(relation) : moonSaturnRelationVoice("other");
  const risingMoon = risingVsMoonVoice(ascendant, moonSign);

  let headline = "";
  if (moonSign && Number.isFinite(Number(moonHouse))) {
    const nakFrag = moonNak ? `, ${moonNak}` : "";
    headline = `Moon in your ${Number(moonHouse)}${ordinalSuffix(moonHouse)} (${moonSign}${nakFrag}) is a core lens on what “home” means inside you—not only a place.`;
  } else if (moonSign) {
    headline = `Moon in ${moonSign} tends to shape what soothes you, what rattles you, and what you need before you can think clearly.`;
  } else {
    headline = "Your chart points to an emotional pattern that is easier to respect than to rush.";
  }

  const saturnBridge =
    saturn && Number.isFinite(Number(saturnHouse))
      ? `Saturn’s pressure often meets you through ${houseToPlainLanguage(saturnHouse)}—less like punishment, more like a demand for integrity over time.`
      : "";

  const interpPrimary = themeLine || psychLine || strengthLine || challengeLine;
  const interpBridge = interpPrimary
    ? `If we put words to the thread you already sense: ${pickSnippet(interpPrimary, 160)}`
    : "";

  const keyInsightParts = [
    squeezeSpaces(headline),
    risingMoon,
    saturnBridge,
    partRelation,
    interpBridge,
  ].filter(Boolean);

  const keyInsight = squeezeSpaces(keyInsightParts.join(" "));

  const bodyParagraphs = [
    partMoon,
    saturn ? partSaturn : "Even when Saturn is quiet in the story, maturity still shows up as choosing what you will not pretend about.",
    partRelation,
    themeLine || strengthLine
      ? `A recurring theme here reads like: ${themeLine || strengthLine}`
      : "If you slow down, the same lesson tends to return with softer hands the second time.",
    psychLine
      ? `Psychologically, this can land as: ${psychLine}`
      : challengeLine
        ? `Under pressure, the inner story may tighten into: ${challengeLine}`
        : "You may notice your mind protecting you with narratives—some helpful, some outdated—until safety feels real enough to update them.",
    "None of this is fate written in stone; it is a map of tendencies you can work with on purpose.",
  ];

  const body = bodyParagraphs.filter(Boolean).join(" ");

  return {
    keyInsight,
    headline: squeezeSpaces(headline),
    body: squeezeSpaces(body),
    signalsUsed,
  };
}

function ordinalSuffix(n) {
  const h = Number(n);
  if (!Number.isFinite(h)) return "";
  const mod100 = h % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (h % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function houseToPlainLanguage(house) {
  const h = Number(house);
  const map = {
    1: "questions of identity and presence",
    2: "money, values, and what you consider yours",
    3: "communication, siblings, and courage in small steps",
    4: "home, roots, and the need to belong",
    5: "creativity, romance, and risk that feels personal",
    6: "daily work, health rhythms, and fixing what is broken",
    7: "partnerships and the mirror other people hold up",
    8: "shared resources, trust, and transformation",
    9: "belief, teachers, and widening the frame",
    10: "reputation, career, and what you are willing to stand for",
    11: "community, friendships, and long-range hopes",
    12: "rest, closure, and what you release to the unseen",
  };
  return map[h] || "the part of life where responsibility becomes unavoidable";
}

function squeezeSpaces(s) {
  return s.replace(/\s+/g, " ").trim();
}

const LIFE_PHASE_VALIDATION = ["This matches me", "Partially", "Not really"];

function planetsInHouse(planets, houseNum) {
  if (!Array.isArray(planets)) return [];
  const h = Number(houseNum);
  return planets.filter((p) => Number(p?.house ?? p?.houseNumber ?? p?.bhava) === h);
}

function planetHouse(p) {
  return Number(p?.house ?? p?.houseNumber ?? p?.bhava);
}

/** Nodal storyline in plain words (no per-graha lecture). */
function nodalStoryline(rahuH, ketuH) {
  const r = Number(rahuH);
  const k = Number(ketuH);
  if (!Number.isFinite(r) || !Number.isFinite(k)) return "";
  const axis = new Set([r, k]);
  if (axis.has(1) && axis.has(7)) {
    return "The nodal line may have tilted early life toward questions of role, mirroring, and who gets to take up space in a relationship.";
  }
  if (axis.has(4) && axis.has(10)) {
    return "Home expectations and outward ambition may have been braided early—private loyalty and public proof pulling in the same story.";
  }
  if (axis.has(2) && axis.has(8)) {
    return "There may have been an early education in trust, resources, and what is spoken versus what is only implied.";
  }
  if (axis.has(6) && axis.has(12)) {
    return "Health, worry, and what stays hidden may have formed a quiet backdrop—less drama, more subtle vigilance.";
  }
  if (r <= 3 || k <= 3) {
    return "A thread of “not yet named” hunger or withdrawal may have lived close to identity—small, repeated adjustments rather than one big event.";
  }
  return "The nodal axis may have colored childhood as a search for the right window—where curiosity is safe, and where it is not.";
}

function tenthHouseSummary(planets) {
  const in10 = planetsInHouse(planets, 10);
  if (!in10.length) return { count: 0, label: "open tenth-sector storyline" };
  const labels = in10
    .map((p) => normalizePlanetName(p?.name || p?.planet || ""))
    .filter(Boolean);
  const uniq = [...new Set(labels)];
  return {
    count: in10.length,
    label: uniq.length ? `${uniq.slice(0, 4).join(", ")} in 10th-sector emphasis` : "10th-sector emphasis",
  };
}

function collectLifePhaseContext(chartPayload = {}) {
  const planets = chartPayload.planets || chartPayload.planetPlacements || [];
  const ascRaw =
    chartPayload.ascendant || chartPayload.ascendantSign || chartPayload.lagna || "";
  const asc = normalizeSign(ascRaw);
  const moon = findPlanet(planets, "Moon");
  const saturn = findPlanet(planets, "Saturn");
  const rahu = findPlanet(planets, "Rahu");
  const ketu = findPlanet(planets, "Ketu");

  const moonSign = normalizeSign(moon?.sign || chartPayload.moonSign || chartPayload.moon_sign || "");
  const moonHouse = moon?.house ?? moon?.houseNumber ?? moon?.bhava;
  const moonBucket = houseBucket(moonHouse);
  const moonEl = ELEMENT_BY_SIGN[moonSign] || "mixed";
  const ascEl = ELEMENT_BY_SIGN[asc] || "mixed";

  const saturnHouse = saturn?.house ?? saturn?.houseNumber ?? saturn?.bhava;
  const rahuH = planetHouse(rahu);
  const ketuH = planetHouse(ketu);
  const tenth = tenthHouseSummary(planets);
  const saturnIn10 = Number(saturnHouse) === 10;
  const moonIn10 = Number(moonHouse) === 10;

  const interp = chartPayload.interpretation || chartPayload.interpretationData || {};
  const moonSaturnRel = angularRelation(moonHouse, saturnHouse);
  const risingVsMoon = asc && moonSign && asc !== moonSign;

  return {
    asc,
    ascEl,
    moonSign,
    moonHouse,
    moonBucket,
    moonEl,
    saturnHouse,
    saturnIn10,
    moonIn10,
    rahuH,
    ketuH,
    tenth,
    interpTheme: pickSnippet(interp.theme, 100),
    interpPsych: pickSnippet(interp.psychological, 100),
    interpChallenge: pickSnippet(interp.challenge, 100),
    moonSaturnRel,
    risingVsMoon,
    planets,
  };
}

function basisFromCtx(ctx, extra = "") {
  const bits = [];
  if (ctx.asc) bits.push(`rising ${ctx.asc}`);
  if (Number.isFinite(Number(ctx.moonHouse)) && ctx.moonSign) {
    bits.push(`Moon sector ${ctx.moonHouse} (${ctx.moonSign})`);
  } else if (ctx.moonSign) bits.push(`Moon sign ${ctx.moonSign}`);
  if (Number.isFinite(Number(ctx.saturnHouse))) bits.push(`Saturn sector ${ctx.saturnHouse}`);
  if (Number.isFinite(ctx.rahuH) && Number.isFinite(ctx.ketuH)) {
    bits.push(`nodal ${ctx.rahuH}/${ctx.ketuH}`);
  }
  if (ctx.tenth.count) bits.push(ctx.tenth.label);
  else bits.push("10th sector open");
  if (ctx.interpTheme) bits.push("interpretation theme");
  if (ctx.interpChallenge) bits.push("interpretation challenge");
  if (extra) bits.push(extra);
  return squeezeSpaces(bits.join(" · "));
}

function linesEarlyFormation(ctx) {
  const L = [];
  L.push(
    "In the first pass of life, the nervous system often learns faster than language—what felt allowed, what felt watched, what had to be earned with stillness."
  );
  if (ctx.risingVsMoon) {
    L.push(
      "There may have been a split between the “face” the world met first and the softer weather underneath—small mismatches that taught you to translate yourself early."
    );
  } else {
    L.push(
      "You may have been read in a fairly consistent way on the outside, while the inner story still had its own tides—normal, but easy to underestimate."
    );
  }
  if (ctx.moonBucket === "self_start") {
    L.push(
      "Independence and body-truth may have mattered sooner than adults realized—less defiance, more a need to feel real inside your own skin."
    );
  } else if (ctx.moonBucket === "build_stabilize") {
    L.push(
      "Routine, food, and the tone of daily life may have mattered enormously—stability as love, or its absence as a loud signal."
    );
  } else if (ctx.moonBucket === "relate_expand") {
    L.push(
      "Peers, stories, and comparisons may have arrived early as emotional reference points—belonging tested through language, humor, or competition."
    );
  } else if (ctx.moonBucket === "release_integrate") {
    L.push(
      "There may have been seasons that felt older than your age—private sensitivity, dreams, or endings you did not yet have words to carry."
    );
  } else {
    L.push(
      "Safety may have been negotiated through attention—who noticed you, who missed you, and what you learned to do with the gap."
    );
  }
  const nodal = nodalStoryline(ctx.rahuH, ctx.ketuH);
  if (nodal) L.push(nodal);
  if (ctx.saturnHouse === 4 || ctx.saturnHouse === 10) {
    L.push(
      "A seriousness in the background—rules, reputation, or home pressure—may have shown up as a quiet adult in the room, shaping what you called normal."
    );
  } else if (Number.isFinite(Number(ctx.saturnHouse))) {
    L.push(
      "Even when childhood looked ordinary from the outside, there may have been an early lesson in limits: time, money, patience, or the cost of promises."
    );
  }
  if (ctx.interpTheme) {
    L.push(`If your adult themes echo backward, they may already whisper here: ${ctx.interpTheme}`);
  }
  return L.slice(0, 6);
}

function linesIdentityDirection(ctx) {
  const L = [];
  L.push(
    "Between fifteen and twenty-four, identity often hardens through experiments—crushes, rivalries, first serious choices, and the ache to be taken seriously."
  );
  if (ctx.moonIn10 || ctx.saturnIn10 || ctx.tenth.count >= 2) {
    L.push(
      "Career-shaped questions may have arrived early: not only “what job?” but “what kind of person am I allowed to become in public?”"
    );
  } else if (ctx.tenth.count === 1) {
    L.push(
      "One clear thread of ambition or visibility may have shown up—not always as confidence, sometimes as a fear of being misread when it mattered."
    );
  } else {
    L.push(
      "Direction may have looked sideways for a while—talent without a container, or a container that felt borrowed from someone else’s script."
    );
  }
  if (ctx.ascEl === "fire" || ctx.moonEl === "fire") {
    L.push(
      "There may have been bursts of courage that outran support—thrilling, then lonely—teaching you when to sprint and when to build a team."
    );
  } else if (ctx.ascEl === "earth" || ctx.moonEl === "earth") {
    L.push(
      "You may have gravitated toward proof: grades, money, skill—anything that could not be argued with when feelings were too loud to trust."
    );
  } else if (ctx.ascEl === "air" || ctx.moonEl === "air") {
    L.push(
      "Ideas and social maps may have felt like oxygen—names for experiences, alliances that shifted, and the relief of finally being understood in language."
    );
  } else if (ctx.ascEl === "water" || ctx.moonEl === "water") {
    L.push(
      "Attachment and imagination may have run high—bonds that felt fated, endings that felt unfair, and a hunger for a story that could hold your depth."
    );
  } else {
    L.push(
      "You may have tried on different versions of confidence—loud, soft, careful—until you found a way to stay loyal to yourself without disappearing from the room."
    );
  }
  if (ctx.moonSaturnRel === "opposition_axis" || ctx.moonSaturnRel === "tension_aspect") {
    L.push(
      "A recurring push-pull may have shown up between what you needed emotionally and what you thought you had to earn—love treated like a test you could still fail."
    );
  } else {
    L.push(
      "You may have learned, through trial, which parts of you were safe to show in rooms where stakes were rising—friend groups, institutions, first real commitments."
    );
  }
  if (ctx.interpPsych) {
    L.push(`Your inner narration may have sounded like: ${ctx.interpPsych}`);
  }
  return L.slice(0, 6);
}

function linesPressureAlignment(ctx) {
  const L = [];
  L.push(
    "After twenty-five, life often asks for alignment more than discovery—fewer costumes, clearer costs, and the quiet work of matching your days to your values."
  );
  if (ctx.saturnIn10 || ctx.moonIn10) {
    L.push(
      "Public life and private weather may sit closer together now—what you build professionally can no longer pretend it does not touch your sleep."
    );
  }
  if (ctx.tenth.count) {
    L.push(
      `The tenth-sector storyline tends to concentrate how you are seen, trusted, and counted on—often less about fame than about integrity under repetition.`
    );
  } else {
    L.push(
      "Work and reputation may still matter, but the pressure can move house—into health, partnership, or community—until you name the real scoreboard."
    );
  }
  if (ctx.moonSaturnRel === "same_house" || ctx.moonSaturnRel === "adjacent") {
    L.push(
      "Care and duty may braid tightly now; the win is not softness without boundaries, but tenderness that still keeps its word to the future."
    );
  } else {
    L.push(
      "There may be seasons where the world feels slower than your anxiety—Saturn’s pace, not as punishment, but as a filter for what actually deserves your life force."
    );
  }
  if (Number.isFinite(ctx.rahuH) && Number.isFinite(ctx.ketuH)) {
    L.push(
      "The nodal thread can return as a choice-point: what you chase for relief versus what you are willing to release so the center can hold."
    );
  }
  if (ctx.interpChallenge) {
    L.push(`Where friction shows up, it may rhyme with: ${ctx.interpChallenge}`);
  }
  if (ctx.interpTheme && L.length < 6) {
    L.push(`A stabilizing theme you may keep returning to: ${ctx.interpTheme}`);
  }
  const pressurePad = [
    "You may notice adulthood asking for fewer heroes and more agreements—with yourself, with time, with what you will no longer postpone.",
    "There may have been phases where the outer scoreboard quieted and the inner one became harder to ignore—in a useful way, if you let it.",
  ];
  let p = 0;
  while (L.length < 4 && p < pressurePad.length) {
    L.push(pressurePad[p++]);
  }
  return L.slice(0, 6);
}

/**
 * Three life phases (past-validation framing) from blended chart signals.
 *
 * @param {object} chartPayload — same shape as /generate-chart result (planets, ascendant, interpretation, etc.)
 * @returns {{ phases: Array<{ title: string, ageRange: string, text: string, planetaryBasis: string, validationOptions: string[] }> }}
 */
function generateLifePhases(chartPayload = {}) {
  const ctx = collectLifePhaseContext(chartPayload);

  const phases = [
    {
      title: "Early Formation",
      ageRange: "0–14",
      text: linesEarlyFormation(ctx).join("\n"),
      planetaryBasis: basisFromCtx(ctx, "early imprint emphasis"),
      validationOptions: [...LIFE_PHASE_VALIDATION],
    },
    {
      title: "Identity & Direction",
      ageRange: "15–24",
      text: linesIdentityDirection(ctx).join("\n"),
      planetaryBasis: basisFromCtx(ctx, "identity arc emphasis"),
      validationOptions: [...LIFE_PHASE_VALIDATION],
    },
    {
      title: "Pressure & Alignment",
      ageRange: "25–Present",
      text: linesPressureAlignment(ctx).join("\n"),
      planetaryBasis: basisFromCtx(ctx, "maturity + vocation emphasis"),
      validationOptions: [...LIFE_PHASE_VALIDATION],
    },
  ];

  return { phases };
}

/**
 * Monetization teaser for full future analysis (copy is stable; chartPayload reserved for later personalization).
 *
 * @param {object} [_chartPayload]
 * @returns {{
 *   title: string,
 *   subtitle: string,
 *   lockedSections: Array<{ title: string, teaser: string }>,
 *   cta: string
 * }}
 */
function generateFutureUnlockTeaser(_chartPayload = {}) {
  return {
    title: "Your Future Pattern Is Ready",
    subtitle:
      "Your past patterns show how your chart works. The same placements also shape your future direction.",
    lockedSections: [
      {
        title: "Career & Profession Alignment",
        teaser:
          "Discover which work environments, roles, and growth paths align with your chart.",
      },
      {
        title: "Earnings & Wealth Potential",
        teaser:
          "Understand whether your chart favors steady income, business growth, delayed success, or high-risk opportunities.",
      },
      {
        title: "Relationship & Emotional Pattern",
        teaser: "Learn how you attach, communicate, and build trust.",
      },
      {
        title: "Health & Energy Tendencies",
        teaser:
          "Identify stress patterns and energy sensitivities. This is not medical advice.",
      },
      {
        title: "Remedy & Alignment Plan",
        teaser:
          "Receive mantras, behavior practices, and daily alignment steps based on your planetary patterns.",
      },
    ],
    cta: "Unlock My Full Analysis",
  };
}

module.exports = {
  generateKeyInsight,
  generateLifePhases,
  generateFutureUnlockTeaser,
};
