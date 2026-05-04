export const rashiNames = {
  Aries: { sanskrit: 'Mesha', devanagari: 'मेष' },
  Taurus: { sanskrit: 'Vrishabha', devanagari: 'वृषभ' },
  Gemini: { sanskrit: 'Mithun', devanagari: 'मिथुन' },
  Cancer: { sanskrit: 'Karka', devanagari: 'कर्क' },
  Leo: { sanskrit: 'Simha', devanagari: 'सिंह' },
  Virgo: { sanskrit: 'Kanya', devanagari: 'कन्या' },
  Libra: { sanskrit: 'Tula', devanagari: 'तुला' },
  Scorpio: { sanskrit: 'Vrischik', devanagari: 'वृश्चिक' },
  Sagittarius: { sanskrit: 'Dhanu', devanagari: 'धनु' },
  Capricorn: { sanskrit: 'Makara', devanagari: 'मकर' },
  Aquarius: { sanskrit: 'Kumbha', devanagari: 'कुम्भ' },
  Pisces: { sanskrit: 'Meena', devanagari: 'मीन' }
};

export const nakshatraNames = {
  Ashwini: 'अश्विनी',
  Bharani: 'भरणी',
  Krittika: 'कृत्तिका',
  Rohini: 'रोहिणी',
  Mrigashira: 'मृगशिरा',
  Ardra: 'आर्द्रा',
  Punarvasu: 'पुनर्वसु',
  Pushya: 'पुष्य',
  Ashlesha: 'आश्लेषा',
  Magha: 'मघा',
  'Purva Phalguni': 'पूर्व फाल्गुनी',
  'Uttara Phalguni': 'उत्तर फाल्गुनी',
  Hasta: 'हस्त',
  Chitra: 'चित्रा',
  Swati: 'स्वाती',
  Vishakha: 'विशाखा',
  Anuradha: 'अनुराधा',
  Jyeshtha: 'ज्येष्ठा',
  Mula: 'मूल',
  'Purva Ashadha': 'पूर्वाषाढा',
  'Uttara Ashadha': 'उत्तराषाढा',
  Shravana: 'श्रवण',
  Dhanishta: 'धनिष्ठा',
  Shatabhisha: 'शतभिषा',
  'Purva Bhadrapada': 'पूर्व भाद्रपदा',
  'Uttara Bhadrapada': 'उत्तर भाद्रपदा',
  Revati: 'रेवती'
};

export function getRashiParts(sign) {
  const names = rashiNames[sign];

  if (!names) {
    return {
      english: sign || '',
      local: ''
    };
  }

  return {
    english: sign,
    local: `${names.sanskrit} / ${names.devanagari}`
  };
}

export function getRashiDisplay(sign) {
  const parts = getRashiParts(sign);

  if (!parts.local) {
    return parts.english;
  }

  return `${parts.english} (${parts.local})`;
}

export function getRashiLocalDisplay(sign) {
  return getRashiParts(sign).local;
}

export function getNakshatraDisplay(nakshatra) {
  const devanagari = nakshatraNames[nakshatra];

  if (!devanagari) {
    return nakshatra || '';
  }

  return `${nakshatra} (${devanagari})`;
}
