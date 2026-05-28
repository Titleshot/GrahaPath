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

function shouldUseTruthResponse(message) {
  const t = normalizeText(message);
  return (
    /house|घर|yuti|conjunction|युति|planet|graha|ग्रह|lagna|moon sign|rashi|राशि|saturn|shani|शनि|where is|कुन घर|lordship|sign lord|rashi malik|राशिको मालिक|मालिक ग्रह/.test(
      t
    ) &&
    !/today|आज|daily|दैनिक|tithi|nakshatra|पञ्चाङ्ग|panchanga/.test(t)
  );
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
    if (lord) {
      return `Sign lordship matrix अनुसार ${sign} राशिको मालिक ${lord} हो। यो fixed classical mapping हो (non-negotiable).`;
    }
  }

  if (asksLordship) {
    const rows = Object.entries(SIGN_LORDSHIP).map(([s, l]) => `${s}→${l}`);
    return `Fixed Sign Lordship Matrix: ${rows.join(', ')}. यसै matrix अनुसार मात्र व्याख्या गर्नुपर्छ।`;
  }

  if (house) {
    const occupants = chartTruth.houses[house] || [];
    const conjunction = occupants.length >= 2
      ? ` ${houseLabel(house)} house ma yuti: ${occupants.map((x) => x.name).join(' + ')}.`
      : '';
    return `Chart truth अनुसार ${houseLabel(house)} house मा ${formatHouseOccupants(occupants)} छन्.${conjunction} Yo answer direct chart mapping बाट आएको हो.`;
  }

  if (planet) {
    const ph = chartTruth.planetHouse[planet];
    if (!ph) {
      return `${planet} को house placement यो chart payload मा उपलब्ध छैन।`;
    }
    const sign = (chartTruth.houses[ph] || []).find((x) => x.name === planet)?.sign || 'unknown sign';
    return `Chart truth अनुसार ${planet} ${houseLabel(ph)} house मा छ (${sign}). यो direct chart-position mapping हो.`;
  }

  if (asksConjunction) {
    const rows = [];
    for (let i = 1; i <= 12; i += 1) {
      const occ = chartTruth.houses[i] || [];
      if (occ.length >= 2) rows.push(`${houseLabel(i)}: ${occ.map((x) => x.name).join(' + ')}`);
    }
    if (!rows.length) return 'यो chart मा multi-planet yuti (same house) भेटिएन।';
    return `Chart अनुसार प्रमुख yuti हरू: ${rows.join(' | ')}.`;
  }

  return `Chart truth: Lagna ${chartTruth.lagna || '—'}, Moon ${chartTruth.moonSign || '—'}, Sun ${chartTruth.sunSign || '—'}. Specific house/planet सोध्नुभयो भने exact mapping दिन्छु.`;
}

module.exports = {
  buildChartTruth,
  truthResponseForMessage
};
