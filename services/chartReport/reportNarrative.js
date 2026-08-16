const {
  HOUSE_AREA,
  SIGN_LORD_EN,
  aspectLife,
  createGlossary,
  dashaLongTheme,
  dashaShortTheme,
  lagnaImpression,
  lifePhaseCopy,
  moonMind,
  partnerStyle,
  planetAdvice,
  planetChallenge,
  planetReading,
  houseSpin,
  selectYogas,
  sunStand
} = require('./npLexicon');

function pBy(chart, name) {
  return (chart?.planets || []).find((x) => x?.name === name) || null;
}
function occ(chart, h) {
  return (chart?.planets || []).filter((x) => Number(x.house) === Number(h));
}
function hSign(chart, h) {
  const c = (chart?.houseCusps || []).find((x) => Number(x.house) === Number(h));
  if (c?.sign) return c.sign;
  const signs = Object.keys(SIGN_LORD_EN);
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
function periodLabel(g, d) {
  const m = d.current?.planet || d.snapshot?.mahaDasha || d.summary?.currentMahadashaPlanet;
  const a = d.antar?.antarLord || d.snapshot?.antarDasha || d.summary?.currentAntardashaLord;
  if (m && a) return `${g.planet(m)} / ${g.planet(a)}`;
  if (m) return g.planet(m);
  return 'वर्तमान दशा';
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
function fmtDeg(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(2) : '—';
}
function dignityNp(d) {
  return {
    exalted: 'उच्च',
    own: 'स्वगृह',
    debilitated: 'नीच',
    friendly: 'मित्र',
    enemy: 'शत्रु',
    shadow: 'छाया',
    neutral: 'सम'
  }[d] || d || '—';
}
function aspectNp(t) {
  return {
    conjunction: 'युति',
    opposition: 'विपक्ष',
    trine: 'त्रिकोण',
    square: 'वर्ग',
    sextile: 'षड्कोण'
  }[String(t || '').toLowerCase()] || t || '—';
}
function pg(spec) {
  return { kicker: '', title: '', en: '', paragraphs: [], boxes: [], bullets: [], table: null, meters: [], basis: '', quote: '', ...spec };
}

function grahaBasis(g, pl) {
  if (!pl) return '';
  const nak = pl.nakshatra ? `, ${g.nakshatra(pl.nakshatra)} नक्षत्र` : '';
  return `${g.planet(pl.name)} — ${g.sign(pl.sign)} राशि, ${g.house(pl.house)}${nak}`;
}

function houseOccLine(g, chart, h) {
  const s = g.sign(hSign(chart, h));
  const o = occ(chart, h);
  if (o.length) return `${g.house(h)} (${s} राशि) मा ${g.grahaList(o)} छन्।`;
  return `${g.house(h)} (${s} राशि) मा ग्रह छैनन्; भावेश ${g.lord(hSign(chart, h))} ले यो क्षेत्र बोल्छन्।`;
}
function occOrLord(g, chart, h) {
  const o = occ(chart, h);
  const s = hSign(chart, h);
  if (o.length) return `${g.sign(s)} मा ${g.grahaList(o)}`;
  return `${g.sign(s)} · भावेश ${g.lord(s)}`;
}
function namesIn(chart, h) {
  return occ(chart, h).map((p) => p.name);
}
function careerFromTenth(g, h10, names) {
  if (names.includes('Saturn')) return `दशममा शनि (${g.sign(h10)}) — कामपछि नाम; ढिलो तर टिक्ने वृद्धि।`;
  if (names.includes('Sun')) return `दशममा सूर्य (${g.sign(h10)}) — देखिने भूमिका र जिम्मेवारी।`;
  if (names.includes('Mars')) return `दशममा मङ्गल (${g.sign(h10)}) — पहल र कर्मबाट करियर।`;
  if (names.includes('Mercury')) return `दशममा बुध (${g.sign(h10)}) — वाणी, विश्लेषण, व्यापार।`;
  if (names.includes('Jupiter')) return `दशममा गुरु (${g.sign(h10)}) — मार्गदर्शन, शिक्षण, नीति।`;
  if (names.includes('Venus')) return `दशममा शुक्र (${g.sign(h10)}) — कला, सम्बन्ध, कूटनीतिबाट काम।`;
  if (names.includes('Moon')) return `दशममा चन्द्रमा (${g.sign(h10)}) — जनता, हेरचाह, सार्वजनिक भाव।`;
  return `दशम ${g.sign(h10)} खाली; भावेश ${g.lord(h10)} ले करियरको स्वर बोल्छन्।`;
}
function moneyFromSecond(g, chart) {
  const n2 = namesIn(chart, 2);
  const n11 = namesIn(chart, 11);
  if (n2.includes('Jupiter') || n11.includes('Jupiter')) return 'गुरु धन/लाभ भावमा — सिकाइ र विश्वाससँग जोडिएर स्रोत फैलिन सक्छ।';
  if (n2.includes('Venus') || n11.includes('Venus')) return 'शुक्र धन/लाभ भावमा — स्वाद, सम्बन्ध र सौन्दर्यसँग आय जोडिन सक्छ।';
  if (n2.includes('Mercury') || n11.includes('Mercury')) return 'बुध धन/लाभ भावमा — वाणी, व्यापार र सीपबाट आय।';
  if (n2.includes('Saturn') || n11.includes('Saturn')) return 'शनि धन/लाभ भावमा — ढिलो बचत, जोगाएर बढ्ने ढाँचा।';
  if (n2.includes('Mars') || n11.includes('Mars')) return 'मङ्गल धन/लाभ भावमा — सक्रिय कमाइ; हतार खर्चबाट जोगिनुहोस्।';
  return `धनको स्वर: ${houseOccLine(g, chart, 2)}`;
}
function natalHouseLine(g, chart) {
  return (chart?.planets || [])
    .map((pl) => `${g.planet(pl.name)} ${pl.house || '—'}`)
    .join(' · ');
}
function doNow(g, chart, houses, extra) {
  const items = (houses || []).map((h) => {
    const o = occ(chart, h);
    if (o.length) return `${g.house(h)} (${g.area(h)}) — ${g.grahaList(o)} सक्रिय; हप्ताको एउटा सानो काम टुंग्याउनुहोस्।`;
    return `${g.house(h)} खाली देखिए पनि भावेश ${g.lord(hSign(chart, h))} ले यो क्षेत्र चलाउँछन् — लय राख्नुहोस्।`;
  });
  if (extra) items.push(extra);
  return items.slice(0, 4);
}
function timingForHouses(g, chart, d, houses) {
  const maha = d.current?.planet || d.snapshot?.mahaDasha || d.summary?.currentMahadashaPlanet;
  const pl = maha ? pBy(chart, maha) : null;
  if (pl && houses.includes(Number(pl.house))) {
    return `अहिले ${g.planet(maha)} महादशा चलिरहेको छ र यो ग्रह ${g.house(pl.house)}मा छ। त्यसैले ${g.area(pl.house)} अहिले बढी महत्त्वपूर्ण हुन सक्छ।`;
  }
  const antar = d.antar?.antarLord || d.snapshot?.antarDasha || d.summary?.currentAntardashaLord;
  const ap = antar ? pBy(chart, antar) : null;
  if (ap && houses.includes(Number(ap.house))) {
    return `अहिले ${g.planet(antar)} अन्तर्दशा ${g.house(ap.house)}बाट चल्दा ${g.area(ap.house)} तात्न सक्छ।`;
  }
  return periodLabel(g, d) !== 'वर्तमान दशा'
    ? `अहिलेको कक्षा ${periodLabel(g, d)} हो। यो क्षेत्र दशा ग्रह यी भावमा पर्दा बढी देखिन्छ।`
    : 'समयको जोड ग्रह-भावबाट पढ्नुहोस् — दशा पेलोड नआए पनि भाव खाली हुँदैन।';
}
function kundaliCode(chart) {
  const raw = [
    chart?.ascendant || '',
    chart?.moonSign || '',
    ...(chart?.planets || []).map((p) => `${p.name}:${p.sign}:${p.house}`)
  ].join('|');
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `GP-${(h >>> 0).toString(16).toUpperCase().slice(0, 6)}`;
}

function buildMahabhavishyaPages(chart) {
  const g = createGlossary();
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
  const lagnaEn = chart?.ascendant || '—';
  const name = chart?.name || 'तपाईं';
  const plabel = periodLabel(g, d);
  const pages = [];
  const lagna = g.sign(lagnaEn);
  const moonSign = g.sign(chart.moonSign || moon?.sign);
  const sunSign = g.sign(chart.sunSign || sun?.sign);

  pages.push(pg({
    kind: 'cover',
    kicker: 'GRAHAPATH',
    title: 'तपाईंको महाभविष्यफल',
    subtitle: `${name} · ${lagna} लग्न · चन्द्र ${moonSign} · सूर्य ${sunSign}`,
    natalLine: `${kundaliCode(chart)}  ·  ${natalHouseLine(g, chart)}`,
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
    freshPage: true,
    paragraphs: [
      `यो चक्र ${name} को जन्म कुण्डली हो। गणना ${place(chart)} का लागि गरिएको हो। बीचमा लग्न देखिन्छ; ग्रहहरू आफू बसेको भावमा देखिन्छन्।`,
      `${lagna} लग्नले तपाईं संसारमा कसरी देखा पर्नुहुन्छ र मानिसहरूले तपाईंलाई पहिलो भेटमा कस्तो ठान्छन् भन्ने संकेत गर्छ।`,
      `${g.planet('Moon')} ${moonSign} राशिमा हुँदा मन र भावनाको लय बन्छ। ${g.planet('Sun')} ${sunSign} राशिमा हुँदा आत्मविश्वास र आफ्नो नाम उभ्याउने शैली बन्छ।`,
      moon?.nakshatra
        ? `${g.planet('Moon')} ${g.nakshatra(moon.nakshatra)} नक्षत्र${moon.nakshatraPada ? `, पद ${moon.nakshatraPada}` : ''} मा रहेकाले मनको सूक्ष्म स्वाद यही नक्षत्रसँग जोडिएको छ।`
        : ''
    ].filter(Boolean),
    boxes: [
      { label: 'लग्न', text: lagna },
      { label: 'चन्द्रमा', text: `${moonSign} · ${g.house(moon?.house)}` },
      { label: 'सूर्य', text: `${sunSign} · ${g.house(sun?.house)}` }
    ],
    table: {
      headers: ['ग्रह', 'राशि', 'भाव'],
      rows: (chart.planets || []).map((pl) => [
        g.planet(pl.name),
        g.sign(pl.sign),
        String(pl.house || '—')
      ])
    }
  }));

  pages.push(pg({
    kicker: 'यस कुण्डलीका तथ्य',
    title: `${name} को गणना तथ्य`,
    en: 'Taken from this kundali only',
    freshPage: true,
    paragraphs: [
      `यो प्रतिवेदन ${name} ले दिनुभएको जन्ममिति, जन्मसमय र जन्मस्थानबाट गणना गरिएको कुण्डलीमा आधारित छ। Swiss Ephemeris, लाहिरी अयनांश र लग्न राशिबाट बाह्र भाव प्रयोग गरिएको छ।`,
      `जन्म: ${w.date}${w.time ? `, ${w.time}` : ''} · ${place(chart)}`,
      `लग्न ${lagna} · चन्द्रमा ${moonSign}${moon?.house ? `, ${g.house(moon.house)}` : ''} · सूर्य ${sunSign}${sun?.house ? `, ${g.house(sun.house)}` : ''}`,
      houseOccLine(g, chart, 2),
      houseOccLine(g, chart, 7),
      houseOccLine(g, chart, 10),
      houseOccLine(g, chart, 11),
      plabel && plabel !== 'वर्तमान दशा'
        ? `अहिले चलिरहेको दशा: ${plabel}`
        : 'दशा यो पेलोडमा नआएकाले समय-खण्ड ग्रह-भावबाट पढिएको छ।'
    ].filter(Boolean),
    table: {
      headers: ['ग्रह', 'राशि', 'भाव', 'नक्षत्र'],
      rows: (chart.planets || []).map((pl) => [
        g.planet(pl.name),
        g.sign(pl.sign),
        String(pl.house || '—'),
        pl.nakshatra ? g.nakshatra(pl.nakshatra) : '—'
      ])
    }
  }));

  pages.push(pg({
    kicker: 'गणना तह',
    title: 'ग्रह स्थिति — डिग्री, नक्षत्र, पद, बल',
    en: 'Exact longitude, nakshatra pada, dignity',
    freshPage: true,
    paragraphs: [
      'यो तालिका राशि मात्र होइन। प्रत्येक ग्रहको राशिभित्रको अंश, निरयन देशान्तर, नक्षत्र, पद र ग्रहबल यही कुण्डलीको गणनाबाट हो।'
    ],
    table: {
      headers: ['ग्रह', 'राशि', 'अंश', 'निरयन', 'नक्षत्र', 'पद', 'बल'],
      rows: (chart.planets || []).map((pl) => [
        `${g.planet(pl.name)}${pl.retrograde ? ' वक्र' : ''}`,
        g.sign(pl.sign),
        fmtDeg(pl.degree),
        fmtDeg(pl.absoluteDegree),
        pl.nakshatra ? g.nakshatra(pl.nakshatra) : '—',
        pl.nakshatraPada != null ? String(pl.nakshatraPada) : '—',
        dignityNp(pl.dignity)
      ])
    },
    basis: 'Lahiri sidereal · Swiss Ephemeris · whole-sign भाव'
  }));

  pages.push(pg({
    kicker: 'वर्ग कुण्डली',
    title: 'नवांश (D9) र दशमांश (D10)',
    en: 'Navamsa and Dasamsa from exact degree',
    freshPage: true,
    paragraphs: [
      'D9 विवाह, भित्री बल र धर्मको तह हो। D10 करियरको पुष्टि तह हो। वार्गोत्तम भनेको D1 र D9 एउटै राशि — त्यो ग्रहको स्वर बाक्लो हुन्छ।',
      (chart.planets || []).some((p) => p.vargottama)
        ? `वार्गोत्तम: ${(chart.planets || []).filter((p) => p.vargottama).map((p) => g.planet(p.name)).join(', ')}।`
        : 'यो कुण्डलीमा वार्गोत्तम ग्रह देखिएनन्।'
    ],
    table: {
      headers: ['ग्रह', 'D1 राशि', 'D9', 'D10', 'वार्गोत्तम', 'टिप्पणी'],
      rows: (chart.planets || []).map((pl) => [
        g.planet(pl.name),
        g.sign(pl.sign),
        pl.d9Sign ? g.sign(pl.d9Sign) : '—',
        pl.d10Sign ? g.sign(pl.d10Sign) : '—',
        pl.vargottama ? 'हो' : 'होइन',
        pl.sign && pl.d9Sign && pl.sign !== pl.d9Sign
          ? `D1 ${g.sign(pl.sign)} / D9 ${g.sign(pl.d9Sign)}`
          : 'एउटै स्वर'
      ])
    }
  }));

  const aspectRows = (brain.aspects || []).slice().sort((a, b) => Number(a.orb || 9) - Number(b.orb || 9));
  pages.push(pg({
    kicker: 'दृष्टि',
    title: 'ग्रह सम्बन्ध — दृष्टि / योग कोण',
    en: 'Aspects from exact longitudes',
    freshPage: true,
    paragraphs: [
      aspectRows.length
        ? 'तलका सम्बन्ध exact देशान्तरको कोणबाट निकालिएका हुन्। युति, त्रिकोण, वर्ग, विपक्ष र षड्कोण।'
        : 'यो पेलोडमा दृष्टि पङ्क्ति आएनन्। ग्रह-भावबाट सम्बन्ध पढिन्छ।'
    ],
    table: aspectRows.length
      ? {
          headers: ['ग्रह', 'सम्बन्ध', 'ग्रह', 'orb', 'बल'],
          rows: aspectRows.slice(0, 16).map((a) => [
            g.planet(a.planetA),
            aspectNp(a.aspectType),
            g.planet(a.planetB),
            fmtDeg(a.orb),
            a.strength || '—'
          ])
        }
      : null
  }));

  pages.push(pg({
    kicker: 'योग',
    title: 'यो कुण्डलीका नाम दिइएका योग',
    en: 'Named yogas from this kundali',
    freshPage: true,
    paragraphs: (brain.yogas || []).length
      ? (brain.yogas || []).slice(0, 10).map((y) => `${y.name}${y.strength ? ` (${y.strength})` : ''}\n${y.interpretation || ''}`.trim())
      : ['नाम दिइएका योग यो गणनामा कम छन्। ग्रह, भाव र दशा नै मुख्य आधार हो।'],
    quote: 'योग ग्यारेन्टी होइन — दशा र ग्रहबलसँग पढ्नुपर्ने संकेत हो।'
  }));

  const timeline = brain.natalTimeline || brain.vimshottariTimeline || [];
  const mahaRows = timeline.map((seg) => ({
    planet: seg.planet || seg.mahaLord,
    start: seg.startDateApprox,
    end: seg.endDateApprox,
    antars: seg.antardasha || []
  }));
  const currentMaha = mahaRows.find((row) => row.planet === (d.current?.planet || d.snapshot?.mahaDasha)) || mahaRows[0];
  pages.push(pg({
    kicker: 'दशा',
    title: 'विंशोत्तरी दशा — महादशा तालिका',
    en: 'Vimshottari mahadasha dates from Moon nakshatra',
    freshPage: true,
    paragraphs: [
      plabel && plabel !== 'वर्तमान दशा' ? `अहिले चलिरहेको कक्षा: ${plabel}।` : 'अहिलेको महादशा पेलोडमा नआए तालिकाबाट हेर्नुहोस्।',
      'मिति Moon नक्षत्रबाट चलेको विंशोत्तरी गणना हो।'
    ],
    table: mahaRows.length
      ? {
          headers: ['महादशा', 'सुरु', 'अन्त'],
          rows: mahaRows.slice(0, 12).map((row) => [
            g.planet(row.planet),
            row.start || '—',
            row.end || '—'
          ])
        }
      : null,
    bullets: (currentMaha?.antars || []).slice(0, 9).map((a) =>
      `${g.planet(a.antarLord || a.planet)} अन्तर्दशा: ${a.startDateApprox || '—'} → ${a.endDateApprox || '—'}`
    )
  }));

  pages.push(pg({
    kicker: 'व्यक्तित्व',
    title: 'तपाईंको व्यक्तित्व',
    en: 'How you appear — and who you are inside',
    paragraphs: [
      `${lagna} लग्नका कारण तपाईं बाहिरबाट ${lagnaImpression(lagnaEn)} व्यक्तिका रूपमा देखिनुहुन्छ।${lagnaEn === 'Gemini' ? ' मानिसहरूले तपाईंलाई पहिलो भेटमै कुराकानी गर्न सहज र सक्रिय स्वभावको व्यक्ति ठान्न सक्छन्।' : ' पहिलो छाप प्रायः यही शैलीबाट बन्छ।'} यो “नाटक” होइन — तपाईं संसारमा कसरी उभिने संकेत हो।`,
      moon
        ? `भित्र भने अर्कै लय हुन सक्छ। ${moonMind(g, moon)[0]}`
        : '',
      sun ? sunStand(g, sun)[0] : '',
      moon && sun && Number(moon.house) !== Number(sun.house)
        ? `मन ${g.house(moon.house)}मा र सूर्य ${g.house(sun.house)}मा भएकाले बाहिर देखिने आत्मविश्वास र भित्रको भावना सधैं एउटै दिशामा नचल्न सक्छन्। यो कमजोरी होइन — दुई लय चिनेर बाँच्ने अभ्यास हो।`
        : 'बाहिर देखिने शैली र भित्र बस्ने मन दुवै तपाईं हुनुहुन्छ।',
      timingForHouses(g, chart, d, [1, Number(moon?.house) || 1, Number(sun?.house) || 1])
    ].filter(Boolean),
    bullets: doNow(g, chart, [1, Number(moon?.house) || 4], 'एउटा काम पूरा गरेर मात्र अर्कोतिर लाग्नुहोस् — उपस्थिति बाक्लिन्छ।'),
    boxes: [
      { label: 'लग्न', text: `${lagna} — ${lagnaImpression(lagnaEn)}` },
      { label: 'मन', text: moon ? `${moonSign} · ${g.house(moon.house)}` : '—' },
      { label: 'आत्मविश्वास', text: sun ? `${sunSign} · ${g.house(sun.house)}` : '—' }
    ],
    quote: 'बाहिर देखिने शैली र भित्र बस्ने मन — दुवै तपाईं हुनुहुन्छ।',
    basis: `लग्न ${lagna}; ${grahaBasis(g, sun)}; ${grahaBasis(g, moon)}`
  }));

  pages.push(pg({
    kicker: 'मन',
    title: 'तपाईंको मन र भावना',
    en: 'Your inner world',
    paragraphs: moon
      ? [
          ...moonMind(g, moon),
          `तपाईंको जीवनमा यसको अर्थ: नजिकका मानिस, निद्रा र दैनिक लयले मनोभाव निर्धारण गर्न सक्छ। मन थाकेपछि निर्णय पनि कडा वा टाढा हुन सक्छ।`,
          timingForHouses(g, chart, d, [Number(moon.house), 4])
        ]
      : ['चन्द्रमाको स्थिति यो कुण्डलीमा उपलब्ध छैन।'],
    bullets: doNow(g, chart, [Number(moon?.house) || 4], 'मनमा कुरा थुपार्नुभन्दा एउटा विश्वासिलो व्यक्तिसँग खोल्नुहोस्।'),
    boxes: [
      { label: 'चन्द्रमा', text: moon ? `${moonSign} · ${g.house(moon.house)}` : '—' },
      { label: 'ध्यान दिनुपर्ने कुरा', text: moon ? `${g.area(moon.house)} सँग मन जोडिएको` : planetChallenge('Moon') },
      { label: 'तपाईंका लागि सुझाव', text: planetAdvice('Moon') }
    ],
    basis: grahaBasis(g, moon)
  }));

  pages.push(pg({
    kicker: 'आत्मविश्वास',
    title: 'व्यक्तित्व र आत्मविश्वास',
    en: 'How you stand in the world',
    paragraphs: sun
      ? [
          ...sunStand(g, sun),
          `तपाईंको जीवनमा यसको अर्थ: मान्यता चाहिन्छ, तर त्यो काम देखिएपछि आउँदा मात्र टिक्छ। देखावटी भूमिकाभन्दा ${g.area(sun.house)} मा साहस देखाउने बाटो बलियो हुन सक्छ।`,
          timingForHouses(g, chart, d, [Number(sun.house), 10, 1])
        ]
      : ['सूर्यको स्थिति उपलब्ध छैन।'],
    bullets: doNow(g, chart, [Number(sun?.house) || 10], 'सानो दैनिक साहस ठूलो घोषणाभन्दा उपयोगी हुन सक्छ।'),
    boxes: [
      { label: 'सूर्य', text: sun ? `${sunSign} · ${g.house(sun.house)}` : '—' },
      { label: 'जोडिएको क्षेत्र', text: sun ? g.area(sun.house) : '—' },
      { label: 'तपाईंका लागि सुझाव', text: planetAdvice('Sun') }
    ],
    basis: grahaBasis(g, sun)
  }));

  const h2 = hSign(chart, 2);
  const h11 = hSign(chart, 11);
  pages.push(pg({
    kicker: 'धन',
    title: 'धन तथा आर्थिक अवस्था',
    en: 'Money and livelihood',
    paragraphs: [
      `तपाईंको कुण्डलीमा: ${houseOccLine(g, chart, 2)} ${houseOccLine(g, chart, 11)}`,
      mercury
        ? `सीप र वाणी: ${g.planet('Mercury')} ${g.sign(mercury.sign)} राशिको ${g.house(mercury.house)}मा रहेकाले कुरा बुझेर, सिकाएर वा व्यापार गरेर आय आउने बाटो देखिन्छ।`
        : '',
      moneyFromSecond(g, chart),
      venus
        ? `खर्चतर्फ ध्यान: ${g.planet('Venus')} ${g.sign(venus.sign)} राशिको ${g.house(venus.house)}मा रहेकाले स्वाद, सम्बन्ध वा सुन्दरतामा खर्च हुँदा मन खुल्न सक्छ। सीमा राखे खर्चले पछुताउँदैन।`
        : 'खर्चतर्फ ध्यान: मन शान्त हुने कुरामा खर्च, देखावटी तुलनामा होइन।',
      jupiter
        ? `आर्थिक बल: ${g.planet('Jupiter')} ${g.sign(jupiter.sign)} राशिको ${g.house(jupiter.house)} — सिकाइ र विश्वाससँग जोडिएर स्रोत फैलिन सक्छ।`
        : 'आर्थिक बल: सीप र सम्बन्धलाई आयमा बदल्ने क्षमता।',
      `तपाईंको जीवनमा: छिटो नाफाभन्दा दोहोरिने आय-स्रोत शान्त हुन सक्छ। बचत भनेको डर होइन — भोलिको स्वतन्त्रता हो।`,
      timingForHouses(g, chart, d, [2, 11, Number(mercury?.house) || 2])
    ].filter(Boolean),
    bullets: doNow(g, chart, [2, 11], 'एउटा आय-स्रोत बाक्लो पार्नुहोस्; दस अधुरा योजना होइन।'),
    boxes: [
      { label: 'दोस्रो भाव', text: occOrLord(g, chart, 2) },
      { label: 'एकादश भाव', text: occOrLord(g, chart, 11) },
      { label: 'बुध', text: mercury ? `${g.sign(mercury.sign)} / ${g.house(mercury.house)}` : '—' }
    ],
    quote: `धनको नक्सा: ${houseOccLine(g, chart, 2)}`,
    basis: `दोस्रो भाव ${g.sign(h2)} (${g.grahaList(occ(chart, 2)) || `भावेश ${g.lord(h2)}`}); एकादश भाव ${g.sign(h11)} (${g.grahaList(occ(chart, 11)) || `भावेश ${g.lord(h11)}`})`
  }));

  const h10 = hSign(chart, 10);
  pages.push(pg({
    kicker: 'करियर',
    title: 'करियर तथा व्यवसाय',
    en: 'Career and work',
    paragraphs: [
      `तपाईंको कुण्डलीमा: ${houseOccLine(g, chart, 10)}`,
      careerFromTenth(g, h10, namesIn(chart, 10)),
      Number(mercury?.house) === 10 || Number(mercury?.house) === 1
        ? `नेतृत्वको भाषा: ${g.planet('Mercury')} ${g.sign(mercury.sign)} राशिको ${g.house(mercury.house)}मा भएकाले सञ्चार र योजना काममा देखिन सक्छ।`
        : sun
          ? `नेतृत्व: सूर्य ${g.sign(sun.sign)} राशिको ${g.house(sun.house)} — ${g.area(sun.house)} बाट आफ्नो नाम उभ्याउने संकेत।`
          : `नेतृत्व: दशमेश ${g.lord(h10)} को स्वर।`,
      `तपाईंको जीवनमा: पहिचान प्रायः कामपछि आउँछ। अधुरो भूमिका थप्नुभन्दा एउटा जिम्मेवारी बाक्लो पार्नुहोस्।`,
      timingForHouses(g, chart, d, [10, Number(saturn?.house) || 10, 6])
    ].filter(Boolean),
    bullets: doNow(g, chart, [10], saturn ? `शनि ${g.house(saturn.house)} — दैनिक एउटा नछुट्टिने काम नै करियरको उपाय हो।` : 'एउटा सीप गहिरो बनाउनुहोस्।'),
    boxes: [
      { label: 'दशम भाव', text: occOrLord(g, chart, 10) },
      { label: 'ढाँचा', text: careerFromTenth(g, h10, namesIn(chart, 10)) },
      { label: 'शनि', text: saturn ? `${g.sign(saturn.sign)} · ${g.house(saturn.house)}` : '—' }
    ],
    quote: careerFromTenth(g, h10, namesIn(chart, 10)),
    basis: `दशम भाव ${g.sign(h10)}; ${grahaBasis(g, saturn)}`
  }));

  const h7 = hSign(chart, 7);
  pages.push(pg({
    kicker: 'प्रेम',
    title: 'प्रेम तथा विवाह',
    en: 'Love and marriage',
    paragraphs: [
      `प्रेममा तपाईंको स्वभाव: सप्तम भाव ${g.sign(h7)} राशिमा छ। ${occ(chart, 7).length ? `${g.grahaList(occ(chart, 7))} यस भावमा रहेकाले साझेदारी जीवनमा स्पष्ट विषय बन्न सक्छ।` : `सप्तमेश ${g.lord(h7)} ले साझेदारको स्वर बोल्छन्।`} तपाईं सतही सम्बन्धभन्दा अर्थ र निष्ठा खोज्ने देखिनुहुन्छ।`,
      `तपाईंलाई कस्तो साथी अनुकूल हुन सक्छ? ${partnerStyle(h7)}। ${venus ? `${g.planet('Venus')} ${g.sign(venus.sign)} राशिको ${g.house(venus.house)}मा रहेकाले आत्मीयता, स्वाद र शान्ति कस्तो चाहिन्छ भन्ने थप संकेत मिल्छ।` : ''}`,
      moon
        ? `सम्बन्धमा चुनौती: चन्द्रमा ${g.sign(moon.sign)} राशिको ${g.house(moon.house)}मा भएकाले नजिकिँदा मन गहिरो हुन्छ। कुरा मनमै राख्नु वा अपेक्षा नखुलाउनुले दूरी बढ्न सक्छ। स्पष्ट संवाद नै उपाय हो।`
        : 'सम्बन्धमा चुनौती: अपेक्षा नखुलाउनु र समय नदिनु।',
      timingForHouses(g, chart, d, [7, Number(venus?.house) || 7])
    ].filter(Boolean),
    bullets: doNow(g, chart, [7], 'अपेक्षा बोलेर राख्नुहोस् — मनमा मात्र राख्दा दूरी बढ्छ।'),
    boxes: [
      { label: 'सप्तम भाव', text: occOrLord(g, chart, 7) },
      { label: 'अनुकूल साथी', text: partnerStyle(h7) },
      { label: 'शुक्र', text: venus ? `${g.sign(venus.sign)} · ${g.house(venus.house)}` : '—' }
    ],
    quote: `सप्तम: ${occOrLord(g, chart, 7)}`,
    basis: `सप्तम भाव ${g.sign(h7)}; ${grahaBasis(g, venus)}; ${grahaBasis(g, moon)}`
  }));

  const h4 = hSign(chart, 4);
  pages.push(pg({
    kicker: 'परिवार',
    title: 'परिवार तथा घर',
    en: 'Family and home',
    paragraphs: [
      `चतुर्थ भाव घर र मनको जग हो। यो भाव ${g.sign(h4)} राशिमा छ। ${occ(chart, 4).length ? `${g.grahaList(occ(chart, 4))} यस भावमा छन्।` : 'यस भावमा ग्रह देखिँदैनन् — भावेश र चन्द्रमाले घरको स्वर बोल्छन्।'}`,
      mars && Number(mars.house) === 4
        ? `चतुर्थ भावमा ${g.planet('Mars')} रहेकाले घरमा गर्मी, सुरक्षाको तीव्र इच्छा वा छिटो प्रतिक्रिया देखिन सक्छ। शान्त दैनिक लयले सन्तुलन मिल्छ।`
        : 'घर शान्त भयो भने बाहिरको लग्नले राम्रो काम गर्छ। परिवारको वातावरण मनको स्वास्थ्यसँग जोडिएको छ।',
      `तपाईंको जीवनमा: बाहिरी सफलताभित्र निजी शान्ति छुट्ट्याउनुपर्छ। घर बहसको मैदान होइन, आरामको ठाउँ हो।`,
      timingForHouses(g, chart, d, [4, 2])
    ].filter(Boolean),
    bullets: doNow(g, chart, [4], 'हप्तामा एक साँझ परिवार/निजी ठाउँलाई कामबाट अलग राख्नुहोस्।'),
    basis: `चतुर्थ भाव ${g.sign(h4)}; दोस्रो भाव ${g.sign(h2)}; ${grahaBasis(g, mars)}`
  }));

  const h5 = hSign(chart, 5);
  const h9 = hSign(chart, 9);
  const h6 = hSign(chart, 6);
  pages.push(pg({
    kicker: 'स्वास्थ्य',
    title: 'स्वास्थ्य तथा दैनिक लय',
    en: 'Health and daily pressure',
    paragraphs: [
      `छैटौँ भाव दैनिक काम, सेवा, प्रतिस्पर्धा र शरीरको लय हो। यो भाव ${g.sign(h6)} राशिमा छ। ${houseOccLine(g, chart, 6)}`,
      mars && Number(mars.house) === 6
        ? `छैटौँमा मङ्गल — समस्यासँग लड्ने शक्ति छ; शरीरलाई पनि युद्धभूमि नबनाउनुहोस्।`
        : saturn && Number(saturn.house) === 6
          ? `छैटौँमा शनि — कामको बोझ लामो समयसम्म थाम्ने संकेत; थकानलाई व्यवस्थापन गर्नैपर्छ।`
          : 'दैनिक लय बिग्रियो भने मन र काम दुवै प्रभावित हुन सक्छन्।',
      `तपाईंको जीवनमा: निद्रा, खानाको समय र एउटा शरीरको अभ्यास नै उपाय हो। ठूलो डाइट नाटक होइन।`,
      timingForHouses(g, chart, d, [6])
    ].filter(Boolean),
    bullets: doNow(g, chart, [6], 'दैनिक एउटा नछुट्टिने शरीर/निद्राको समय राख्नुहोस्।'),
    boxes: [
      { label: 'छैटौँ भाव', text: occOrLord(g, chart, 6) },
      { label: 'मङ्गल', text: mars ? `${g.sign(mars.sign)} · ${g.house(mars.house)}` : '—' },
      { label: 'शनि', text: saturn ? `${g.sign(saturn.sign)} · ${g.house(saturn.house)}` : '—' }
    ],
    basis: `छैटौँ भाव ${g.sign(h6)}; ${grahaBasis(g, mars)}; ${grahaBasis(g, saturn)}`
  }));

  pages.push(pg({
    kicker: 'सिर्जना',
    title: 'बुद्धि, सन्तान र सिर्जना',
    en: 'Creativity and children',
    paragraphs: [
      `पञ्चम भाव बुद्धि, सिर्जना, रोमान्स र सन्तानसँग जोडिन्छ। ${houseOccLine(g, chart, 5)}`,
      jupiter && Number(jupiter.house) === 5
        ? 'पञ्चममा गुरु — सिकाउने आनन्द, सन्तान वा सिर्जनामा विस्तारको संकेत।'
        : venus && Number(venus.house) === 5
          ? 'पञ्चममा शुक्र — कला, रोमान्स र रमाइलो जीवनमा महत्त्वपूर्ण देखिन सक्छ।'
          : `पञ्चमेश ${g.lord(h5)} ले यो कोठाको स्वर बोल्छन्।`,
      `तपाईंको जीवनमा: एउटा सिर्जनात्मक अभ्यास — लेखन, सीप वा बच्चासँगको समय — मनलाई बाटो दिन्छ।`,
      timingForHouses(g, chart, d, [5])
    ].filter(Boolean),
    bullets: doNow(g, chart, [5], 'नब्बे दिनको एउटा सिर्जना/सीप; दस अधुरा रहर होइन।'),
    basis: `पञ्चम भाव ${g.sign(h5)}; ${grahaBasis(g, jupiter)}; ${grahaBasis(g, venus)}`
  }));

  pages.push(pg({
    kicker: 'शिक्षा',
    title: 'शिक्षा तथा बुद्धि',
    en: 'Learning and intelligence',
    paragraphs: [
      mercury
        ? `सिक्ने शैली ${g.planet('Mercury')} बाट देखिन्छ। ${g.sign(mercury.sign)} राशिको ${g.house(mercury.house)}मा बुध रहेकाले कुरा बुझेर, जोडेर र प्रयोग गरेर सिक्ने संकेत छ।`
        : 'बुधको स्थिति यो कुण्डलीमा स्पष्ट छैन।',
      `पञ्चम भाव (${g.sign(h5)}) बुद्धि र सीपसँग जोडिन्छ; नवम भाव (${g.sign(h9)}) गुरु, उच्च शिक्षा र दीर्घ सोचसँग।`,
      jupiter
        ? `${g.planet('Jupiter')} ${g.sign(jupiter.sign)} राशिको ${g.house(jupiter.house)}मा रहेकाले अर्थ, नैतिकता र लामो सिकाइ तपाईंको बल हुन सक्छ।`
        : '',
      `तपाईंको जीवनमा: धेरै पाठ्यक्रम एकसाथ होइन। नब्बे दिनको एउटा सीपले बुद्धि बाक्लिन्छ।`,
      timingForHouses(g, chart, d, [5, 9, Number(mercury?.house) || 5])
    ].filter(Boolean),
    bullets: doNow(g, chart, [5, 9], mercury ? `बुध ${g.house(mercury.house)} — एउटा विषय गहिरो बनाउनुहोस्।` : 'एउटा विषय गहिरो बनाउनुहोस्।'),
    basis: `${grahaBasis(g, mercury)}; ${grahaBasis(g, jupiter)}`
  }));

  const h12 = hSign(chart, 12);
  pages.push(pg({
    kicker: 'विदेश',
    title: 'विदेश यात्रा तथा विदेशी वातावरण',
    en: 'Travel and foreign settings',
    paragraphs: [
      `तपाईंको कुण्डलीमा जन्मस्थानभन्दा बाहिरका वातावरण, लामो यात्रा वा विदेशी सम्बन्धसँग जोडिन सक्ने विषयलाई स्थान दिइएको देखिन्छ। नवम भाव ${g.sign(h9)} र द्वादश भाव ${g.sign(h12)} यही कथा बोल्छन्।`,
      'तर यसलाई निश्चित विदेश-बसाइका रूपमा लिनु हुँदैन; सम्बन्धित भाव र दशाको समर्थन आवश्यक हुन्छ।',
      rahu ? `${g.planet('Rahu')} ${g.sign(rahu.sign)} राशिको ${g.house(rahu.house)}मा — अपरिचिततिर भोक।` : '',
      ketu ? `${g.planet('Ketu')} ${g.sign(ketu.sign)} राशिको ${g.house(ketu.house)}मा — दूरी, त्याग वा दोस्रो आत्मिक घरको भाव।` : '',
      timingForHouses(g, chart, d, [9, 12, Number(rahu?.house) || 12])
    ].filter(Boolean),
    bullets: doNow(g, chart, [9, 12], 'विदेश संकेत हो; दशा र व्यावहारिक तयारी मिले मात्र जोड्नुहोस्।'),
    boxes: [
      { label: 'नवम', text: occOrLord(g, chart, 9) },
      { label: 'द्वादश', text: occOrLord(g, chart, 12) },
      { label: 'राहु', text: rahu ? `${g.sign(rahu.sign)} · ${g.house(rahu.house)}` : '—' }
    ],
    quote: 'विदेश भनेको सपनाको टिकट होइन — कुण्डलीले देखाएको एउटा ढोका हो।',
    basis: `नवम ${g.sign(h9)}; द्वादश ${g.sign(h12)}; ${grahaBasis(g, rahu)}; ${grahaBasis(g, ketu)}`
  }));

  const grahaLife = [
    ['मङ्गल', mars, 'Mars', 'साहस र कार्य'],
    ['बुध', mercury, 'Mercury', 'बुद्धि र वाणी'],
    ['गुरु', jupiter, 'Jupiter', 'अर्थ र विस्तार'],
    ['शुक्र', venus, 'Venus', 'स्नेह र मूल्य'],
    ['शनि', saturn, 'Saturn', 'कर्तव्य र समय']
  ];
  grahaLife.forEach(([np, pl, en, role]) => {
    if (!pl) return;
    pages.push(pg({
      kicker: 'नवग्रह · तपाईंको जीवनमा',
      title: `${np} — ${role}`,
      en: `${en} in your life`,
      freshPage: true,
      paragraphs: [
        ...planetReading(g, np, en, pl),
        `तपाईंको जीवनमा यसको अर्थ: ${g.area(pl.house)} बारम्बार फर्किन सक्छ। दबाब आउँदा यही क्षेत्रमा हतार वा अड्कन हुन सक्छ।`,
        timingForHouses(g, chart, d, [Number(pl.house)])
      ],
      bullets: [
        `${g.sign(pl.sign)} राशि · ${g.house(pl.house)} · ${g.area(pl.house)}`,
        houseSpin(en, Number(pl.house)) || `यो ग्रह ${g.area(pl.house)}सँग जोडिएको देखिन्छ।`,
        `उपयोगी बाटो: सम्बन्धित क्षेत्र — ${g.area(pl.house)} — मा सानो लगातार काम।`
      ],
      basis: grahaBasis(g, pl)
    }));
  });

  pages.push(pg({
    kicker: 'राहु–केतु',
    title: 'राहु र केतु',
    en: 'Desire and release',
    paragraphs: [
      rahu
        ? `${g.planet('Rahu')} ${g.sign(rahu.sign)} राशिको ${g.house(rahu.house)}मा रहेकाले जीवनले त्यहाँ “अझै चाहियो” भन्न सक्छ। नयाँ अनुभव, मान्यता वा अपरिचित बाटोतिर भोक देखिन सक्छ।`
        : '',
      ketu
        ? `${g.planet('Ketu')} ${g.sign(ketu.sign)} राशिको ${g.house(ketu.house)}मा रहेकाले छोड्ने, पछि हट्ने वा सूक्ष्म बाटो देखिन सक्छ।`
        : '',
      'एउटा छेउमा चाहना, अर्को छेउमा त्याग — दुवैलाई चिनेर बाँच्ने अभ्यास हो।'
    ].filter(Boolean),
    basis: `${grahaBasis(g, rahu)}; ${grahaBasis(g, ketu)}`
  }));

  pages.push(pg({
    kicker: 'बाह्र भाव',
    title: 'बाह्र भाव — जीवनका कोठा',
    en: 'Twelve houses',
    paragraphs: [
      'खाली भाव भनेको जीवन छुट्यो भन्ने होइन। त्यो कोठा भावेश र चलिरहेको दशाले चलाउँछन्।'
    ],
    table: {
      headers: ['भाव', 'जीवन क्षेत्र', 'राशि', 'तपाईंको कुण्डली'],
      rows: Object.entries(HOUSE_AREA).map(([h, area]) => {
        const o = occ(chart, h);
        const s = hSign(chart, h) || '—';
        return [h, area, g.sign(s), o.length ? g.grahaList(o) : `भावेश ${g.lord(s)}`];
      })
    }
  }));

  const chosenYogas = selectYogas(yogas);
  pages.push(pg({
    kicker: 'योग',
    title: 'विशेष योगहरू',
    en: 'Named combinations',
    paragraphs: chosenYogas.length
      ? chosenYogas.map((y) => `${y.title}\n${y.meaning}`)
      : [
          'नाम दिइएका योगहरू यो गणनामा कम छन्। ग्रह र भावको पढाइ नै मुख्य आधार हो।'
        ],
    quote: chosenYogas.length ? 'योग भनेको ग्यारेन्टी होइन — जिम्मेवारीसँग आउने सम्भावनाको संकेत हो।' : ''
  }));

  const topA = aspects.slice().sort((a, b) => Number(a.orb || 9) - Number(b.orb || 9)).slice(0, 5);
  pages.push(pg({
    kicker: 'ग्रह सम्बन्ध',
    title: 'ग्रहहरूको सम्बन्ध — जीवनमा',
    en: 'How planets speak together',
    paragraphs: topA.length
      ? topA.map((a) => aspectLife(g, a))
      : ['मुख्य सम्बन्ध भाव-स्थितिबाट पढिन्छ।'],
    quote: 'ग्रहहरू एक्लै बोल्दैनन् — जोडीले तपाईंको बानी देखाउँछन्।'
  }));

  const mahaEn = d.current?.planet || d.snapshot?.mahaDasha || d.summary?.currentMahadashaPlanet || '';
  const antarEn = d.antar?.antarLord || d.snapshot?.antarDasha || d.summary?.currentAntardashaLord || '';
  const mahaP = pBy(chart, mahaEn);
  const antarP = pBy(chart, antarEn);
  const mahaArea = mahaP ? g.area(mahaP.house) : '';
  const antarArea = antarP ? g.area(antarP.house) : '';

  pages.push(pg({
    kicker: 'दशा',
    title: 'अहिले तपाईंको जीवनमा कुन समय चलिरहेको छ?',
    en: 'Your current dasha',
    paragraphs: mahaEn
      ? [
          `अहिलेको महादशा — ${g.planet(mahaEn)}: ${dashaLongTheme(mahaEn)}। ${d.current?.startDateApprox ? `लगभग ${d.current.startDateApprox} देखि ${d.current.endDateApprox || '—'} सम्म।` : ''} ${mahaP ? `यो ग्रह ${g.sign(mahaP.sign)} राशिको ${g.house(mahaP.house)}मा भएकाले ${mahaArea} बारम्बार फर्किन सक्छ।` : ''}`,
          antarEn
            ? `अहिलेको अन्तर्दशा — ${g.planet(antarEn)}: ${dashaShortTheme(antarEn)}। ${d.antar?.startDateApprox ? `लगभग ${d.antar.startDateApprox} देखि ${d.antar.endDateApprox || '—'} सम्म।` : ''} ${antarP ? `${g.house(antarP.house)} — ${antarArea} — अहिले बढी सक्रिय देखिन सक्छ।` : ''}`
            : '',
          antarEn
            ? `दुवै मिल्दा: ${dashaShortTheme(mahaEn)} र ${dashaShortTheme(antarEn)} एकै ठाउँमा छन्।`
            : ''
        ].filter(Boolean)
      : [
          'यो कुण्डलीको पेलोडमा चलिरहेको महादशा स्पष्ट छैन। तलका वर्षहरू अनुमान होइनन् — तपाईंका ग्रह-भावबाट पढिएका जोड हुन्।',
          houseOccLine(g, chart, 10),
          houseOccLine(g, chart, 2)
        ],
    bullets: d.timeline.slice(0, 6).map((row) => `${g.planet(row.planet || row.mahaLord)}: ${row.startDateApprox || ''} → ${row.endDateApprox || ''}`),
    freshPage: true
  }));

  pages.push(pg({
    kicker: 'समयको नक्सा',
    title: 'नजिकका वर्षहरू — कहाँ ध्यान?',
    en: 'Near years from this kundali',
    freshPage: true,
    paragraphs: [
      mahaEn
        ? `यो अवधि ${g.planet(mahaEn)} महादशा${antarEn ? `भित्र ${g.planet(antarEn)} अन्तर्दशा` : ''} सँग जोडिएको छ।`
        : 'दशा नभएकाले नजिकका वर्षहरू दशम र द्वितीय भावबाट पढिन्छ।',
      mahaArea
        ? `यो वर्षको जोड: महादशा ग्रह ${g.planet(mahaEn)} ${mahaP ? `${g.sign(mahaP.sign)} / ${g.house(mahaP.house)}` : ''} — ${mahaArea}। अधुरो काम पूरा गर्ने; एउटा आय वा सीप बाक्लो पार्ने।`
        : houseOccLine(g, chart, 10),
      antarArea
        ? `अर्को खण्ड: अन्तर्दशा ${antarEn ? g.planet(antarEn) : ''} — ${antarArea}। आधार देखिन थाल्ने, सर्त बोलेर र लेखेर स्पष्ट पार्ने समय।`
        : 'नयाँ काम थप्नुअघि अहिलेको काम टुंगिएको छ कि हेर्नुहोस्।',
      saturn
        ? `शनि ${g.sign(saturn.sign)} राशिको ${g.house(saturn.house)}मा भएकाले जिम्मेवारीको पाठ फेरि आउन सक्छ। नयाँ नाटक होइन — टुंग्याउने मौसम।`
        : '',
      `धन: ${moneyFromSecond(g, chart)}`,
      `करियर: ${careerFromTenth(g, h10, namesIn(chart, 10))}`,
      moon
        ? `परिवार: चन्द्रमा ${g.sign(moon.sign)} / ${g.house(moon.house)} — घर र मनको जगलाई समय दिनुहोस्।`
        : ''
    ].filter(Boolean),
    boxes: [
      { label: 'महादशा', text: mahaEn ? `${g.planet(mahaEn)} · ${dashaShortTheme(mahaEn)}` : 'पेलोडमा छैन' },
      { label: 'अन्तर्दशा', text: antarEn ? `${g.planet(antarEn)} · ${dashaShortTheme(antarEn)}` : '—' },
      { label: 'जोड', text: mahaArea || occOrLord(g, chart, 10) }
    ],
    bullets: doNow(g, chart, [Number(mahaP?.house) || 10, Number(antarP?.house) || 2], `अहिलेको कक्षा: ${plabel}`)
  }));

  const phases = lifePhaseCopy(g, { moon, lagna, lagnaEn, saturn, mercury });
  pages.push(pg({
    kicker: 'जीवनका प्रमुख चरण',
    title: 'तपाईंको जीवनका प्रमुख चरण',
    en: 'A story you may recognize',
    paragraphs: phases.flatMap((ph) => [ph.heading, ph.text]),
    quote: 'यो पृष्ठ पढ्दा आफ्नो विगत सम्झिनुहोस् — मिल्यो भने कुण्डली बोलेको हो।'
  }));

  pages.push(pg({
    kicker: 'बल र चुनौती',
    title: 'तपाईंका बल र चुनौती',
    en: 'What carries you — and what asks for care',
    paragraphs: [
      'बल र चुनौती एउटै स्वभावका दुई पाटा हुन्। चुनौती देख्नु भनेको त्यसलाई सम्हाल्ने बाटो देख्नु हो।',
      saturn
        ? `अभ्यास १: ${g.planet('Saturn')} ${g.house(saturn.house)} (${g.area(saturn.house)}) — दैनिक एउटा नछुट्टिने काम।`
        : 'अभ्यास १: दैनिक एउटा नछुट्टिने काम।',
      mercury
        ? `अभ्यास २: ${g.planet('Mercury')} ${g.house(mercury.house)} — हप्तामा एकपटक बोली/लेखन फर्केर हेर्ने।`
        : 'अभ्यास २: वाणीमा ध्यान।',
      moon
        ? `अभ्यास ३: चन्द्रमा ${g.house(moon.house)} — निद्रा र एउटा विश्वासिलो कुराकानी।`
        : 'अभ्यास ३: मनलाई नियमित आराम।'
    ],
    bullets: [
      `लग्न ${lagna} — ${lagnaImpression(lagnaEn)}`,
      moon ? `मन: चन्द्रमा ${moonSign} ${g.house(moon.house)}` : 'मन: चन्द्रमा स्थिति छैन',
      saturn ? `लगन: शनि ${g.sign(saturn.sign)} ${g.house(saturn.house)}` : 'लगन: शनि स्थिति छैन',
      mercury ? `वाणी: बुध ${g.sign(mercury.sign)} ${g.house(mercury.house)}` : 'वाणी: बुध स्थिति छैन',
      `करियर संकेत: ${occOrLord(g, chart, 10)}`,
      rahu ? `राहु ${g.sign(rahu.sign)} ${g.house(rahu.house)} — नयाँ क्षेत्रको भोक` : 'राहु स्थिति उपलब्ध छैन'
    ]
  }));

  pages.push(pg({
    kicker: 'एक पृष्ठ',
    title: 'तपाईंको कुण्डली — एक नजरमा',
    freshPage: true,
    table: {
      headers: ['क्षेत्र', 'तपाईंको मुख्य संकेत'],
      rows: [
        ['व्यक्तित्व', `बाहिर ${lagna}; भित्र ${moonSign}${moon?.house ? ` (${g.house(moon.house)})` : ''}`],
        ['करियर', occOrLord(g, chart, 10)],
        ['धन', occOrLord(g, chart, 2)],
        ['प्रेम', occOrLord(g, chart, 7)],
        ['स्वास्थ्य', occOrLord(g, chart, 6)],
        ['विदेश', `नवम ${occOrLord(g, chart, 9)} · द्वादश ${occOrLord(g, chart, 12)}`],
        ['अहिलेको समय', plabel]
      ]
    },
    paragraphs: [
      `लग्न ${lagna} · चन्द्रमा ${moonSign} · सूर्य ${sunSign} · संकेत ${kundaliCode(chart)}`,
      'सुझाव: चलिरहेको दशा ग्रह बसेको भावमा सानो लगातार काम। कुण्डलीले ढाँचा देखाउँछ; प्रयोग तपाईंको निर्णय हो।',
      'यो प्रतिवेदनमा उल्लेखित ढाँचा आफ्नो करियर, पैसा, सम्बन्ध र भावनासँग तुलना गर्नुहोस् — मिल्यो भने कुण्डली बोलेको हो।'
    ]
  }));

  pages.push(pg({
    kicker: 'विधि',
    title: 'महत्त्वपूर्ण जानकारी',
    paragraphs: [
      'यो प्रतिवेदन तपाईंले उपलब्ध गराउनुभएको जन्ममिति, जन्मसमय र जन्मस्थानमा आधारित वैदिक ज्योतिषीय व्याख्या हो। ग्रहस्थितिका लागि Swiss Ephemeris तथा लाहिरी अयनांश प्रयोग गरिएको छ।',
      'ज्योतिषीय फलादेशलाई निश्चित वा शतप्रतिशत सुनिश्चित भविष्यवाणीका रूपमा लिनु हुँदैन। जन्म विवरणको शुद्धता, गणना पद्धति र व्याख्याअनुसार परिणाम फरक पर्न सक्छन्।',
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
