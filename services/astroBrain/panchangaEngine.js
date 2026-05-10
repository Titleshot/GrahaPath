const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TITHI_NAMES = [
  'Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
];

const KARANA_NAMES = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna'
];

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shoola',
  'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana',
  'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti'
];

/** Soft, non-deterministic “day tone” hints for birth-moment vibe (interpretive only). */
const YOGA_BIRTH_TONE = {
  Vishkambha: 'A day that may favor careful setup before big moves; patience with first steps.',
  Priti: 'Warmth and connection can feel easier; goodwill and small kindnesses carry weight.',
  Ayushman: 'Steady vitality and durability themes; pace for the long arc, not just the sprint.',
  Saubhagya: 'Fortune-by-effort tone; blessings often follow clear intention and follow-through.',
  Shobhana: 'Polish and presentation matter; harmony and aesthetics can lift outcomes.',
  Atiganda: 'Mind may run in loops; simplify decisions and avoid double-booking pressure.',
  Sukarma: 'Good-deed, fair-action energy; integrity tends to feel rewarding.',
  Dhriti: 'Hold the line; persistence and grit are the hidden assets of this tone.',
  Shoola: 'Sharp edges possible; choose words and timing with extra care.',
  Ganda: 'Friction awareness; repair small misunderstandings before they compound.',
  Vriddhi: 'Growth-by-increment; small improvements stack into noticeable progress.',
  Dhruva: 'Stability and commitment undertone; what you anchor may last.',
  Vyaghata: 'Scattered pulls; one priority at a time reduces unnecessary stress.',
  Harshana: 'Lift and celebration possible; confidence grows through visible wins.',
  Vajra: 'Directness and clarity; honesty lands well when paired with tact.',
  Siddhi: 'Skill and completion flavor; finishing tasks may feel especially satisfying.',
  Vyatipata: 'Reversal awareness; stay flexible and re-check assumptions gently.',
  Variyana: 'Expansion and outreach; learning and travel themes may feel alive.',
  Parigha: 'Barriers as teachers; find side doors instead of forcing gates.',
  Shiva: 'Clean slate energy; release what no longer serves with dignity.',
  Siddha: 'Competence and remedy tone; practical fixes may work better than drama.',
  Sadhya: 'Achievable goals; realistic targets tend to feel “meant to be” now.',
  Shubha: 'Auspicious flavor in a soft sense; grace favors preparation.',
  Shukla: 'Brightening undertone; clarity and simplicity support momentum.',
  Brahma: 'Creative order; structure plus imagination can cooperate.',
  Indra: 'Leadership and protection themes; stand for what matters without puffing up.',
  Vaidhriti: 'Integration pass; tie loose ends and consolidate instead of starting fresh everywhere.'
};

const NAKSHATRA_BIRTH_TONE = {
  Ashwini: 'Quick starts, healing curiosity, and a preference for fresh momentum.',
  Bharani: 'Threshold energy—choices matter; hold boundaries with gentle firmness.',
  Krittika: 'Cutting clarity and purification; truth-telling with warmth.',
  Rohini: 'Sensory richness, stability, and building beauty over time.',
  Mrigashira: 'Restless searching; questions and exploration keep the mind alive.',
  Ardra: 'Emotional weather patterns; storms pass when named with compassion.',
  Punarvasu: 'Return and renewal; second chances are a real theme.',
  Pushya: 'Nourishment and care; small acts of service echo widely.',
  Ashlesha: 'Coiled insight; trust intuition but verify with calm facts.',
  Magha: 'Lineage and dignity; honor roots without being ruled by them.',
  'Purva Phalguni': 'Creative relaxation and heart-open joy when safety exists.',
  'Uttara Phalguni': 'Reliable warmth; loyalty and fairness as core values.',
  Hasta: 'Craft, skill, and clever hands; details become superpowers.',
  Chitra: 'Design and refinement; beauty with backbone.',
  Swati: 'Independent breeze; freedom within commitment matters.',
  Vishakha: 'Focused hunger for purpose; channel ambition into one meaningful lane.',
  Anuradha: 'Devotion and friendship; belonging through steady effort.',
  Jyeshtha: 'Protection and intensity; depth without swallowing others whole.',
  Mula: 'Uprooting to replant; honesty about endings opens new soil.',
  'Purva Ashadha': 'Invincible enthusiasm when aligned; avoid overpromising when tired.',
  'Uttara Ashadha': 'Victory through patience; late bloomers finish strong.',
  Shravana: 'Listening as power; the right story changes everything.',
  Dhanishta: 'Rhythm and spotlight; teamwork makes the beat sustainable.',
  Shatabhisha: 'Mystery and repair; healing often looks quiet and scientific.',
  'Purva Bhadrapada': 'Fire-and-surrender mix; passion needs a container.',
  'Uttara Bhadrapada': 'Deep waters, steady wisdom; sleep and dreams matter.',
  Revati: 'Closure and compassion; gentle completions open the next chapter.'
};

const VARA_BIRTH_TONE = {
  Sunday: 'Solar visibility and self-honesty; lead without burning out.',
  Monday: 'Lunar sensitivity; emotions need naming, not fixing on the spot.',
  Tuesday: 'Martial edge; courage works best with a cool-down built in.',
  Wednesday: 'Mercurial versatility; writing, learning, and honest conversation shine.',
  Thursday: 'Jupiterian meaning; teachers, ethics, and big-picture faith.',
  Friday: 'Venusian harmony; relationships, values, and aesthetic balance.',
  Saturday: 'Saturnine discipline; slow proof beats fast promises.'
};

function tithiPakshaTone(tithiIndexZeroBased) {
  if (!Number.isFinite(tithiIndexZeroBased)) return 'Lunar rhythm is present; favor gentle pacing either way.';
  const brightHalf = tithiIndexZeroBased < 15;
  return brightHalf
    ? 'Bright-half lunar tone: outward building, visible steps, and additive momentum may feel natural.'
    : 'Dark-half lunar tone: integration, release, and inner recalibration may feel as important as visible wins.';
}

function buildBirthVibe(panchangaBlock = {}) {
  const tithi = panchangaBlock.tithi;
  const yoga = panchangaBlock.yoga;
  const nak = panchangaBlock.nakshatra;
  const vara = panchangaBlock.vara;

  const tithiIdx = Number.isFinite(tithi?.index) ? tithi.index - 1 : null;
  const tithiTone = tithiPakshaTone(tithiIdx);
  const yogaName = yoga?.name;
  const yogaTone = (yogaName && YOGA_BIRTH_TONE[yogaName]) || 'A mixed yoga undertone; stay flexible and observe what energizes versus drains you.';
  const nakTone = (nak && NAKSHATRA_BIRTH_TONE[nak]) || 'Lunar mansion adds a personal emotional texture; your pace may not match generic “productivity” advice.';
  const varaTone = (vara && VARA_BIRTH_TONE[vara]) || 'Weekday adds a practical rhythm; align demanding tasks with your natural highs and lows.';

  const parts = [tithiTone, nakTone, yogaTone, varaTone].filter(Boolean);
  const summary = `Birth-moment panchanga weaves: ${parts.join(' ')}`.slice(0, 520);

  return {
    headline: 'Panchanga birth vibe (soft framing)',
    summary,
    elements: {
      vara: { name: vara || null, tone: varaTone },
      tithi: tithi
        ? { name: tithi.name, index: tithi.index, tone: tithiTone }
        : { name: null, tone: tithiTone },
      nakshatra: { name: nak || null, tone: nakTone },
      yoga: yoga ? { name: yoga.name, index: yoga.index, tone: yogaTone } : { name: null, tone: yogaTone }
    },
    keywords: [
      tithiIdx !== null && tithiIdx < 15 ? 'building_momentum' : 'integration',
      nak ? 'lunar_texture' : 'moon_context_limited',
      yogaName ? 'yoga_undertone' : 'yoga_partial'
    ].filter(Boolean),
    caveat:
      'Birth vibe is a reflective mood map from Tithi / Nakshatra / Yoga / Vara—not a personality verdict, medical label, or fixed prediction.'
  };
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function getPlanet(chartPayload, name) {
  return (chartPayload?.planets || []).find((p) => p.name === name) || null;
}

function buildPanchanga(chartPayload) {
  const sun = getPlanet(chartPayload, 'Sun');
  const moon = getPlanet(chartPayload, 'Moon');
  const localDate = new Date(chartPayload?.localDateTime || chartPayload?.utcDateTime || Date.now());
  const vara = WEEKDAYS[localDate.getDay()] || 'Unknown';

  if (!sun || !moon) {
    const partial = {
      vara,
      tithi: null,
      nakshatra: moon?.nakshatra || null,
      yoga: null,
      karana: null,
      caveat: 'Panchanga partial: Sun/Moon data incomplete.'
    };
    partial.birthVibe = buildBirthVibe(partial);
    return partial;
  }

  const tithiIndex = Math.floor(normalizeDegrees(moon.absoluteDegree - sun.absoluteDegree) / 12);
  const yogaIndex = Math.floor(normalizeDegrees(moon.absoluteDegree + sun.absoluteDegree) / (360 / 27));
  const karanaIndex = Math.floor(normalizeDegrees(moon.absoluteDegree - sun.absoluteDegree) / 6);

  const full = {
    vara,
    tithi: {
      index: tithiIndex + 1,
      name: TITHI_NAMES[Math.max(0, Math.min(TITHI_NAMES.length - 1, tithiIndex))]
    },
    nakshatra: moon.nakshatra || null,
    yoga: {
      index: yogaIndex + 1,
      name: YOGA_NAMES[Math.max(0, Math.min(YOGA_NAMES.length - 1, yogaIndex))]
    },
    karana: {
      index: karanaIndex + 1,
      name: KARANA_NAMES[Math.max(0, Math.min(KARANA_NAMES.length - 1, karanaIndex))]
    },
    caveat: 'Panchanga is computed from sidereal Sun/Moon positions for interpretive weighting.'
  };
  full.birthVibe = buildBirthVibe(full);
  return full;
}

module.exports = {
  buildPanchanga,
  buildBirthVibe
};

