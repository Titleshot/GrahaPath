/**
 * Personalized remedy scaffolding from chart + interpretation (no outcomes, no medical claims).
 */

const REMEDY_GRAHAS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
];

const PLANET_ALIAS = {
  sun: "Sun",
  moon: "Moon",
  mars: "Mars",
  mercury: "Mercury",
  jupiter: "Jupiter",
  venus: "Venus",
  saturn: "Saturn",
  shani: "Saturn",
  rahu: "Rahu",
  ketu: "Ketu",
};

const MANTRA_MAP = {
  Sun: {
    text: "Om Suryaya Namah",
    day: "Sunday",
    count: 108,
  },
  Moon: {
    text: "Om Som Somaya Namah",
    day: "Monday",
    count: 108,
  },
  Mars: {
    text: "Om Angarakaya Namah",
    day: "Tuesday",
    count: 108,
  },
  Mercury: {
    text: "Om Budhaya Namah",
    day: "Wednesday",
    count: 108,
  },
  Jupiter: {
    text: "Om Gurave Namah",
    day: "Thursday",
    count: 108,
  },
  Venus: {
    text: "Om Shukraya Namah",
    day: "Friday",
    count: 108,
  },
  Saturn: {
    text: "Om Sham Shanicharaya Namah",
    day: "Saturday",
    count: 108,
  },
  Rahu: {
    text: "Om Rahave Namah",
    day: "Saturday",
    count: 108,
  },
  Ketu: {
    text: "Om Ketave Namah",
    day: "Tuesday",
    count: 108,
  },
};

const DISCLAIM =
  "This is a reflective practice suggestion, not a promise of results. For mental health, medical, legal, or financial decisions, consult licensed professionals outside this app.";

function normalizePlanetName(name) {
  if (!name || typeof name !== "string") return "";
  const key = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (PLANET_ALIAS[key]) return PLANET_ALIAS[key];
  if (key.includes("ketu")) return "Ketu";
  if (key.includes("rahu") || key === "north node" || key === "true node") return "Rahu";
  const cap = name.trim();
  const found = REMEDY_GRAHAS.find((g) => g.toLowerCase() === cap.toLowerCase());
  return found || cap;
}

function findPlanet(planets, canon) {
  if (!Array.isArray(planets)) return null;
  const want = canon.toLowerCase();
  for (const p of planets) {
    const n = normalizePlanetName(p?.name || p?.planet || "");
    if (n.toLowerCase() === want) return p;
  }
  return null;
}

function houseNum(p) {
  return Number(p?.house ?? p?.houseNumber ?? p?.bhava);
}

function angularRelationMoonSaturn(planets) {
  const moon = findPlanet(planets, "Moon");
  const sat = findPlanet(planets, "Saturn");
  const a = Number(moon ? houseNum(moon) : NaN);
  const b = Number(sat ? houseNum(sat) : NaN);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  let d = Math.abs(a - b);
  if (d > 6) d = 12 - d;
  if (d === 0) return "same_house";
  if (d === 6) return "opposition_axis";
  if (d === 4 || d === 8) return "tension_aspect";
  return "other";
}

function isDusthana(h) {
  const x = Number(h);
  return x === 6 || x === 8 || x === 12;
}

function interpBlob(chartPayload) {
  const i = chartPayload.interpretation || chartPayload.interpretationData || {};
  return ["theme", "psychological", "strength", "challenge"]
    .map((k) => (typeof i[k] === "string" ? i[k] : ""))
    .join(" ")
    .toLowerCase();
}

function scoreInterpretationSignals(scores, text) {
  if (!text.trim()) return;
  const bumps = [];
  const hit = (...words) => words.some((w) => text.includes(w));

  if (
    hit("overwhelm", "spiral", "think", "rumina", "anxiet", "worry", "mind", "overthink", "clarity", "word")
  ) {
    bumps.push(["Mercury", 4]);
    bumps.push(["Moon", 2]);
  }
  if (
    hit(
      "restless",
      "impulse",
      "friction",
      "irrit",
      "anger",
      "push",
      "heat",
      "urgent",
      "compete",
      "defend",
      "action"
    )
  ) {
    bumps.push(["Mars", 4]);
    bumps.push(["Sun", 1]);
  }
  if (
    hit(
      "delay",
      "patience",
      "discipline",
      "duty",
      "endur",
      "load",
      "serious",
      "structure",
      "time",
      "weight",
      "heavy"
    )
  ) {
    bumps.push(["Saturn", 4]);
    bumps.push(["Venus", 1]);
  }
  if (
    hit(
      "mood",
      "care",
      "soft",
      "belong",
      "home",
      "tender",
      "attach",
      "lonely",
      "room",
      "intimate",
      "feel"
    )
  ) {
    bumps.push(["Moon", 4]);
    bumps.push(["Venus", 2]);
  }
  if (hit("loop", "craving", "unusual", "fixat", "intense curiosity", "outlier", "contrast", "shift", "search")) {
    bumps.push(["Rahu", 4]);
    bumps.push(["Ketu", 2]);
  }
  if (hit("trust", "teacher", "faith", "purpose", "expand", "generous", "meaning")) {
    bumps.push(["Jupiter", 2]);
  }

  bumps.forEach(([name, amt]) => {
    const i = REMEDY_GRAHAS.indexOf(name);
    if (i !== -1) scores[i] += amt;
  });
}

function scorePlacementSignals(scores, planetName, house) {
  const idx = REMEDY_GRAHAS.indexOf(planetName);
  if (idx === -1) return;
  let add = 0;
  const h = Number(house);
  if (!Number.isFinite(h)) return;

  if (isDusthana(h)) add += planetName === "Saturn" || planetName === "Moon" ? 6 : 5;
  else if ([1, 4, 7, 10].includes(h)) add += planetName === "Rahu" || planetName === "Ketu" ? 3 : 1;

  if (planetName === "Mars" && [1, 3, 6, 8, 11].includes(h)) add += 4;
  if (planetName === "Mercury" && (isDusthana(h) || [3, 6].includes(h))) add += 4;
  if (planetName === "Saturn") add += 3;
  if (planetName === "Moon" && isDusthana(h)) add += 3;

  scores[idx] += add;
}

function pickTopThreePlanets(scores) {
  const ranked = REMEDY_GRAHAS.map((name, i) => ({ name, score: scores[i] }));
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return REMEDY_GRAHAS.indexOf(a.name) - REMEDY_GRAHAS.indexOf(b.name);
  });
  const out = [];
  for (const row of ranked) {
    if (out.length >= 3) break;
    out.push(row.name);
  }
  const filler = ["Saturn", "Moon", "Mercury", "Jupiter", "Venus", "Sun", "Mars", "Rahu", "Ketu"];
  for (const f of filler) {
    if (out.length >= 3) break;
    if (!out.includes(f)) out.push(f);
  }
  return out;
}

function remedyTitle(planet) {
  const map = {
    Sun: "Warm clarity without burning out",
    Moon: "Emotional steadiness and gentleness",
    Mars: "Channeling drive without collision",
    Mercury: "Mental pacing and clearer speech",
    Jupiter: "Steadying meaning and goodwill",
    Venus: "Connection with cleaner boundaries",
    Saturn: "Endurance without self-hardening",
    Rahu: "Curiosity without compulsion",
    Ketu: "Simplicity instead of restless escape",
  };
  return map[planet] || "Alignment rhythm";
}

function remedyPattern(planet, chartPayload) {
  const planets = chartPayload.planets || chartPayload.planetPlacements || [];
  const placement = findPlanet(planets, planet);
  const h = placement ? houseNum(placement) : null;
  const dust = Number.isFinite(h) && isDusthana(h);
  const vague = dust
    ? "When life themes cluster in endings, friction, service, or the unseen,"
    : "When pacing and temperament show up unevenly across your chart,";

  const by = {
    Sun: `${vague} your sense of self may swing between holding the room and privately running low—both can coexist.`,
    Moon: `${vague} emotional texture may amplify before you fully name what shifted—it can look like tides, not “flaws”.`,
    Mars: `${vague} drive may spike as protection, excitement, or impatience before you consciously choose throttle.`,
    Mercury: `${vague} narration and multitasking may speed up faster than clarity can catch.`,
    Jupiter: `${vague} ideals may widen quickly and ask for pacing so hope still feels workable.`,
    Venus: `${vague} harmony may be chased through compromise until preferences feel blurred.`,
    Saturn: `${vague} pressure may quietly train maturity—sometimes louder than tenderness at first.`,
    Rahu: `${vague} appetite for “more” may show up as novelty, fixation, or a pull toward outliers.`,
    Ketu: `${vague} endings and release may beckon—not as disappearance, but as less attachment to noisy scores.`,
  };
  return by[planet] || by.Jupiter;
}

function remedyLogic(planet, signals) {
  return `Suggested because your chart cues lean toward ${signals}. This framing may help—you can adjust wording to what feels truthful.`;
}

function remedyBehavior(planet) {
  const b = {
    Sun: [
      "Before big decisions, name one boundary you refuse to outsource.",
      "Move your body briefly in daylight; treat it as grounding, not a performance.",
      "One honest sentence aloud about what actually matters today.",
    ],
    Moon: [
      "Add a repeatable wind‑down cue (tea, darkness, warmth) ending at the same rough time.",
      "Label one sensation before fixing it—mood or calm, tension or tenderness.",
      "Prefer smaller promises to yourself until trust in your word returns.",
    ],
    Mars: [
      "Separate “charge” into five minutes of movement before heavy conversations.",
      "Name irritation as tiredness twice before acting on blame.",
      "Choose one decisive action you will finish cleanly before opening the next frontier.",
    ],
    Mercury: [
      "Speak in shorter sentences until the point lands; lengthen only after silence.",
      "Write one anxious loop on paper; postpone reply for one hour when possible.",
      "Batch messages so your mind earns focus windows instead of pings.",
    ],
    Jupiter: [
      "Tie ideals to next Tuesday’s smallest step—not the whole crusade tonight.",
      "Share credit without shrinking your ask; reciprocity strengthens trust.",
      "One mentor-style question (“what matters most here?”) before advice.",
    ],
    Venus: [
      "Prefer clear likes over accommodating silence in low-stakes chats.",
      "Schedule beauty or music as upkeep, not a reward you must earn weekly.",
      "Touch one relational repair with tenderness and a bounded time box.",
    ],
    Saturn: [
      "Honor one mundane routine as integrity (sleep window, hydration, ledger).",
      "Offer yourself an earned rest after disciplined blocks—no apology.",
      "Name one overdue ask; send a draft that imperfectly communicates care.",
    ],
    Rahu: [
      "Time-box exploration so curiosity earns a runway without endless scroll.",
      "Name the feeling under “new”: excitement, boredom, or fear hiding as hunger.",
      "Swap one fixation channel for tactile craft or embodied learning.",
    ],
    Ketu: [
      "Declutter one symbolic corner of life (files, chats, closets) gently.",
      "Sit with ten quiet breaths before reaching for avoidance.",
      "Replace one habitual exit with naming what you appreciate about the harder room.",
    ],
  };
  return b[planet] || b.Jupiter;
}

function practicalActionFor(planet) {
  const a = {
    Sun: "This week choose one midday walk or ten minutes outdoors after your mantra window.",
    Moon: "Set a bedtime buffer you keep three nights in a row, without negotiating it away.",
    Mars: "Before reacting, inhale slowly four times—the fifth response can be quieter.",
    Mercury: "Record a one‑minute voice note for yourself before sending the third draft.",
    Jupiter: "Note one generosity you practiced and one boundary you upheld—same day.",
    Venus: "Invite one pleasurable micro‑moment that needs no justification.",
    Saturn: "Block twenty minutes weekly for backlog admin you keep postponing gently.",
    Rahu: "Try a structured curiosity sprint: twenty‑five focused minutes then a deliberate break.",
    Ketu: "Remove one habitual notification for seven days—observe steadiness kindly.",
  };
  return (
    a[planet] ||
    "Choose one small repeatable act that reinforces steadiness—not intensity—and notice how it shifts your week."
  );
}

function buildSignalsSentence(planets, interpText) {
  const parts = [];
  const placements = planets || [];

  const dust = placements.some((p) => {
    const h = houseNum(p);
    return Number.isFinite(h) && isDusthana(h);
  });
  if (dust)
    parts.push("placements tying into reorganizing‑pressure houses (traditionally 6 · 8 · 12)");

  if (interpText.includes("duty") || interpText.includes("endur") || interpText.includes("tired"))
    parts.push("phrasing in your reading about carrying responsibility");

  const ms = angularRelationMoonSaturn(placements);
  if (ms === "opposition_axis" || ms === "tension_aspect")
    parts.push("Moon‑Saturn house relationship in your map");

  if (findPlanet(placements, "Rahu") || findPlanet(placements, "Ketu"))
    parts.push("the nodal axis as a pacing clue");

  if (interpText.includes("thought") || interpText.includes("word") || interpText.includes("think"))
    parts.push("language about mental narration");

  const uniq = [...new Set(parts)];
  const slice = uniq.slice(0, 4);
  if (!slice.length) return "several placements read together—not a verdict on worth";
  return slice.join("; ");
}

/**
 * Score and build top‑3 personalised remedy cards.
 *
 * @param {object} chartPayload
 * @returns {{ remedies: Array<object> }}
 */
function generateRemedies(chartPayload = {}) {
  const planets = chartPayload.planets || chartPayload.planetPlacements || [];
  const interpText = interpBlob(chartPayload);
  const scores = REMEDY_GRAHAS.map(() => 0);

  scoreInterpretationSignals(scores, interpText);

  for (const p of planets) {
    const name = normalizePlanetName(p?.name || p?.planet || "");
    if (!REMEDY_GRAHAS.includes(name)) continue;
    scorePlacementSignals(scores, name, houseNum(p));
  }

  const moonSat = angularRelationMoonSaturn(planets);
  if (moonSat === "opposition_axis" || moonSat === "tension_aspect") {
    scores[REMEDY_GRAHAS.indexOf("Moon")] += 3;
    scores[REMEDY_GRAHAS.indexOf("Saturn")] += 3;
  }

  const sat = findPlanet(planets, "Saturn");
  if (sat) scores[REMEDY_GRAHAS.indexOf("Saturn")] += 2;

  const moon = findPlanet(planets, "Moon");
  if (moon) scores[REMEDY_GRAHAS.indexOf("Moon")] += 2;

  const rahu = findPlanet(planets, "Rahu");
  const ketu = findPlanet(planets, "Ketu");
  if (rahu) scores[REMEDY_GRAHAS.indexOf("Rahu")] += 2;
  if (ketu) scores[REMEDY_GRAHAS.indexOf("Ketu")] += 2;

  const picks = pickTopThreePlanets(scores);
  const signalPhrase = buildSignalsSentence(planets, interpText);

  const remedies = picks.map((planet) => {
    const mantra = MANTRA_MAP[planet] || MANTRA_MAP.Jupiter;
    return {
      planet,
      title: remedyTitle(planet),
      pattern: remedyPattern(planet, chartPayload),
      logic: remedyLogic(planet, signalPhrase),
      mantra: {
        text: mantra.text,
        count: mantra.count,
        day: mantra.day,
      },
      behavior: remedyBehavior(planet),
      practicalAction: practicalActionFor(planet),
      disclaimer: DISCLAIM,
    };
  });

  return { remedies };
}

module.exports = {
  generateRemedies,
};
