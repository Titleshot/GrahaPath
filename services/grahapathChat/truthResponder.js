const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const SIGN_LORDSHIP = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter'
};

const NEPALI_DIGITS = {
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9'
};

function normalizeDigits(input) {
  return String(input || '').replace(/[०-९]/g, (d) => NEPALI_DIGITS[d] || d);
}

function normalizeText(input) {
  return normalizeDigits(String(input || '').toLowerCase());
}

function houseLabel(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function detectHouseFromMessage(message) {
  const t = normalizeText(message);
  const direct = /(?:\b|^)(1[0-2]|[1-9])(?:st|nd|rd|th)?\s*house\b/.exec(t);
  if (direct) return Number(direct[1]);
  const nep = /(?:\b|^)(1[0-2]|[1-9])\s*औँ\s*घर/.exec(t);
  if (nep) return Number(nep[1]);
  const ordinal = [
    { re: /first house|1st house|पहिलो घर/, n: 1 },
    { re: /second house|2nd house|दोस्रो घर/, n: 2 },
    { re: /third house|3rd house|तेस्रो घर/, n: 3 },
    { re: /fourth house|4th house|चौथो घर/, n: 4 },
    { re: /fifth house|5th house|पाँचौँ घर/, n: 5 },
    { re: /sixth house|6th house|छैटौँ घर/, n: 6 },
    { re: /seventh house|7th house|सातौँ घर/, n: 7 },
    { re: /eighth house|8th house|आठौँ घर/, n: 8 },
    { re: /ninth house|9th house|नवौँ घर/, n: 9 },
    { re: /tenth house|10th house|दशौँ घर|दसौँ घर/, n: 10 },
    { re: /eleventh house|11th house|एघारौँ घर/, n: 11 },
    { re: /twelfth house|12th house|बाह्रौँ घर/, n: 12 }
  ];
  for (const row of ordinal) {
    if (row.re.test(t)) return row.n;
  }
  return null;
}

function detectPlanetFromMessage(message) {
  const t = normalizeText(message);
  const aliases = {
    sun: 'Sun',
    सूर्य: 'Sun',
    moon: 'Moon',
    चन्द्र: 'Moon',
    चन्द्रमा: 'Moon',
    mars: 'Mars',
    मंगल: 'Mars',
    mercury: 'Mercury',
    बुध: 'Mercury',
    jupiter: 'Jupiter',
    बृहस्पति: 'Jupiter',
    गुरु: 'Jupiter',
    venus: 'Venus',
    शुक्र: 'Venus',
    saturn: 'Saturn',
    शनि: 'Saturn',
    rahu: 'Rahu',
    राहु: 'Rahu',
    ketu: 'Ketu',
    केतु: 'Ketu'
  };
  for (const [key, value] of Object.entries(aliases)) {
    if (t.includes(key)) return value;
  }
  return null;
}

function detectSignFromMessage(message) {
  const t = normalizeText(message);
  const signs = [
    { keys: ['aries', 'मेष'], sign: 'Aries' },
    { keys: ['taurus', 'वृष'], sign: 'Taurus' },
    { keys: ['gemini', 'मिथुन'], sign: 'Gemini' },
    { keys: ['cancer', 'कर्कट'], sign: 'Cancer' },
    { keys: ['leo', 'सिंह'], sign: 'Leo' },
    { keys: ['virgo', 'कन्या'], sign: 'Virgo' },
    { keys: ['libra', 'तुला'], sign: 'Libra' },
    { keys: ['scorpio', 'वृश्चिक'], sign: 'Scorpio' },
    { keys: ['sagittarius', 'धनु'], sign: 'Sagittarius' },
    { keys: ['capricorn', 'मकर'], sign: 'Capricorn' },
    { keys: ['aquarius', 'कुम्भ', 'kumbha'], sign: 'Aquarius' },
    { keys: ['pisces', 'मीन'], sign: 'Pisces' }
  ];
  for (const row of signs) {
    if (row.keys.some((k) => t.includes(k))) return row.sign;
  }
  return null;
}

function buildChartTruth(chart) {
  const houses = {};
  for (let i = 1; i <= 12; i += 1) houses[i] = [];
  const planetHouse = {};

  for (const p of Array.isArray(chart?.planets) ? chart.planets : []) {
    if (!p?.name || !Number.isFinite(Number(p.house))) continue;
    const house = Number(p.house);
    if (house >= 1 && house <= 12) {
      houses[house].push({
        name: p.name,
        sign: p.sign || null
      });
      planetHouse[p.name] = house;
    }
  }

  return {
    lagna: chart?.ascendant || null,
    moonSign: chart?.moonSign || null,
    sunSign: chart?.sunSign || null,
    houses,
    planetHouse
  };
}

function formatHouseOccupants(items) {
  if (!items || items.length === 0) return 'no major graha placements';
  return items.map((x) => `${x.name}${x.sign ? ` (${x.sign})` : ''}`).join(', ');
}

/**
 * Only short, factual placement lookups use the truth shortcut.
 * Interpretive, life-story, timing, and "how/why" questions go to the main AI.
 */
function isInterpretiveOrLifeQuestion(message) {
  const t = normalizeText(message);
  if (
    /\b(how|why|what does|what would|what will|mean|meaning|handle|handles|handling|affect|affects|impact|longevity|survival|crisis|crises|near-death|death|marriage|career|wealth|love|relationship|predict|future|will i|should i|can i|tell me about|explain|analyze|analysis|fame|recognition|remedy|remedies)\b/.test(
      t
    )
  ) {
    return true;
  }
  if (/(कसरी|किन|अर्थ|प्रभाव|मतलब|व्याख्या|बाँच|जीवन|मृत्यु|विवाह|पेशा|भविष्य|के हुन्छ|बताउ|वर्णन)/.test(t)) {
    return true;
  }
  if (
    /\b(kidnap|ransom|terror|attack|survived|escaped|famous|famously|unharmed|mumbai|taj hotel|assassination|accident|trauma|biography|he |his |she |her |they |their )\b/.test(
      t
    )
  ) {
    return true;
  }
  if (t.length > 120 && /\b(house|saturn|mars|moon)\b/.test(t)) {
    return true;
  }
  return false;
}

function isPlacementLookupOnly(message) {
  if (isInterpretiveOrLifeQuestion(message)) return false;
  const t = normalizeText(message);
  if (/today|आज|daily|दैनिक|tithi|nakshatra|पञ्चाङ्ग|panchanga/.test(t)) return false;

  const hasChartSubject =
    /house|घर|planet|graha|ग्रह|lagna|ascendant|yuti|conjunction|युति|lordship|malik|राशि|rashi|sign lord|sun|moon|mars|mercury|jupiter|venus|saturn|rahu|ketu|सूर्य|चन्द्र|शनि|राहु|केतु/.test(
      t
    ) || detectPlanetFromMessage(message) != null || detectHouseFromMessage(message) != null;
  if (!hasChartSubject) return false;

  const lookupPhrase =
    /\b(where is|which house is|what house is|what house|which house|what planets|which planets|who is in|list the|placement of|position of|located in|in my chart|in this chart|kun ghara|कुन घर|के छ|के-के छ|हरू छ)/.test(
      t
    ) || /^(what|which|where|list)\s+/i.test(t.trim());

  const shortFactual = t.length <= 85 && /\b(house|घर)\b/.test(t) && /\b(what|which|where|list|कुन|के)\b/.test(t);

  return lookupPhrase || shortFactual;
}

function shouldUseTruthResponse(message) {
  return isPlacementLookupOnly(message);
}

function truthResponseForMessage(message, chartTruth) {
  if (!shouldUseTruthResponse(message)) return null;
  const house = detectHouseFromMessage(message);
  const planet = detectPlanetFromMessage(message);
  const sign = detectSignFromMessage(message);
  const asksConjunction = /yuti|conjunction|युति|together|सँगै/.test(normalizeText(message));
  const asksLordship =
    /lordship|sign lord|rashi malik|राशिको मालिक|मालिक ग्रह|lord of/i.test(normalizeText(message));

  if (asksLordship && sign) {
    const lord = SIGN_LORDSHIP[sign];
    if (lord) return `${sign} is ruled by ${lord} (classical sign-lordship).`;
  }

  if (asksLordship) {
    const rows = Object.entries(SIGN_LORDSHIP).map(([s, l]) => `${s}→${l}`);
    return `Classical sign lords: ${rows.join(', ')}.`;
  }

  if (house) {
    const occupants = chartTruth.houses[house] || [];
    const base = `In this chart, the ${houseLabel(house)} house contains ${formatHouseOccupants(occupants)}.`;
    if (occupants.length >= 2 && asksConjunction) {
      return `${base} Conjunction (same house): ${occupants.map((x) => x.name).join(' + ')}.`;
    }
    return base;
  }

  if (planet) {
    const ph = chartTruth.planetHouse[planet];
    if (!ph) return `${planet} placement is not available in this chart payload.`;
    const signName = (chartTruth.houses[ph] || []).find((x) => x.name === planet)?.sign || 'unknown sign';
    return `In this chart, ${planet} is in the ${houseLabel(ph)} house (${signName}).`;
  }

  if (asksConjunction) {
    const rows = [];
    for (let i = 1; i <= 12; i += 1) {
      const occ = chartTruth.houses[i] || [];
      if (occ.length >= 2) rows.push(`${houseLabel(i)}: ${occ.map((x) => x.name).join(' + ')}`);
    }
    if (!rows.length) return 'This chart has no multi-planet conjunctions (same-house pairs) in the major grahas.';
    return `Conjunctions in this chart: ${rows.join(' | ')}.`;
  }

  return `Chart snapshot: Lagna ${chartTruth.lagna || '—'}, Moon sign ${chartTruth.moonSign || '—'}, Sun sign ${chartTruth.sunSign || '—'}. Ask a specific house or planet for exact placement.`;
}

module.exports = {
  buildChartTruth,
  isPlacementLookupOnly,
  isInterpretiveOrLifeQuestion,
  truthResponseForMessage
};
