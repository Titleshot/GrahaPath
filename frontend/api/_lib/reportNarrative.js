const {
  HOUSE_MEANINGS,
  PLANET_MEANINGS,
  SIGN_MEANINGS
} = require('./interpretationService');

const SIGN_LORD = {
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

const HOUSE_LIFE = {
  1: 'Self & Identity',
  2: 'Wealth & Speech',
  3: 'Skills & Effort',
  4: 'Home & Inner Peace',
  5: 'Intelligence & Romance',
  6: 'Competition & Service',
  7: 'Marriage & Partnership',
  8: 'Transformation',
  9: 'Fortune & Higher Learning',
  10: 'Career',
  11: 'Income & Gains',
  12: 'Foreign Lands & Solitude'
};

const GRAHA_GLYPH = {
  Sun: '☉',
  Moon: '☽',
  Mars: '♂',
  Mercury: '☿',
  Jupiter: '♃',
  Venus: '♀',
  Saturn: '♄',
  Rahu: '☊',
  Ketu: '☋'
};

function planetByName(chart, name) {
  return (chart?.planets || []).find((p) => String(p?.name || '') === name) || null;
}

function occupants(chart, house) {
  return (chart?.planets || []).filter((p) => Number(p?.house) === Number(house));
}

function houseSign(chart, house) {
  const cusp = (chart?.houseCusps || []).find((c) => Number(c.house) === Number(house));
  if (cusp?.sign) return cusp.sign;
  const signs = Object.keys(SIGN_LORD);
  const lagna = chart?.ascendant;
  const i = signs.indexOf(lagna);
  if (i < 0) return null;
  return signs[(i + Number(house) - 1) % 12];
}

function dasha(chart) {
  const brain = chart?.astroBrain || {};
  return {
    current: brain.currentDasha || null,
    antar: brain.currentAntardasha || null,
    pratyantar: brain.currentPratyantar || null,
    timeline: Array.isArray(brain.vimshottariTimeline) ? brain.vimshottariTimeline : [],
    snapshot: chart?.dashaSnapshot || null,
    summary: brain.summary || {}
  };
}

function fmtWhen(chart) {
  const iso = chart?.localDateTime || chart?.birthDateAD;
  if (!iso) return { date: '—', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: String(iso).slice(0, 10), time: String(iso).slice(11, 16) };
  }
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const time = /\dT\d/.test(String(iso))
    ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';
  return { date, time };
}

function placeName(chart) {
  return chart?.place || chart?.location?.displayName || 'the given birthplace';
}

function strengthOf(planet) {
  const interp = planet?.interpretation || {};
  return interp.strength || (PLANET_MEANINGS[planet?.name]?.strengths || []).slice(0, 2).join(', ') || 'focused effort';
}

function challengeOf(planet) {
  const interp = planet?.interpretation || {};
  return interp.challenge || (PLANET_MEANINGS[planet?.name]?.challenges || []).slice(0, 2).join(', ') || 'imbalance under stress';
}

function lineOf(planet) {
  return planet?.interpretation?.reportLine || planet?.interpretation?.theme || '';
}

function starsFromScore(n) {
  const v = Math.max(0, Math.min(5, Math.round(Number(n) || 3)));
  return `${'★'.repeat(v)}${'☆'.repeat(5 - v)}`;
}

function meterFromHouse(chart, houses, boostPlanets = []) {
  let s = 0.42;
  houses.forEach((h) => {
    s += occupants(chart, h).length * 0.08;
  });
  boostPlanets.forEach((name) => {
    const p = planetByName(chart, name);
    if (p && houses.includes(Number(p.house))) s += 0.1;
  });
  return Math.max(0.28, Math.min(0.92, s));
}

function currentDashaLabel(d) {
  const maha = d.current?.planet || d.snapshot?.mahaDasha || d.summary?.currentMahadashaPlanet;
  const antar = d.antar?.antarLord || d.snapshot?.antarDasha || d.summary?.currentAntardashaLord;
  if (maha && antar) return `${maha} / ${antar}`;
  return maha || 'Current dasha';
}

function page(partial) {
  return {
    kicker: '',
    title: '',
    paragraphs: [],
    boxes: [],
    bullets: [],
    table: null,
    meters: [],
    ...partial
  };
}

function buildMahabhavishyaPages(chart) {
  const moon = planetByName(chart, 'Moon');
  const sun = planetByName(chart, 'Sun');
  const mars = planetByName(chart, 'Mars');
  const mercury = planetByName(chart, 'Mercury');
  const jupiter = planetByName(chart, 'Jupiter');
  const venus = planetByName(chart, 'Venus');
  const saturn = planetByName(chart, 'Saturn');
  const rahu = planetByName(chart, 'Rahu');
  const ketu = planetByName(chart, 'Ketu');
  const brain = chart?.astroBrain || {};
  const d = dasha(chart);
  const yogas = Array.isArray(brain.yogas) ? brain.yogas : [];
  const aspects = Array.isArray(brain.aspects) ? brain.aspects : [];
  const when = fmtWhen(chart);
  const lagna = chart?.ascendant || '—';
  const name = chart?.name || 'You';
  const pages = [];

  pages.push(page({
    kind: 'cover',
    kicker: 'GRAHAPATH',
    title: 'तपाईंको महाभविष्यफल',
    subtitle: 'Personalized Vedic Astrology Report',
    name,
    date: when.date,
    time: when.time,
    place: placeName(chart)
  }));

  pages.push(page({
    kicker: 'PAGE  ·  JANMA KUNDALI',
    title: 'तपाईंको जन्मकुण्डली',
    showWheel: true,
    paragraphs: [
      `यो चक्र तपाईंको जन्म कुण्डली हो — ${name} को लागि ${placeName(chart)} मा गणना गरिएको। House 1 Lagna हो; graha हरू आफ्नो house मा देखिन्छन्।`,
      `Lagna (${lagna}) ले तपाईंको बाहिरी व्यक्तित्व र जीवनमा अगाडि बढ्ने शैलीलाई संकेत गर्छ।`,
      `Moon Sign (${chart.moonSign || moon?.sign || '—'}) ले मन, भावना र सुरक्षाको लय देखाउँछ। Sun Sign (${chart.sunSign || sun?.sign || '—'}) ले आत्मविश्वास र “म को हुँ” भन्ने गर्मी देखाउँछ।`,
      moon?.nakshatra
        ? `Moon nakshatra ${moon.nakshatra}${moon.nakshatraPada ? `, pada ${moon.nakshatraPada}` : ''} — यो मनको सूक्ष्म स्वाद हो, sign भन्दा finer texture.`
        : '',
      chart.timeInputMode === 'unknown_assumed_noon'
        ? 'जन्म समय अनुमानित राखिएको छ। Lagna र house-आधारित वाक्यहरूलाई working hypothesis का रूपमा पढ्नुहोस्।'
        : 'जन्म समय दिएको विवरण अनुसार प्रयोग गरिएको छ। महत्वपूर्ण निर्णयमा नागरिक रेकर्डसँग मिलान गर्नु राम्रो हुन्छ।'
    ].filter(Boolean),
    boxes: [
      { label: 'LAGNA', text: lagna },
      { label: 'MOON', text: `${chart.moonSign || moon?.sign || '—'} · H${moon?.house || '—'}` },
      { label: 'SUN', text: `${chart.sunSign || sun?.sign || '—'} · H${sun?.house || '—'}` }
    ]
  }));

  pages.push(page({
    kicker: 'TRUST  ·  METHOD',
    title: 'तपाईंको Kundali कसरी तयार भयो?',
    paragraphs: [
      'यो report तपाईंले उपलब्ध गराउनुभएको जन्म विवरणका आधारमा तयार गरिएको personalized interpretation हो।'
    ],
    bullets: [
      '01 — जन्म विवरण: जन्ममिति + समय + जन्मस्थान',
      '02 — Planetary position: Swiss Ephemeris मा आधारित astronomical data',
      '03 — Lahiri ayanamsa: sidereal (Vedic) calculation',
      '04 — Whole-sign houses: Lagna sign बाट 12 भाव',
      '05 — Interpretation: graha × house × nakshatra × dasha — तपाईंको chart मा मात्र लागू हुने reading'
    ]
  }));

  pages.push(page({
    kicker: 'THE WOW PAGE',
    title: 'तपाईंको व्यक्तित्वको मूल स्वरूप',
    paragraphs: [
      `${lagna} Lagna का कारण तपाईंमा ${SIGN_MEANINGS[lagna] || 'a distinct outer style'} को प्रभाव देखिन्छ। बाहिरबाट मानिसले प्रायः यही “पहिलो छाप” पाउँछन्।`,
      moon
        ? `तर ${moon.sign} Moon (house ${moon.house}) ले तपाईंको भित्री emotional world लाई ${SIGN_MEANINGS[moon.sign] || 'private and textured'} बनाउँछ। ${lineOf(moon)}`
        : '',
      sun
        ? `Sun ${sun.sign}, house ${sun.house} ले तपाईं कसरी आफ्नो नाममा उभिन खोज्नुहुन्छ भन्ने गर्मी दिन्छ। ${lineOf(sun)}`
        : '',
      `बाहिरबाट तपाईं ${SIGN_MEANINGS[lagna] || 'adaptive'} देखिन सक्नुहुन्छ, तर भित्रका निर्णय र भावनाहरूलाई तपाईं ${moon?.sign === 'Scorpio' || [4, 8, 12].includes(Number(moon?.house)) ? 'लामो समयसम्म process गर्ने' : 'आफ्नै लयमा मिलाउने'} tendency राख्न सक्नुहुन्छ।`,
      'यो पृष्ठ “तपाईं कस्तो ग्रह हुनुहुन्छ” होइन — “तपाईं कसरी जीवनमा देखा पर्नुहुन्छ” हो।'
    ].filter(Boolean),
    boxes: [
      { label: 'YOUR STRENGTH', text: strengthOf(sun || moon || {}) },
      { label: 'WATCH FOR', text: challengeOf(moon || sun || {}) },
      { label: 'CURRENT FOCUS', text: currentDashaLabel(d) }
    ]
  }));

  pages.push(page({
    kicker: '🌙  MOON',
    title: 'तपाईंको मन र भावनात्मक संसार',
    paragraphs: moon
      ? [
          `Where it is: ${moon.sign}, house ${moon.house}${moon.nakshatra ? `, ${moon.nakshatra}` : ''}${moon.nakshatraPada ? ` pada ${moon.nakshatraPada}` : ''}.`,
          `Emotional nature: Moon ${HOUSE_MEANINGS[moon.house] || 'this life area'} सँग जोडिएको छ। ${SIGN_MEANINGS[moon.sign]}.`,
          lineOf(moon),
          `Relationship with stress: house ${moon.house} सक्रिय हुँदा मनले ${HOUSE_MEANINGS[moon.house]} लाई बढी महसुस गर्छ। बाहिर शान्त देखिए पनि भित्र कुरा लामो समयसम्म रहन सक्छ।`,
          'What helps you recover: निद्रा, विश्वासको एउटा कुराकानी, र “आज के भयो” भन्ने सानो निजी नोट — Moon लाई नाटक होइन, regularity चाहिन्छ।'
        ]
      : ['Moon placement यो chart payload मा छैन।'],
    boxes: moon
      ? [
          { label: 'STRENGTH', text: strengthOf(moon) },
          { label: 'CHALLENGE', text: challengeOf(moon) },
          { label: 'NATURAL TENDENCY', text: 'Things may stay in your mind longer than you show outwardly.' }
        ]
      : []
  }));

  pages.push(page({
    kicker: '☀️  SUN',
    title: 'तपाईंको आत्मविश्वास र जीवनदिशा',
    paragraphs: sun
      ? [
          `Where it is: ${sun.sign}, house ${sun.house}${sun.nakshatra ? `, ${sun.nakshatra}` : ''}.`,
          `Identity: Sun ${sun.sign} ले तपाईंलाई ${SIGN_MEANINGS[sun.sign]} शैलीमा “म” भन्न सिकाउँछ। House ${sun.house} (${HOUSE_LIFE[sun.house]}) त्यो गर्मी कहाँ खर्च हुन्छ भन्ने ठाउँ हो।`,
          `Confidence / leadership / visibility: ${lineOf(sun) || PLANET_MEANINGS.Sun.theme}`,
          `Growth challenge: ${challengeOf(sun)} — Sun लाई अरूको approval होइन, आफ्नै सानो दैनिक साहस चाहिन्छ।`
        ]
      : ['Sun placement यो chart मा छैन।'],
    boxes: sun
      ? [
          { label: 'IDENTITY', text: `${sun.sign} · House ${sun.house}` },
          { label: 'STRENGTH', text: strengthOf(sun) },
          { label: 'GROWTH CHALLENGE', text: challengeOf(sun) }
        ]
      : []
  }));

  const grahaOrder = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  grahaOrder.forEach((gName) => {
    const p = planetByName(chart, gName);
    if (!p) return;
    const base = PLANET_MEANINGS[gName] || {};
    pages.push(page({
      kicker: `${GRAHA_GLYPH[gName] || ''}  ${gName.toUpperCase()}`,
      title: `${gName} — तपाईंको जीवनमा यसको भूमिका`,
      paragraphs: [
        `Where it is: ${p.sign} · House ${p.house}${p.nakshatra ? ` · ${p.nakshatra}` : ''}${p.nakshatraPada ? ` pada ${p.nakshatraPada}` : ''}${p.retrograde ? ' · retrograde' : ''}.`,
        `What it represents: ${base.theme || gName}. ${base.psychological || ''}`,
        `What it means for you: House ${p.house} (${HOUSE_LIFE[p.house] || HOUSE_MEANINGS[p.house]}) ले यो graha लाई ${HOUSE_MEANINGS[p.house]} को मैदानमा राख्छ। ${SIGN_MEANINGS[p.sign] || ''}`,
        lineOf(p),
        `How this may show in life: जब ${gName} को dasha वा transit चल्छ, ${HOUSE_LIFE[p.house]} सम्बन्धी कुराहरू बढी चर्को हुन सक्छन् — निश्चित घटना होइन, दोहोरिने मैदान।`
      ].filter(Boolean),
      boxes: [
        { label: 'YOUR STRENGTH', text: strengthOf(p) },
        { label: 'WATCH FOR', text: challengeOf(p) },
        { label: 'LIFE AREA', text: HOUSE_LIFE[p.house] || `House ${p.house}` }
      ]
    }));
  });

  const houseRows = Object.entries(HOUSE_LIFE).map(([h, area]) => {
    const occ = occupants(chart, h);
    const sign = houseSign(chart, h) || '—';
    const lord = SIGN_LORD[sign] || '—';
    const summary = occ.length
      ? occ.map((p) => p.name).join(', ')
      : `Lord ${lord} (empty house — lord & dasha speak louder)`;
    return [h, area, `${sign}`, summary];
  });

  pages.push(page({
    kicker: 'TWELVE BHAVAS',
    title: 'तपाईंका 12 Houses',
    paragraphs: [
      'प्रत्येक भाव एउटा जीवनको कोठा हो। खाली घर भनेको जीवन छुट्यो भन्ने होइन — त्यो कोठा house-lord र dasha ले चलाउँछ।'
    ],
    table: {
      headers: ['House', 'Life area', 'Sign', 'In your chart'],
      rows: houseRows
    }
  }));

  const h2 = occupants(chart, 2);
  const h11 = occupants(chart, 11);
  pages.push(page({
    kicker: '💰  DHANA',
    title: 'धन र आर्थिक अवस्था',
    paragraphs: [
      'यो पृष्ठ “तपाईं धनी हुनुहुन्छ/हुनुहुन्न” भन्ने blunt prediction होइन। Pattern + timing हो।',
      `2nd house (${houseSign(chart, 2) || '—'}, ${HOUSE_MEANINGS[2]}): ${h2.length ? h2.map((p) => `${p.name} in ${p.sign}`).join('; ') : `occupants छैनन्; lord ${SIGN_LORD[houseSign(chart, 2)] || '—'} ले बोल्छ।`}`,
      `11th house (${houseSign(chart, 11) || '—'}, ${HOUSE_MEANINGS[11]}): ${h11.length ? h11.map((p) => `${p.name} in ${p.sign}`).join('; ') : `occupants छैनन्; lord ${SIGN_LORD[houseSign(chart, 11)] || '—'}।`}`,
      jupiter ? `Jupiter ${jupiter.sign} H${jupiter.house} — expansion, guidance, and how you trust growth. ${lineOf(jupiter)}` : '',
      venus ? `Venus ${venus.sign} H${venus.house} — value, taste, and what you are willing to pay for peace. ${lineOf(venus)}` : '',
      mercury ? `Mercury ${mercury.sign} H${mercury.house} — trade, skill, and the money that comes through words or craft. ${lineOf(mercury)}` : '',
      `Current period (${currentDashaLabel(d)}) ले पैसाको कथामा कुन graha को classroom चलिरहेको छ भन्ने बताउँछ — नतिजा होइन, जोड।`,
      'Practical guidance: आय र खर्चको एउटा साप्ताहिक रिवाज, र 11th-house themes (network, skill, product) मा सानो लगातार प्रयास।'
    ].filter(Boolean),
    boxes: [
      { label: 'आर्थिक बल', text: h11.length || h2.length ? 'Activated 2nd/11th — money themes are personal, not generic.' : 'Money speaks more through lords and dasha than through packed houses.' },
      { label: 'चुनौती', text: challengeOf(saturn || mercury || {}) },
      { label: 'कुन समयमा बढी focus?', text: currentDashaLabel(d) }
    ]
  }));

  const tenthOcc = occupants(chart, 10);
  const careerMeter = chart?.careerWealth?.meters?.careerPoints;
  pages.push(page({
    kicker: '💼  CAREER & BUSINESS',
    title: 'Career & Business',
    paragraphs: [
      `Astrological emphasis: ${starsFromScore((Number(careerMeter) || 60) / 20)}  — chart-derived emphasis, destiny score होइन।`,
      `10th house ${houseSign(chart, 10) || ''} (${HOUSE_MEANINGS[10]}): ${tenthOcc.length ? tenthOcc.map((p) => `${p.name} — ${lineOf(p) || p.sign}`).join(' ') : `Empty 10th. Lord ${SIGN_LORD[houseSign(chart, 10)] || '—'} कहाँ बस्छ भन्ने कुराले पेशा बोल्छ।`}`,
      saturn ? `Saturn ${saturn.sign} H${saturn.house}: ${lineOf(saturn) || 'duty, delay, and durable authority.'} Suitable work often rewards patience more than spectacle.` : '',
      `Natural strengths: ${[strengthOf(saturn || {}), strengthOf(mercury || {}), strengthOf(sun || {})].filter(Boolean).slice(0, 3).join('; ')}.`,
      'Business tendency: जब 3rd/7th/10th/11th का graha हरू dasha मा आउँछन्, skill, client, र reputation को कुरा चर्को हुन सक्छ।',
      `Major challenge: ${challengeOf(saturn || sun || {})}. Growth pattern: consistency compounds; visibility often lags effort.`,
      d.timeline.slice(0, 4).map((row) => {
        const lord = row.planet || row.mahaLord || 'Graha';
        const start = row.startDateApprox || row.startDate || '';
        const end = row.endDateApprox || row.endDate || '';
        return `Career timing note — ${lord}: ${start} → ${end}. ${row.theme || 'See that graha’s chapter.'}`;
      }).join('\n')
    ].filter(Boolean),
    boxes: [
      { label: 'YOUR STRENGTH', text: strengthOf(saturn || sun || {}) },
      { label: 'WATCH FOR', text: challengeOf(saturn || mars || {}) },
      { label: 'CURRENT FOCUS', text: currentDashaLabel(d) }
    ]
  }));

  const h7 = occupants(chart, 7);
  const h7sign = houseSign(chart, 7);
  pages.push(page({
    kicker: '❤️  LOVE & MARRIAGE',
    title: 'Love & Marriage',
    paragraphs: [
      `Relationship nature: 7th house ${h7sign || ''} — ${HOUSE_MEANINGS[7]}. ${h7.length ? h7.map((p) => `${p.name} in ${p.sign}`).join('; ') : `Occupants छैनन्; 7th lord ${SIGN_LORD[h7sign] || '—'} ले साझेदारको कथा बोल्छ।`}`,
      venus ? `Venus ${venus.sign} H${venus.house}: तपाईंलाई कस्तो sweetness चाहिन्छ। ${lineOf(venus)}` : '',
      moon ? `Moon ${moon.sign} H${moon.house}: closeness मा मन कसरी सुरक्षित हुन्छ। ${lineOf(moon)}` : '',
      jupiter && Number(jupiter.house) === 7 ? `Jupiter in 7th: meaning and goodwill often enter through partnership — still a pattern, not a promise.` : '',
      'तपाईंलाई suit गर्न सक्ने partner: तपाईंको 7th sign र Venus/Moon को भाषा बुझ्ने व्यक्ति — नाटक होइन, emotional honesty र समय।',
      'Marriage tendency: 7th, Venus, Jupiter र सम्बन्धित dasha सक्रिय हुँदा सम्बन्धका कुरा चर्को हुन सक्छन्। “हुन्छ/हुन्न” होइन — कहिले यो मैदान तात्छ।',
      `Important periods: ${currentDashaLabel(d)} र Venus/Jupiter/7th-lord का antardasha हरूलाई सम्बन्धको classroom का रूपमा हेर्नुहोस्।`
    ].filter(Boolean),
    boxes: [
      { label: 'EMOTIONAL PATTERN', text: moon ? `${moon.sign} Moon · H${moon.house}` : 'See Moon chapter' },
      { label: 'VENUS', text: venus ? `${venus.sign} · H${venus.house}` : '—' },
      { label: '7TH HOUSE', text: h7sign || '—' }
    ]
  }));

  pages.push(page({
    kicker: '👨‍👩‍👧  FAMILY & HOME',
    title: 'Family & Home',
    paragraphs: [
      `4th house ${houseSign(chart, 4) || ''} — ${HOUSE_MEANINGS[4]}. Occupants: ${occupants(chart, 4).map((p) => p.name).join(', ') || 'none (lord speaks)'}.`,
      `2nd house ${houseSign(chart, 2) || ''} — family voice, food, values. Occupants: ${occupants(chart, 2).map((p) => p.name).join(', ') || 'none'}.`,
      mars && Number(mars.house) === 4 ? `Mars in 4th: घर र inner peace मा गर्मी/गति — protectiveness वा बेचैनी, दुवै सम्भव। ${lineOf(mars)}` : mars ? `Mars ${mars.sign} H${mars.house} ले परिवारको कथामा साहस वा द्वन्द्वको स्वाद छर्छ।` : '',
      'Emotional security: Moon र 4th लाई सँगै पढ्नुहोस्। घर शान्त भयो भने बाहिरी Lagna ले राम्रो काम गर्छ।',
      'Property tendency: 4th/11th/Mars/Saturn का dasha मा घर-जग्गाको कुरा चर्को हुन सक्छ — खरीदको आदेश होइन, ध्यानको मौसम।'
    ].filter(Boolean)
  }));

  pages.push(page({
    kicker: '🎓  BUDDHI',
    title: 'Education & Intelligence',
    paragraphs: [
      `Learning style: Mercury ${mercury ? `${mercury.sign} H${mercury.house}` : '—'} — ${mercury ? SIGN_MEANINGS[mercury.sign] : 'the mind’s tool'}.`,
      `5th house (intelligence, craft): ${houseSign(chart, 5) || '—'} · ${occupants(chart, 5).map((p) => p.name).join(', ') || 'lord-led'}.`,
      `9th house (teachers, higher learning): ${houseSign(chart, 9) || '—'} · ${occupants(chart, 9).map((p) => p.name).join(', ') || 'lord-led'}.`,
      jupiter ? `Jupiter ${jupiter.sign} H${jupiter.house}: ${lineOf(jupiter) || 'meaning, study, and goodwill.'}` : '',
      'Challenges: Mercury/Moon stress मा overthinking; Saturn/6th मा “पुगेन” लाग्ने अध्ययन। Skill development: एउटा शिल्प 90 दिन — 5th र 3rd को भाषा।'
    ].filter(Boolean)
  }));

  pages.push(page({
    kicker: '✈️  FOREIGN THEMES',
    title: 'Foreign travel / foreign environments',
    paragraphs: [
      'तपाईं विदेश जानुहुन्छ भन्ने निश्चित वाक्य यो report मा छैन।',
      `Your chart shows themes traditionally associated with foreign travel/foreign environments. 9th house ${houseSign(chart, 9) || ''} (${occupants(chart, 9).map((p) => p.name).join(', ') || 'lord-led'}); 12th house ${houseSign(chart, 12) || ''} (${occupants(chart, 12).map((p) => p.name).join(', ') || 'lord-led'}).`,
      rahu ? `Rahu ${rahu.sign} H${rahu.house}: hunger for the unfamiliar. ${lineOf(rahu)}` : '',
      ketu ? `Ketu ${ketu.sign} H${ketu.house}: release, distance, or a second home of the spirit. ${lineOf(ketu)}` : '',
      `Timing depends on the interaction of relevant houses and dasha periods — especially ${currentDashaLabel(d)}, plus Rahu/Ketu/9th/12th lords.`
    ].filter(Boolean)
  }));

  pages.push(page({
    kicker: '🪐  YOGAS',
    title: 'Yogas & special combinations',
    paragraphs: yogas.length
      ? yogas.slice(0, 8).flatMap((y) => [
          `${y.name || 'Yoga'} — strength: ${y.strength || 'noted'}.`,
          `What it traditionally indicates: ${y.interpretation || 'A named combination is present.'}`,
          Array.isArray(y.evidence) && y.evidence.length ? `Evidence in your chart: ${y.evidence.join('; ')}.` : '',
          y.caution ? `Important caution: ${y.caution}` : 'Named yogas are heuristics, not a life-changing headline. Read them next to the graha and house pages.'
        ]).filter(Boolean)
      : [
          'Named yoga list यो payload मा छैन। Graha–house reading नै backbone हो। Sensational “महायोग!” भाषा प्रयोग गरिएको छैन — transparency राखिएको छ।'
        ]
  }));

  const topAspects = aspects
    .slice()
    .sort((a, b) => Number(a.orb || 9) - Number(b.orb || 9))
    .filter((a) => ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].includes(a.planetA))
    .slice(0, 6);

  pages.push(page({
    kicker: '🔗  ASPECTS',
    title: 'Planetary relationships that matter',
    paragraphs: topAspects.length
      ? topAspects.map((a) => {
          const meaning =
            a.aspectType === 'conjunction'
              ? 'एउटै कोठामा काम गर्छन्'
              : a.aspectType === 'opposition'
                ? 'टेबल पारि कुरा गर्छन्'
                : a.aspectType === 'square'
                  ? 'काम गराउने तनाव'
                  : a.aspectType === 'trine'
                    ? 'सहयोगको स्वाद'
                    : a.aspectType;
          return `${a.planetA} ↔ ${a.planetB} (${a.aspectType}, orb ${Number(a.orb || 0).toFixed(1)}°) — ${meaning}. यी दुई अध्याय सँगै पढ्नुहोस्।`;
        })
      : ['Major aspect list thin छ। Occupancy र drishti नै मुख्य सम्बन्ध भाषा हो।'],
    bullets: ['Conjunction = sharing a room', 'Opposition = a conversation across a table', 'Square = work', 'Trine = support']
  }));

  const maha = d.current?.planet || d.snapshot?.mahaDasha || '—';
  const antar = d.antar?.antarLord || d.snapshot?.antarDasha || '—';
  pages.push(page({
    kicker: '⏳  DASHA',
    title: 'तपाईंको Dasha',
    paragraphs: [
      `अहिले: ${currentDashaLabel(d)}`,
      d.current?.startDateApprox || d.current?.endDateApprox
        ? `Mahadasha ${maha}: ${d.current?.startDateApprox || ''} → ${d.current?.endDateApprox || ''}.`
        : '',
      d.antar?.startDateApprox ? `Antardasha ${antar}: ${d.antar.startDateApprox} → ${d.antar.endDateApprox || '…'}.` : '',
      d.current?.theme ? `Main themes: ${d.current.theme}` : `Main themes follow ${maha}: see that graha’s page.`,
      d.current?.likelyFocus ? `Likely focus: ${d.current.likelyFocus}` : '',
      d.current?.caution ? `Caution: ${d.current.caution}` : '',
      'Dasha भनेको कुन graha को classroom मा बसिरहनुभएको छ। Free will हट्दैन।'
    ].filter(Boolean),
    bullets: d.timeline.slice(0, 9).map((row) => {
      const lord = row.planet || row.mahaLord || 'Graha';
      return `${lord}  ·  ${row.startDateApprox || row.startDate || ''} → ${row.endDateApprox || row.endDate || ''}`;
    })
  }));

  pages.push(page({
    kicker: '🔮  NEAR HORIZON',
    title: '2026–2028 · current period',
    paragraphs: [
      `यो ${currentDashaLabel(d)} को नजिकको तेस्रो। Certainty language होइन: may, likely themes, traditionally associated.`,
      '2026 — What to focus on: skill, agreements, and the graha of your current antardasha. Communication and craft often pay more than drama.',
      '2027 — What may become important: the same classroom, with results more visible if 2026 मा आधार राखियो। Relationships and work may ask for clearer terms.',
      '2028 — What transition may emerge: antardasha change वा mahadasha को पछिल्लो तेस्रो — नयाँ विषय होइन, जोड सर्ने मौसम।',
      antar && antar !== '—' ? `Especially watch ${antar}’s house (${planetByName(chart, antar)?.house || '—'}): ${HOUSE_LIFE[planetByName(chart, antar)?.house] || 'that life area'}.` : ''
    ].filter(Boolean)
  }));

  pages.push(page({
    kicker: '🔮  BROADER ARC',
    title: '2028–2031 · broader direction',
    paragraphs: [
      maha && maha !== '—'
        ? `${maha} mahadasha को बाँकी वर्षहरूमा ${PLANET_MEANINGS[maha]?.theme || 'that graha’s themes'} दोहोरिन सक्छन्।`
        : 'Mahadasha lord यो payload मा स्पष्ट छैन; graha chapters नै timing को pallette हुन्।',
      'अबको केही वर्षको broader direction: जुन house मा mahadasha lord बस्छ, त्यही life area मा पटक-पटक फर्कनु।',
      planetByName(chart, maha)
        ? `${maha} is in ${planetByName(chart, maha).sign}, house ${planetByName(chart, maha).house} (${HOUSE_LIFE[planetByName(chart, maha).house]}). That is the longer classroom.`
        : '',
      'यो भविष्यको स्क्रिप्ट होइन — ध्यानको नक्सा हो।'
    ].filter(Boolean)
  }));

  const phases = Array.isArray(chart?.lifePhases) ? chart.lifePhases : [];
  pages.push(page({
    kicker: '📜  LIFE PHASES',
    title: 'Childhood · early adulthood · now',
    paragraphs: phases.length
      ? phases.flatMap((ph) => [
          `${ph.title || ph.phase || ''} (${ph.ageRange || ''})`,
          ...(Array.isArray(ph.paragraphs) ? ph.paragraphs.slice(0, 3) : [])
        ])
      : [
          `Childhood: Moon ${moon?.sign || ''} H${moon?.house || ''} — early safety and memory.`,
          `Early adulthood: Lagna ${lagna} र 10th-house effort — identity testing through work and peers.`,
          `Current phase: ${currentDashaLabel(d)}.`,
          'Next major transition: जब mahadasha वा प्रमुख antardasha बदलिन्छ — त्यो graha को पृष्ठ फेरि पढ्नुहोस्।'
        ]
  }));

  pages.push(page({
    kicker: '🌟  STRENGTHS',
    title: 'तपाईंका मुख्य strengths',
    bullets: [
      `${strengthOf(mercury || sun || {})} — Mercury/Sun evidence: ${mercury ? `${mercury.sign} H${mercury.house}` : sun ? `${sun.sign} H${sun.house}` : lagna + ' lagna'}.`,
      `Adaptability — ${lagna} Lagna (${SIGN_MEANINGS[lagna] || 'outer style'}).`,
      `Emotional depth — Moon ${moon?.sign || ''} H${moon?.house || ''}.`,
      saturn ? `Persistence — Saturn ${saturn.sign} H${saturn.house}. ${lineOf(saturn) || ''}` : 'Persistence — Saturn chapter.',
      jupiter ? `Meaning-seeking — Jupiter ${jupiter.sign} H${jupiter.house}.` : 'Judgment — Jupiter chapter.'
    ]
  }));

  pages.push(page({
    kicker: '⚠️  CHALLENGES',
    title: 'तपाईंका मुख्य challenges',
    paragraphs: ['डराउने भाषा होइन। Challenge → why → how to manage.'],
    bullets: [
      `${challengeOf(moon || {})} — Moon H${moon?.house || '—'}. Manage: shorter evenings, fewer open loops.`,
      `${challengeOf(saturn || {})} — Saturn H${saturn?.house || '—'}. Manage: one finished job over ten fantasies.`,
      `${challengeOf(mars || {})} — Mars H${mars?.house || '—'}. Manage: clean effort, not scattered fights.`,
      rahu ? `Restlessness — Rahu ${rahu.sign} H${rahu.house}. Manage: one unfamiliar skill, not ten tabs.` : 'Rahu: hunger for more — pick one frontier.',
      'Over-identification with work or image — Sun/10th. Manage: a life that still exists after the title.'
    ]
  }));

  pages.push(page({
    kicker: '🧘  UPAYA',
    title: 'Personalized remedies',
    paragraphs: [
      'Mantra/ritual optional हो। पहिले व्यवहार।'
    ],
    bullets: [
      '1. Discipline — Saturn को घर: एउटा दैनिक block (काम वा शरीर) जुन skip हुँदैन।',
      '2. Speech / communication awareness — Mercury/2nd: हप्तामा एकपटक “मैले के भनेँ” समीक्षा।',
      '3. Study / skill development — Jupiter/5th/3rd: 90-दिनको एउटा शिल्प।',
      saturn ? `Saturn note: ${lineOf(saturn) || 'patience is the remedy that looks boring and works.'}` : '',
      moon ? `Moon note: recover before you perform.` : ''
    ].filter(Boolean)
  }));

  pages.push(page({
    kicker: '📊  SNAPSHOT',
    title: 'Your Kundali snapshot',
    paragraphs: [
      'यी पट्टिहरू astrological emphasis हुन् — success probability वा वैज्ञानिक भविष्यवाणी होइनन्।'
    ],
    meters: [
      { label: 'Personality', value: meterFromHouse(chart, [1], ['Sun', 'Moon']) },
      { label: 'Career', value: meterFromHouse(chart, [10, 6], ['Saturn', 'Sun']) },
      { label: 'Finance', value: meterFromHouse(chart, [2, 11], ['Jupiter', 'Venus', 'Mercury']) },
      { label: 'Relationships', value: meterFromHouse(chart, [7, 5], ['Venus', 'Moon', 'Jupiter']) },
      { label: 'Learning', value: meterFromHouse(chart, [5, 9, 4], ['Mercury', 'Jupiter']) }
    ]
  }));

  pages.push(page({
    kicker: '🎯  SYNTHESIS',
    title: 'Your key life themes',
    paragraphs: [
      'तपाईंको chart मा तीन मुख्य themes बारम्बार देखिन्छन्।'
    ],
    bullets: [
      `01 — Communication & craft — ${lagna} Lagna / Mercury ${mercury ? `${mercury.sign} H${mercury.house}` : ''}. Evidence: 2nd/3rd/10th occupancy र dasha ${currentDashaLabel(d)}.`,
      `02 — Discipline & career — Saturn ${saturn ? `${saturn.sign} H${saturn.house}` : ''} र 10th house ${houseSign(chart, 10) || ''}.`,
      `03 — Deep emotional processing — Moon ${moon?.sign || ''} H${moon?.house || ''}. Inner life is not the same as the outer Gemini-or-lagna costume.`
    ]
  }));

  pages.push(page({
    kicker: 'ONE PAGE',
    title: 'तपाईंको Kundali — संक्षेपमा',
    paragraphs: [
      `Lagna: ${lagna}   ·   Moon: ${chart.moonSign || moon?.sign || '—'}   ·   Sun: ${chart.sunSign || sun?.sign || '—'}`,
      `Personality: ${SIGN_MEANINGS[lagna] || ''} outside; ${SIGN_MEANINGS[moon?.sign] || ''} inside.`,
      `Career: House 10 ${houseSign(chart, 10) || ''} · ${tenthOcc.map((p) => p.name).join(', ') || SIGN_LORD[houseSign(chart, 10)] || 'lord-led'}.`,
      `Wealth: 2nd ${houseSign(chart, 2) || ''} · 11th ${houseSign(chart, 11) || ''}.`,
      `Love: 7th ${h7sign || ''} · Venus ${venus ? `${venus.sign} H${venus.house}` : '—'}.`,
      `Current period: ${currentDashaLabel(d)}.`,
      `Key advice: ${maha && maha !== '—' ? maha + ' classroom मा रहनुहोस् — ' : ''}${HOUSE_LIFE[planetByName(chart, maha)?.house] || 'the house of the dasha lord'} मा सानो लगातार काम।`
    ]
  }));

  pages.push(page({
    kicker: 'REFLECTION',
    title: 'What may resonate with you?',
    paragraphs: [
      'यो report मा उल्लेख गरिएका patterns तपाईंको वास्तविक जीवनसँग कति मेल खान्छन्?',
      'आफ्नो अनुभवसँग तुलना गर्नुहोस्। मिल्यो भने त्यो पृष्ठ फेरि पढ्नुहोस्। मिलेन भने जन्म समय र ठाउँ जाँच गर्नुहोस् — chart गलत होइन, input संवेदनशील हुन सक्छ।'
    ],
    bullets: [
      'तपाईंको career journey',
      'पैसा सम्बन्धी pattern',
      'relationship experiences',
      'decision-making',
      'emotional tendencies',
      'major life changes'
    ]
  }));

  pages.push(page({
    kicker: 'CLOSING',
    title: 'तपाईंको यात्रा यहींबाट सुरु हुन्छ।',
    paragraphs: [
      'कुण्डलीले सम्भावनाका pattern देखाउँछ; तपाईंले त्यसलाई कसरी प्रयोग गर्नुहुन्छ भन्ने कुरा तपाईंको निर्णयमा निर्भर हुन्छ।',
      'Your chart. Your patterns. Your choices.',
      'महत्त्वपूर्ण जानकारी: यो report तपाईंले उपलब्ध गराउनुभएको जन्ममिति, जन्मसमय र जन्मस्थानमा आधारित वैदिक ज्योतिषीय व्याख्या हो। ग्रहस्थितिको गणनाका लागि Swiss Ephemeris तथा Lahiri ayanamsa मा आधारित calculation methodology प्रयोग गरिएको छ।',
      'ज्योतिषीय फलादेशलाई निश्चित वा १००% सुनिश्चित भविष्यवाणीका रूपमा लिनु हुँदैन। जन्म विवरणको शुद्धता, गणना पद्धति र व्याख्याको आधारमा केही परिणाम फरक पर्न सक्छन्।',
      'यस report लाई आत्मचिन्तन तथा ज्योतिषीय मार्गदर्शनको रूपमा लिनुहोस्। चिकित्सा, कानुनी वा महत्वपूर्ण आर्थिक निर्णयका लागि सम्बन्धित योग्य पेशेवरको सल्लाह लिनुहोस्।'
    ]
  }));

  return pages;
}

module.exports = {
  buildMahabhavishyaPages,
  planetByName,
  buildReportSections: (chart) => buildMahabhavishyaPages(chart).filter((p) => p.kind !== 'cover')
};
