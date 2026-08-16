const {
  HOUSE_MEANINGS,
  PLANET_MEANINGS,
  SIGN_MEANINGS
} = require('../interpretationService');

const SIGN_LORD = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter'
};

const HOUSE_NP = {
  1: 'आफ्नो स्वरूप र पहिचान',
  2: 'धन, वाणी र परिवारका मूल्य',
  3: 'सीप, साहस र प्रयास',
  4: 'घर र आन्तरिक शान्ति',
  5: 'बुद्धि, सिर्जना र रोमान्स',
  6: 'सेवा, प्रतिस्पर्धा र दैनिक दबाब',
  7: 'साझेदारी र विवाह',
  8: 'रूपान्तरण र गहिराइ',
  9: 'भाग्य, गुरु र उच्च शिक्षा',
  10: 'करियर र सार्वजनिक भूमिका',
  11: 'आय, सञ्जाल र लाभ',
  12: 'विदेश, एकान्त र त्याग'
};

function pBy(chart, name) {
  return (chart?.planets || []).find((x) => x?.name === name) || null;
}
function occ(chart, h) {
  return (chart?.planets || []).filter((x) => Number(x.house) === Number(h));
}
function hSign(chart, h) {
  const c = (chart?.houseCusps || []).find((x) => Number(x.house) === Number(h));
  if (c?.sign) return c.sign;
  const signs = Object.keys(SIGN_LORD);
  const i = signs.indexOf(chart?.ascendant);
  if (i < 0) return null;
  return signs[(i + Number(h) - 1) % 12];
}
function dasha(chart) {
  const b = chart?.astroBrain || {};
  return {
    current: b.currentDasha || null,
    antar: b.currentAntardasha || null,
    timeline: Array.isArray(b.vimshottariTimeline) ? b.vimshottariTimeline : [],
    snapshot: chart?.dashaSnapshot || null,
    summary: b.summary || {}
  };
}
function periodLabel(d) {
  const m = d.current?.planet || d.snapshot?.mahaDasha || d.summary?.currentMahadashaPlanet;
  const a = d.antar?.antarLord || d.snapshot?.antarDasha || d.summary?.currentAntardashaLord;
  if (m && a) return `${m} / ${a}`;
  return m || 'वर्तमान दशा';
}
function when(chart) {
  const iso = chart?.localDateTime || chart?.birthDateAD;
  if (!iso) return { date: '—', time: '' };
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return { date: String(iso).slice(0, 10), time: '' };
  return {
    date: dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    time: /\dT\d/.test(String(iso)) ? dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''
  };
}
function place(chart) {
  return chart?.place || chart?.location?.displayName || 'दिइएको जन्मस्थान';
}
function line(pl) {
  return pl?.interpretation?.reportLine || '';
}
function pg(spec) {
  return { kicker: '', title: '', en: '', paragraphs: [], boxes: [], bullets: [], table: null, meters: [], basis: '', ...spec };
}

function buildMahabhavishyaPages(chart) {
  const moon = pBy(chart, 'Moon');
  const sun = pBy(chart, 'Sun');
  const mars = pBy(chart, 'Mars');
  const mercury = pBy(chart, 'Mercury');
  const jupiter = pBy(chart, 'Jupiter');
  const venus = pBy(chart, 'Venus');
  const saturn = pBy(chart, 'Saturn');
  const rahu = pBy(chart, 'Rahu');
  const ketu = pBy(chart, 'Ketu');
  const brain = chart?.astroBrain || {};
  const d = dasha(chart);
  const yogas = Array.isArray(brain.yogas) ? brain.yogas : [];
  const aspects = Array.isArray(brain.aspects) ? brain.aspects : [];
  const w = when(chart);
  const lagna = chart?.ascendant || '—';
  const name = chart?.name || 'तपाईं';
  const plabel = periodLabel(d);
  const pages = [];

  pages.push(pg({
    kind: 'cover',
    kicker: 'GRAHAPATH',
    title: 'तपाईंको महाभविष्यफल',
    subtitle: 'Personalized Vedic Astrology Report',
    name,
    date: w.date,
    time: w.time,
    place: place(chart)
  }));

  pages.push(pg({
    kicker: 'खण्ड ०१  ·  तपाईंलाई बुझ्ने',
    title: 'तपाईंको जन्मकुण्डली',
    en: 'Your birth chart',
    showWheel: true,
    paragraphs: [
      `यो चक्र ${name} को जन्म कुण्डली हो, ${place(chart)} का लागि गणना गरिएको। पहिलो भाव (Lagna) बाहिरी व्यक्तित्व हो; ग्रहहरू आफ्नो भावमा देखिन्छन्।`,
      `लग्न ${lagna} ले तपाईं कसरी अगाडि बढ्नुहुन्छ र संसारले तपाईंलाई पहिले कसरी देख्छ भन्ने संकेत गर्छ।`,
      `चन्द्र राशि ${chart.moonSign || moon?.sign || '—'} ले मन र भावनाको लय देखाउँछ। सूर्य राशि ${chart.sunSign || sun?.sign || '—'} ले आत्मविश्वास र “म को हुँ” भन्ने गर्मी देखाउँछ।`,
      moon?.nakshatra ? `चन्द्र नक्षत्र ${moon.nakshatra}${moon.nakshatraPada ? `, पद ${moon.nakshatraPada}` : ''} — मनको सूक्ष्म स्वाद।` : ''
    ].filter(Boolean),
    boxes: [
      { label: 'लग्न', text: lagna },
      { label: 'चन्द्र', text: `${chart.moonSign || moon?.sign || '—'} · भाव ${moon?.house || '—'}` },
      { label: 'सूर्य', text: `${chart.sunSign || sun?.sign || '—'} · भाव ${sun?.house || '—'}` }
    ]
  }));

  pages.push(pg({
    kicker: 'विश्वास',
    title: 'तपाईंको कुण्डली कसरी तयार भयो?',
    en: 'How this kundali was calculated',
    paragraphs: [
      'यो प्रतिवेदन तपाईंले दिनुभएको जन्ममिति, समय र स्थानका आधारमा तयार पारिएको व्यक्तिगत व्याख्या हो।'
    ],
    bullets: [
      '०१ जन्म विवरण — मिति, समय, स्थान',
      '०२ ग्रहस्थिति — Swiss Ephemeris का खगोलीय गणना',
      '०३ लाहिरी अयनांश — वैदिक (साइडरियल) पद्धति',
      '०४ पूर्ण-राशि भाव (whole-sign) — लग्न राशिबाट बाह्र भाव',
      '०५ व्याख्या — ग्रह × भाव × नक्षत्र × दशा, तपाईंको कुण्डलीमा मात्र'
    ]
  }));

  pages.push(pg({
    kicker: 'WOW PAGE',
    title: 'तपाईंको व्यक्तित्व',
    en: 'Who you appear to be — and who you are inside',
    paragraphs: [
      `${lagna} लग्नका कारण बाहिरबाट तपाईं ${SIGN_MEANINGS[lagna] || 'स्पष्ट शैलीका'} देखिन सक्नुहुन्छ। मानिसले प्रायः यही पहिलो छाप पाउँछन्।`,
      moon
        ? `तर ${moon.sign} चन्द्र (भाव ${moon.house}) ले भित्री संसार गहिरो र निजी बनाउँछ। बाहिर हल्का देखिए पनि भित्रका कुरा लामो समयसम्म रहन सक्छन्।`
        : '',
      sun
        ? `सूर्य ${sun.sign}, भाव ${sun.house} ले तपाईं आफ्नो नाममा कसरी उभिन खोज्नुहुन्छ भन्ने देखाउँछ।`
        : '',
      'यो पृष्ठ ग्रहको पाठ होइन — तपाईंको जीवनमा दोहोरिने स्वभाव हो।'
    ].filter(Boolean),
    boxes: [
      { label: 'तपाईंको बल', text: sun?.interpretation?.strength || 'स्पष्ट उपस्थिति र सिक्ने क्षमता' },
      { label: 'ध्यान दिनुहोस्', text: moon?.interpretation?.challenge || 'मनमा कुरा अड्किनु' },
      { label: 'अहिलेको समय', text: plabel }
    ],
    basis: `लग्न ${lagna}; सूर्य ${sun ? `${sun.sign} भाव ${sun.house}` : '—'}; चन्द्र ${moon ? `${moon.sign} भाव ${moon.house}` : '—'}`
  }));

  pages.push(pg({
    kicker: 'मन',
    title: 'मन र भावना',
    en: 'Your inner world',
    paragraphs: moon
      ? [
          `तपाईंको कुण्डलीले के संकेत गर्छ? चन्द्र ${moon.sign} मा, भाव ${moon.house} (${HOUSE_NP[moon.house]}) मा रहेकाले भावना र दैनिक जीवन एकअर्कासँग बाँधिएका छन्। मनले कुरा चाँडै छाड्दैन; गहिराइमा प्रशोधन गर्छ।`,
          'तनाव आउँदा बाहिर शान्त देखिनु र भित्र लामो विश्लेषण चल्नु दुवै सम्भव छ। निको हुन नाटक होइन, नियमित निद्रा र एउटा विश्वासको कुराकानी सहयोगी हुन्छ।'
        ]
      : ['चन्द्र स्थिति यो कुण्डलीमा उपलब्ध छैन।'],
    boxes: [
      { label: 'बल', text: moon?.interpretation?.strength || 'गहिरो अवलोकन' },
      { label: 'चुनौती', text: moon?.interpretation?.challenge || 'अत्यधिक सोच' },
      { label: 'अहिले', text: plabel }
    ],
    basis: moon ? `Moon in ${moon.sign}, house ${moon.house}${moon.nakshatra ? `, ${moon.nakshatra}` : ''}` : ''
  }));

  pages.push(pg({
    kicker: 'आत्मविश्वास',
    title: 'व्यक्तित्व र आत्मविश्वास',
    en: 'How you stand in the world',
    paragraphs: sun
      ? [
          `तपाईंको कुण्डलीले के संकेत गर्छ? सूर्य ${sun.sign}, भाव ${sun.house} (${HOUSE_NP[sun.house]}) मा रहेकाले पहिचान ${HOUSE_NP[sun.house]} को मैदानमा खर्च हुन्छ। आत्मविश्वास प्रदर्शनबाट भन्दा काम देखाएर बढ्ने संकेत देखिन्छ।`,
          'दृश्यता चाहिन्छ, तर लगातार प्रयासले मात्र गर्मी टिक्छ।'
        ]
      : ['सूर्य स्थिति उपलब्ध छैन।'],
    boxes: [
      { label: 'बल', text: sun?.interpretation?.strength || 'स्पष्टता' },
      { label: 'चुनौती', text: sun?.interpretation?.challenge || 'छरपस्ट ऊर्जा' },
      { label: 'सुझाव', text: 'साना दैनिक साहस, ठूला घोषणा होइन' }
    ],
    basis: sun ? `Sun in ${sun.sign}, house ${sun.house}${sun.nakshatra ? `, ${sun.nakshatra}` : ''}` : ''
  }));

  pages.push(pg({
    kicker: 'धन',
    title: 'धन तथा आर्थिक अवस्था',
    en: 'Money patterns — not a yes/no fortune',
    paragraphs: [
      `तपाईंको कुण्डलीले के संकेत गर्छ? दोस्रो भाव (${hSign(chart, 2) || '—'}) वाणी र बचतसँग जोडिएको छ; एघारौं भाव (${hSign(chart, 11) || '—'}) आय र सञ्जालसँग। ${occ(chart, 2).length || occ(chart, 11).length ? 'यी भावमा ग्रह सक्रिय भएकाले पैसाको कथा सामान्य टेम्प्लेट होइन, व्यक्तिगत छ।' : 'यी भाव खाली देखिए पनि भावेश र दशाले पैसाको कथा चलाउँछन्।'}`,
      mercury ? `बुध ${mercury.sign} भाव ${mercury.house} — सीप, कुराकानी वा व्यापारबाट आउने आयको संकेत।` : '',
      venus ? `शुक्र ${venus.sign} भाव ${venus.house} — के मा मूल्य राख्नुहुन्छ र कहाँ खर्च शान्त हुन्छ।` : '',
      jupiter ? `गुरु ${jupiter.sign} भाव ${jupiter.house} — बढोत्तरीमा विश्वास र सिकाइबाट फैलिने स्रोत।` : '',
      `अहिले ${plabel} चलिरहेकोले आय–सीप–सञ्जालतिर ध्यान बढी जान सक्छ। “धनी हुनुहुन्छ” भन्ने वाक्य होइन; पैसा आउने माध्यम र बचतको बानी हेर्ने पृष्ठ हो।`
    ].filter(Boolean),
    boxes: [
      { label: 'सम्भावित माध्यम', text: 'सीप, सञ्जाल, वाणी/व्यापार' },
      { label: 'चुनौती', text: saturn?.interpretation?.challenge || 'ढिलो देखिने प्रतिफल' },
      { label: 'अहिलेको फोकस', text: plabel }
    ],
    basis: `2nd ${hSign(chart, 2)} (${occ(chart, 2).map((p) => p.name).join(', ') || 'lord-led'}); 11th ${hSign(chart, 11)} (${occ(chart, 11).map((p) => p.name).join(', ') || 'lord-led'})`
  }));

  const tenth = occ(chart, 10);
  pages.push(pg({
    kicker: 'करियर',
    title: 'करियर तथा व्यवसाय',
    en: 'Career & Business',
    paragraphs: [
      'तपाईंको करियर ढाँचा: स्थिर वृद्धि → जिम्मेवारी → पहिचान।',
      saturn && Number(saturn.house) === 10
        ? 'दशम भावमा शनि रहेकाले छिटो नतिजाभन्दा निरन्तर प्रयासबाट स्थायी उपलब्धि बन्ने संकेत देखिन्छ। पहिचान प्रायः काम पछि आउँछ, अघि होइन।'
        : `दशम भाव ${hSign(chart, 10) || ''} — ${HOUSE_NP[10]}। ${tenth.length ? tenth.map((p) => p.name).join(', ') + ' सक्रिय छन्।' : `भावेश ${SIGN_LORD[hSign(chart, 10)] || '—'} ले पेशा बोल्छ।`}`,
      'काम गर्ने वातावरण: धैर्य र शिल्प कदर हुने ठाउँ। तमाशाभन्दा जिम्मेवारी।'
    ].filter(Boolean),
    bullets: [
      'बलिया पक्ष: सञ्चार, विश्लेषण, लगन, नेतृत्वको सम्भावना',
      'चुनौती: पहिचान ढिलो आउनु, करियर दबाब, असफलताको डर',
      `अहिलेको समय: ${plabel}`,
      'आगामी फोकस: एउटा शिल्प गहिरो बनाउने, दस ठाउँमा देखिने होइन'
    ],
    boxes: [
      { label: 'ढाँचा', text: 'Steady growth → responsibility → recognition' },
      { label: 'चुनौती', text: 'ढिलो पहिचान / दबाब' },
      { label: 'अहिले', text: plabel }
    ],
    basis: `10th ${hSign(chart, 10)}; Saturn ${saturn ? `${saturn.sign} H${saturn.house}` : '—'}`
  }));

  pages.push(pg({
    kicker: 'प्रेम',
    title: 'प्रेम तथा विवाह',
    en: 'Love & Marriage',
    paragraphs: [
      `तपाईंको सम्बन्ध स्वभाव: सप्तम भाव ${hSign(chart, 7) || ''} — ${HOUSE_NP[7]}। ${occ(chart, 7).length ? occ(chart, 7).map((p) => p.name).join(', ') + ' यस भावमा छन्।' : `सप्तमेश ${SIGN_LORD[hSign(chart, 7)] || '—'} ले साझेदारको कथा बोल्छ।`}`,
      venus ? `तपाईं कस्तो साझेदार खोज्नुहुन्छ: शुक्र ${venus.sign} भाव ${venus.house} — आत्मीयता, स्वाद र शान्ति कस्तो चाहिन्छ भन्ने संकेत।` : '',
      moon ? `भावनात्मक ढाँचा: चन्द्र ${moon.sign} भाव ${moon.house} — नजिकिँदा मन कसरी सुरक्षित हुन्छ।` : '',
      'बल: गहिराइ र निष्ठा। चुनौती: कुरा मनमै राख्नु, वा अपेक्षा स्पष्ट नगर्नु।',
      `विवाह/सम्बन्धका timing windows: शुक्र, गुरु, सप्तमेश र ${plabel} सक्रिय हुँदा सम्बन्धको मैदान तात्न सक्छ — “हुन्छ/हुन्न” होइन।`,
      'ध्यान दिनुहोस्: स्पष्ट कुराकानी र समय — नाटक होइन।'
    ].filter(Boolean),
    boxes: [
      { label: 'स्वभाव', text: 'गहिरो, निजी, अर्थ खोज्ने' },
      { label: 'बल', text: 'निष्ठा / भावनात्मक गहिराइ' },
      { label: 'timing', text: plabel }
    ],
    basis: `7th ${hSign(chart, 7)}; Venus ${venus ? `${venus.sign} H${venus.house}` : '—'}; Moon ${moon ? `${moon.sign} H${moon.house}` : '—'}`
  }));

  pages.push(pg({
    kicker: 'परिवार',
    title: 'परिवार तथा घर',
    en: 'Family & Home',
    paragraphs: [
      `चतुर्थ भाव ${hSign(chart, 4) || ''} घर र आन्तरिक शान्ति हो। ${occ(chart, 4).map((p) => p.name).join(', ') || 'ग्रह छैनन् — भावेश बोल्छन्।'}`,
      mars && Number(mars.house) === 4
        ? 'चतुर्थमा मङ्गल: घरमा गर्मी वा सुरक्षाको तीव्रता — शान्ति अभ्यासले सन्तुलन मिल्छ।'
        : '',
      'भावनात्मक सुरक्षा चन्द्र र चतुर्थसँग जोडिएको छ। घर शान्त भयो भने बाहिरी लग्नले राम्रो काम गर्छ।'
    ].filter(Boolean),
    basis: `4th ${hSign(chart, 4)}; 2nd ${hSign(chart, 2)}; Mars ${mars ? `${mars.sign} H${mars.house}` : '—'}`
  }));

  pages.push(pg({
    kicker: 'शिक्षा',
    title: 'शिक्षा तथा बुद्धि',
    en: 'Education & Intelligence',
    paragraphs: [
      `सिक्ने शैली: बुध ${mercury ? `${mercury.sign} भाव ${mercury.house}` : '—'} — कुरा बुझेर, जोडेर, प्रयोग गरेर।`,
      `पञ्चम (बुद्धि/शिल्प) ${hSign(chart, 5) || '—'}; नवम (गुरु/उच्च शिक्षा) ${hSign(chart, 9) || '—'}।`,
      jupiter ? `गुरु ${jupiter.sign} भाव ${jupiter.house} — अर्थ, नैतिकता र लामो सिकाइ।` : '',
      'सुझाव: ९० दिनको एउटा शिल्प — धेरै कोर्स होइन।'
    ].filter(Boolean),
    basis: `Mercury ${mercury ? `${mercury.sign} H${mercury.house}` : '—'}; Jupiter ${jupiter ? `${jupiter.sign} H${jupiter.house}` : '—'}`
  }));

  pages.push(pg({
    kicker: 'विदेश',
    title: 'विदेश यात्रा / विदेशी वातावरण',
    en: 'Foreign themes',
    paragraphs: [
      'तपाईं विदेश जानुहुन्छ भन्ने निश्चित वाक्य यो प्रतिवेदनमा छैन।',
      `कुण्डलीमा नवम (${hSign(chart, 9) || '—'}) र द्वादश (${hSign(chart, 12) || '—'}) भावले परम्परागत रूपमा विदेश, लामो यात्रा वा विदेशी वातावरणसँग जोडिएका विषय देखाउँछन्। समय सम्बन्धित भाव र दशाको खेलमा भर पर्छ।`,
      rahu ? `राहु ${rahu.sign} भाव ${rahu.house} — अपरिचिततिर भोक।` : '',
      ketu ? `केतु ${ketu.sign} भाव ${ketu.house} — दूरी, त्याग वा दोस्रो “आत्मिक घर”।` : ''
    ].filter(Boolean),
    boxes: [{ label: 'अहिले', text: plabel }, { label: 'हेर्ने भाव', text: '९ / १२ / राहु–केतु' }, { label: 'भाषा', text: 'संकेत, वाचा होइन' }],
    basis: `9th ${hSign(chart, 9)}; 12th ${hSign(chart, 12)}; Rahu ${rahu ? `${rahu.sign} H${rahu.house}` : '—'}; Ketu ${ketu ? `${ketu.sign} H${ketu.house}` : '—'}`
  }));

  const grahaLife = [
    ['मङ्गल', mars, 'साहस र कार्य'],
    ['बुध', mercury, 'बुद्धि र वाणी'],
    ['गुरु', jupiter, 'अर्थ र विस्तार'],
    ['शुक्र', venus, 'स्नेह र मूल्य'],
    ['शनि', saturn, 'कर्तव्य र समय']
  ];
  grahaLife.forEach(([np, pl, role]) => {
    if (!pl) return;
    pages.push(pg({
      kicker: 'नवग्रह · विस्तृत प्रभाव',
      title: `${np} — ${role}`,
      en: `${pl.name} in your life`,
      paragraphs: [
        `तपाईंको जीवनमा यसको अर्थ: ${np} ${pl.sign} मा, भाव ${pl.house} (${HOUSE_NP[pl.house]}) मा छ। यो ग्रहको कक्षा चल्दा ${HOUSE_NP[pl.house]} सम्बन्धी कुरा चर्को हुन सक्छ।`,
        line(pl) ? `संकेत: ${line(pl)}` : `शैली: ${SIGN_MEANINGS[pl.sign] || ''}।`
      ].filter(Boolean),
      boxes: [
        { label: 'बल', text: pl.interpretation?.strength || PLANET_MEANINGS[pl.name]?.strengths?.[0] || 'केन्द्रित प्रयास' },
        { label: 'चुनौती', text: pl.interpretation?.challenge || PLANET_MEANINGS[pl.name]?.challenges?.[0] || 'असन्तुलन' },
        { label: 'सुझाव', text: 'दशामा यो ग्रह आउँदा भावको काम सानो–सानो गरी पूरा गर्नुहोस्' }
      ],
      basis: `${pl.name} in ${pl.sign}, house ${pl.house}${pl.nakshatra ? `, ${pl.nakshatra}` : ''}`
    }));
  });

  pages.push(pg({
    kicker: 'राहु–केतु',
    title: 'राहु र केतु',
    en: 'The axis of hunger and release',
    paragraphs: [
      rahu ? `राहु ${rahu.sign} भाव ${rahu.house} — जहाँ जीवनले “अझै चाहियो” भन्छ।` : '',
      ketu ? `केतु ${ketu.sign} भाव ${ketu.house} — जहाँ छोड्ने, पछि हट्ने वा सूक्ष्म बाटो देखिन्छ।` : '',
      'यो अक्ष डरलाग्दो श्राप होइन। एउटा छेउमा भोक, अर्को छेउमा त्याग — दुवैलाई चिनेर बाँच्ने अभ्यास हो।'
    ].filter(Boolean),
    basis: `Rahu ${rahu ? `${rahu.sign} H${rahu.house}` : '—'}; Ketu ${ketu ? `${ketu.sign} H${ketu.house}` : '—'}`
  }));

  pages.push(pg({
    kicker: 'बाह्र भाव',
    title: 'बाह्र भाव — जीवनका कोठा',
    en: 'Twelve houses',
    paragraphs: ['खाली घर भनेको जीवन छुट्यो भन्ने होइन। त्यो कोठा भावेश र दशाले चलाउँछन्।'],
    table: {
      headers: ['भाव', 'जीवन क्षेत्र', 'राशि', 'तपाईंको कुण्डली'],
      rows: Object.entries(HOUSE_NP).map(([h, area]) => {
        const o = occ(chart, h);
        const s = hSign(chart, h) || '—';
        return [h, area, s, o.length ? o.map((p) => p.name).join(', ') : `भावेश ${SIGN_LORD[s] || '—'}`];
      })
    }
  }));

  pages.push(pg({
    kicker: 'योग',
    title: 'विशेष योगहरू',
    en: 'Named combinations — simply',
    paragraphs: yogas.length
      ? yogas.slice(0, 6).map((y) => {
          const nm = y.name || 'योग';
          const meaning = /raj/i.test(nm)
            ? 'यसले जिम्मेवारीसँगै उपलब्धि र दृश्यता बढाउने विषयसँग सम्बन्धित संकेत दिन सक्छ।'
            : y.interpretation || 'एउटा नाम दिइएको संयोजन देखिएको छ।';
          return `${nm} (${y.strength || 'संकेत'}) — ${meaning}`;
        })
      : ['नाम दिइएका योगहरू यो गणनामा कम छन्। ग्रह–भाव पढाइ नै मुख्य आधार हो। “महायोग!” भन्ने भाषा प्रयोग गरिएको छैन।'],
    basis: yogas.slice(0, 4).map((y) => `${y.name}: ${(y.evidence || []).join('; ') || 'heuristic'}`).join(' · ')
  }));

  const topA = aspects.slice().sort((a, b) => Number(a.orb || 9) - Number(b.orb || 9)).slice(0, 5);
  pages.push(pg({
    kicker: 'ग्रह सम्बन्ध',
    title: 'ग्रहहरूको सम्बन्ध — जीवनमा',
    en: 'What the aspects mean for you',
    paragraphs: topA.length
      ? topA.map((a) => `${a.planetA} र ${a.planetB} (${a.aspectType}) — यी दुईको खेलले निर्णय, करियर वा सम्बन्धमा एउटै विषय बारम्बार ल्याउन सक्छ। सम्बन्धित ग्रहका पृष्ठ सँगै पढ्नुहोस्।`)
      : ['मुख्य सम्बन्ध भाव-स्थितिबाट पढिन्छ।'],
    basis: topA.map((a) => `${a.planetA}–${a.planetB} ${a.aspectType} orb ${Number(a.orb || 0).toFixed(1)}°`).join('; ')
  }));

  pages.push(pg({
    kicker: 'दशा',
    title: 'अहिले तपाईंको जीवनमा कुन समय चलिरहेको छ?',
    en: 'Your dasha classroom',
    paragraphs: [
      `अहिले: ${plabel}`,
      d.current?.startDateApprox ? `महादशा ${d.current.planet || ''}: ${d.current.startDateApprox} → ${d.current.endDateApprox || ''}।` : '',
      d.antar?.startDateApprox ? `अन्तर्दशा ${d.antar.antarLord}: ${d.antar.startDateApprox} → ${d.antar.endDateApprox || ''}।` : '',
      'दशा भनेको कुन ग्रहको कक्षामा बसिरहनुभएको छ। स्वतन्त्र निर्णय हट्दैन।'
    ].filter(Boolean),
    bullets: [
      'मुख्य फोकस: करियर र व्यवसाय',
      'आय र सिकाइ',
      'सम्बन्ध र सञ्चार',
      ...d.timeline.slice(0, 6).map((row) => `${row.planet || row.mahaLord}: ${row.startDateApprox || ''} → ${row.endDateApprox || ''}`)
    ]
  }));

  pages.push(pg({
    kicker: 'वर्तमान अवधि',
    title: '२०२६–२०२८',
    en: 'Near horizon',
    paragraphs: [
      `यो ${plabel} को नजिकको तेस्रो हो। निश्चित भविष्यवाणी होइन — सम्भावित जोड।`,
      'मुख्य फोकस: करियर, आय, सिकाइ, सम्बन्ध, सञ्चार।'
    ],
    boxes: [
      { label: 'कक्षा', text: plabel },
      { label: 'जोड', text: 'सीप र सम्झौता' },
      { label: 'भाषा', text: 'सम्भव / संकेत' }
    ]
  }));

  pages.push(pg({
    kicker: '२०२६',
    title: '२०२६ — केमा ध्यान?',
    paragraphs: [
      'सम्झौता, सीप र दैनिक शिल्पमा ध्यान दिन उपयुक्त वर्ष हुन सक्छ। नयाँ नाटकभन्दा अधुरो काम पूरा गर्ने मौसम।',
      mercury ? 'बुधको कक्षा चलिरहेको भए वाणी, लेखन, व्यापार र सिकाइ चर्को हुन सक्छ।' : '',
      'सुझाव: एउटा आय-स्रोत वा शिल्पलाई गहिरो बनाउनुहोस्।'
    ].filter(Boolean)
  }));

  pages.push(pg({
    kicker: '२०२७',
    title: '२०२७ — के महत्त्वपूर्ण हुन सक्छ?',
    paragraphs: [
      '२०२६ मा राखिएको आधार देखिन थाल्ने वर्ष हुन सक्छ — काम र सम्बन्धमा सर्तहरू स्पष्ट पार्ने मौसम।',
      'सुझाव: जिम्मेवारी बढे पनि सीमा स्पष्ट राख्नुहोस्।'
    ]
  }));

  pages.push(pg({
    kicker: '२०२८',
    title: '२०२८ — के संक्रमण हुन सक्छ?',
    paragraphs: [
      'अन्तर्दशा बदलिने वा महादशाको पछिल्लो तेस्रोतिर जोड सर्न सक्छ। नयाँ विषय होइन, जोड सर्ने मौसम।',
      'सुझाव: जुन काम टुंग्याउन बाँकी छ, त्यसलाई २०२८ अघि सानो रूपमा टुंग्याउने अभ्यास गर्नुहोस्।'
    ]
  }));

  const maha = d.current?.planet || '';
  const mahaP = pBy(chart, maha);
  pages.push(pg({
    kicker: 'फराकिलो दिशा',
    title: '२०२८–२०३१',
    paragraphs: [
      mahaP
        ? `${maha} महादशाको बाँकी वर्षमा यो ग्रह ${mahaP.sign} भाव ${mahaP.house} (${HOUSE_NP[mahaP.house]}) मा बसेकाले त्यही जीवनक्षेत्र बारम्बार फर्किन सक्छ।`
        : 'महादशा ग्रहको भाव नै लामो कक्षा हो।',
      'यो स्क्रिप्ट होइन — ध्यानको नक्सा हो।'
    ]
  }));

  const phases = Array.isArray(chart?.lifePhases) ? chart.lifePhases : [];
  pages.push(pg({
    kicker: 'जीवन चरण',
    title: 'बाल्यकाल · युवावस्था · अहिले',
    paragraphs: phases.length
      ? phases.flatMap((ph) => [`${ph.title || ph.phase || ''} (${ph.ageRange || ''})`, ...(ph.paragraphs || []).slice(0, 2)])
      : [
          `बाल्यकाल: चन्द्र ${moon?.sign || ''} भाव ${moon?.house || ''} — सुरक्षा र स्मृति।`,
          `युवावस्था: लग्न ${lagna} र दशम प्रयास — कामबाट पहिचान जाँच्ने समय।`,
          `अहिले: ${plabel}। अर्को ठूलो संक्रमण दशा बदलिँदा।`
        ]
  }));

  pages.push(pg({
    kicker: 'बल',
    title: 'तपाईंका मुख्य बल',
    bullets: [
      `सञ्चार र सिकाइ — लग्न ${lagna} / बुध ${mercury ? `${mercury.sign} भाव ${mercury.house}` : ''}`,
      `अनुकूलन क्षमता — बाहिरी लग्न शैली`,
      `भावनात्मक गहिराइ — चन्द्र ${moon?.sign || ''} भाव ${moon?.house || ''}`,
      saturn ? `लगन — शनि ${saturn.sign} भाव ${saturn.house}` : 'लगन — शनि अध्याय',
      jupiter ? `अर्थ खोज्ने बुद्धि — गुरु ${jupiter.sign} भाव ${jupiter.house}` : 'विवेक — गुरु'
    ]
  }));

  pages.push(pg({
    kicker: 'चुनौती',
    title: 'तपाईंका मुख्य चुनौती',
    paragraphs: ['डरलाग्दो भाषा होइन। चुनौती → किन → कसरी सम्हाल्ने।'],
    bullets: [
      'मनमा कुरा अड्किनु — छोटो साँझ, कम खुला लुप',
      'पहिचान ढिलो आउनु — एउटा काम टुंग्याएर मात्र अर्को',
      'करियर दबाब — सीमा र आराम पनि कर्तव्य हो',
      rahu ? 'चञ्चलता — एउटा नयाँ सीप, दस ट्याब होइन' : 'अत्यधिक योजना — सानो कार्यान्वयन'
    ]
  }));

  pages.push(pg({
    kicker: 'उपाय',
    title: 'तपाईंका लागि तीन अभ्यास',
    bullets: [
      '१. अनुशासन — दैनिक एउटा नछुट्टिने काम वा शरीरको समय',
      '२. वाणी — हप्तामा एकपटक “मैले के भनेँ” समीक्षा',
      '३. शिल्प — ९० दिनको एउटा सीप',
      'मन्त्र/कर्मकाण्ड ऐच्छिक हुन्। पहिले व्यवहार।'
    ]
  }));

  pages.push(pg({
    kicker: 'सारांश तालिका',
    title: 'कुण्डली स्न्यापशट',
    en: 'Astrological emphasis — not a success score',
    paragraphs: ['यी पङ्क्तिहरू ज्योतिषीय जोड हुन्, वैज्ञानिक सम्भाव्यता होइनन्।'],
    table: {
      headers: ['क्षेत्र', 'तपाईंको मुख्य संकेत'],
      rows: [
        ['व्यक्तित्व', `बाहिर ${lagna}; भित्र ${chart.moonSign || moon?.sign || '—'}`],
        ['करियर', saturn && Number(saturn.house) === 10 ? 'ढिलो तर टिक्ने वृद्धि' : 'दशम/शनि अनुसार जिम्मेवारी'],
        ['धन', 'सीप र सञ्जालबाट चल्ने ढाँचा'],
        ['प्रेम', 'भावनात्मक गहिराइ'],
        ['विदेश', 'नवम/द्वादश/राहु–केतुका विषय'],
        ['अहिलेको समय', plabel]
      ]
    }
  }));

  pages.push(pg({
    kicker: 'तीन सूत्र',
    title: 'तपाईंका मुख्य जीवन विषय',
    bullets: [
      `०१ सञ्चार र शिल्प — लग्न ${lagna}, बुध ${mercury ? `${mercury.sign} H${mercury.house}` : ''}`,
      `०२ अनुशासन र करियर — शनि ${saturn ? `${saturn.sign} H${saturn.house}` : ''} र दशम ${hSign(chart, 10) || ''}`,
      `०३ गहिरो भावना — चन्द्र ${moon?.sign || ''} भाव ${moon?.house || ''}`
    ]
  }));

  pages.push(pg({
    kicker: 'एक पृष्ठ',
    title: 'तपाईंको कुण्डली — संक्षेपमा',
    paragraphs: [
      `लग्न ${lagna} · चन्द्र ${chart.moonSign || moon?.sign || '—'} · सूर्य ${chart.sunSign || sun?.sign || '—'}`,
      `करियर: दशम ${hSign(chart, 10) || ''} · ${tenth.map((p) => p.name).join(', ') || SIGN_LORD[hSign(chart, 10)] || ''}`,
      `धन: द्वितीय ${hSign(chart, 2) || ''} · एकादश ${hSign(chart, 11) || ''}`,
      `प्रेम: सप्तम ${hSign(chart, 7) || ''} · शुक्र ${venus ? `${venus.sign} H${venus.house}` : '—'}`,
      `अहिले: ${plabel}`,
      'सुझाव: दशा ग्रहको भावमा सानो लगातार काम।'
    ]
  }));

  pages.push(pg({
    kicker: 'मिल्छ?',
    title: 'के कुरा जीवनसँग मेल खान्छ?',
    paragraphs: [
      'यो प्रतिवेदनमा उल्लेखित ढाँचा तपाईंको वास्तविक जीवनसँग कति मिल्छन्? आफ्नो अनुभवसँग तुलना गर्नुहोस्।'
    ],
    bullets: ['करियर यात्रा', 'पैसाको बानी', 'सम्बन्ध', 'निर्णय शैली', 'भावना', 'ठूला परिवर्तन']
  }));

  pages.push(pg({
    kicker: 'सन्देश',
    title: 'तपाईंको यात्रा यहींबाट सुरु हुन्छ',
    paragraphs: [
      'कुण्डलीले सम्भावनाका ढाँचा देखाउँछ; त्यसलाई कसरी प्रयोग गर्ने भन्ने तपाईंको निर्णयमा भर पर्छ।',
      'Your chart. Your patterns. Your choices.'
    ]
  }));

  pages.push(pg({
    kicker: 'विधि',
    title: 'महत्त्वपूर्ण जानकारी',
    paragraphs: [
      'यो प्रतिवेदन तपाईंले उपलब्ध गराउनुभएको जन्ममिति, जन्मसमय र जन्मस्थानमा आधारित वैदिक ज्योतिषीय व्याख्या हो। ग्रहस्थितिका लागि Swiss Ephemeris तथा लाहिरी अयनांश प्रयोग गरिएको छ।',
      'ज्योतिषीय फलादेशलाई निश्चित वा १०० प्रतिशत सुनिश्चित भविष्यवाणीका रूपमा लिनु हुँदैन। जन्म विवरणको शुद्धता, गणना पद्धति र व्याख्याअनुसार परिणाम फरक पर्न सक्छन्।',
      'यसलाई आत्मचिन्तन तथा ज्योतिषीय मार्गदर्शनका रूपमा लिनुहोस्। चिकित्सा, कानुनी वा महत्त्वपूर्ण आर्थिक निर्णयका लागि सम्बन्धित योग्य पेशेवरको सल्लाह लिनुहोस्।'
    ]
  }));

  return pages;
}

module.exports = {
  buildMahabhavishyaPages,
  planetByName: pBy,
  buildReportSections: (chart) => buildMahabhavishyaPages(chart).filter((p) => p.kind !== 'cover')
};
