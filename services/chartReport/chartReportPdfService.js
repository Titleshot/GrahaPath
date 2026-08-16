const PDFDocument = require('pdfkit');
const { buildReportSections, planetByName } = require('./reportNarrative');

const GOLD = '#8a6a1a';
const INK = '#1c1c1c';
const MUTED = '#4a4a4a';

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function drawKundaliWheel(doc, chart, cx, cy, outerR) {
  const innerR = outerR * 0.17;
  const midR = outerR * 0.73;
  const labelR = outerR * 0.9;
  const planetR = outerR * 0.68;

  doc.save();
  doc.circle(cx, cy, outerR).lineWidth(1.6).strokeColor(GOLD).stroke();
  doc.circle(cx, cy, outerR * 0.73).lineWidth(0.6).strokeColor('#c4a35a').stroke();
  doc.circle(cx, cy, outerR * 0.38).lineWidth(0.5).strokeColor('#c4a35a').stroke();

  for (let i = 0; i < 12; i += 1) {
    const a = i * 30;
    const outer = polar(cx, cy, outerR, a);
    const inner = polar(cx, cy, innerR, a);
    doc
      .moveTo(inner.x, inner.y)
      .lineTo(outer.x, outer.y)
      .lineWidth(0.7)
      .strokeColor(GOLD)
      .stroke();
    const label = polar(cx, cy, labelR, a + 15);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(GOLD).text(`H${i + 1}`, label.x - 10, label.y - 4, {
      width: 20,
      align: 'center'
    });
  }

  const planets = chart?.planets || [];
  for (let house = 1; house <= 12; house += 1) {
    const inHouse = planets.filter((p) => Number(p.house) === house);
    inHouse.forEach((p, idx) => {
      const spread = inHouse.length > 1 ? (idx - (inHouse.length - 1) / 2) * 9 : 0;
      const pos = polar(cx, cy, planetR, (house - 1) * 30 + 15 + spread);
      doc.circle(pos.x, pos.y, 9).fillColor('#111111').fill();
      doc.circle(pos.x, pos.y, 9).lineWidth(0.8).strokeColor(GOLD).stroke();
      const glyph = String(p.symbol || p.name || '?').slice(0, 2);
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#f3e6c4').text(glyph, pos.x - 8, pos.y - 3, {
        width: 16,
        align: 'center'
      });
    });
  }

  doc.circle(cx, cy, innerR + 8).fillColor('#0b0b0b').fill();
  doc.font('Helvetica').fontSize(7).fillColor(GOLD).text('LAGNA', cx - 24, cy - 12, { width: 48, align: 'center' });
  doc
    .font('Times-Bold')
    .fontSize(9)
    .fillColor('#f7e7b8')
    .text(String(chart?.ascendant || '—'), cx - 36, cy + 2, { width: 72, align: 'center' });
  doc.restore();
}

function safeFilename(name) {
  return String(name || 'chart')
    .replace(/[^\w\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 42) || 'chart';
}

class Writer {
  constructor(doc) {
    this.doc = doc;
    this.left = doc.page.margins.left;
    this.width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

  bottom() {
    return this.doc.page.height - this.doc.page.margins.bottom;
  }

  ensure(space = 48) {
    if (this.doc.y + space > this.bottom()) this.doc.addPage();
  }

  h1(text) {
    this.ensure(72);
    this.doc.moveDown(0.25);
    this.doc.font('Times-Bold').fontSize(16).fillColor(INK).text(text, this.left, this.doc.y, {
      width: this.width,
      align: 'left'
    });
    this.doc
      .moveTo(this.left, this.doc.y + 6)
      .lineTo(this.left + 120, this.doc.y + 6)
      .lineWidth(0.8)
      .strokeColor(GOLD)
      .stroke();
    this.doc.moveDown(0.8);
  }

  p(text) {
    const t = String(text || '').trim();
    if (!t) return;
    this.ensure(40);
    this.doc.font('Times-Roman').fontSize(11).fillColor(INK).text(t, this.left, this.doc.y, {
      width: this.width,
      align: 'justify',
      lineGap: 2.4
    });
    this.doc.moveDown(0.45);
  }
}

function writeCover(doc, chart) {
  const w = new Writer(doc);
  doc.font('Helvetica').fontSize(10).fillColor(GOLD).text('GRAHAPATH  ·  CHART REPORT', w.left, 64, {
    width: w.width,
    align: 'center'
  });
  doc.moveDown(1.2);
  doc.font('Times-Bold').fontSize(28).fillColor(INK).text(chart?.name || 'Birth Chart', {
    width: w.width,
    align: 'center'
  });
  doc.moveDown(0.4);
  doc
    .font('Times-Italic')
    .fontSize(12)
    .fillColor(MUTED)
    .text('A full kundali reading generated from your calculated chart', {
      width: w.width,
      align: 'center'
    });
  doc.moveDown(0.8);
  const meta = [
    chart?.place || chart?.location?.displayName,
    chart?.localDateTime || chart?.birthDateAD,
    chart?.timezone,
    `Lagna ${chart?.ascendant || '—'}  ·  Moon ${chart?.moonSign || '—'}  ·  Sun ${chart?.sunSign || '—'}`
  ]
    .filter(Boolean)
    .join('\n');
  doc.font('Times-Roman').fontSize(11).fillColor(INK).text(meta, { width: w.width, align: 'center' });

  const cx = doc.page.width / 2;
  const cy = 430;
  drawKundaliWheel(doc, chart, cx, cy, 168);

  doc.font('Times-Roman').fontSize(9).fillColor(MUTED).text(
    'Kundali wheel — whole-sign houses from lagna. Glyphs mark grahas in the houses they occupy.',
    72,
    640,
    { width: doc.page.width - 144, align: 'center' }
  );
}

function writeWheelKey(doc, chart) {
  const w = new Writer(doc);
  doc.addPage();
  w.h1('Kundali picture — how to read the wheel');
  w.p(
    'The diagram on the cover is your chart as a circle. House 1 (H1) is lagna. Houses run counterclockwise in thirty-degree slices. Each filled marker is a graha. If two planets share a house, they sit near each other in that slice.'
  );
  const cx = doc.page.width / 2;
  drawKundaliWheel(doc, chart, cx, 340, 150);
  doc.y = 520;
  const planets = chart?.planets || [];
  planets.forEach((p) => {
    w.p(
      `${p.name}${p.symbol ? ` (${p.symbol})` : ''}: ${p.sign}, house ${p.house}` +
        (p.nakshatra ? `, ${p.nakshatra}` : '') +
        `${Number.isFinite(Number(p.degree)) ? `, ${Number(p.degree).toFixed(1)}° in sign` : ''}` +
        (p.retrograde ? ', retrograde' : '')
    );
  });
}

function writeFooters(doc, chart) {
  const range = doc.bufferedPageRange();
  const label = String(chart?.name || 'GrahaPath');
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    const y = doc.page.height - 70;
    const width = doc.page.width - 108;
    doc.font('Helvetica').fontSize(8).fillColor('#777777');
    doc.text(`GrahaPath  ·  ${label}`, 54, y, { width, align: 'left', lineBreak: false });
    doc.text(`${i + 1} / ${range.count}`, 54, y, { width, align: 'right', lineBreak: false });
  }
}

function padIfShort(doc, w, getPageCount, minPages = 20) {
  const extras = [
    [
      'Method note',
      'Positions are computed with Swiss Ephemeris and Lahiri ayanamsa. Houses are whole-sign from lagna. This PDF restates those facts in long form so you can study without the chat interface.'
    ],
    [
      'What this report is not',
      'It is not a medical diagnosis, a guarantee of marriage or money, or a substitute for counseling. Timing language is probabilistic. Empty houses are not curses. Retrograde is not a defect.'
    ],
    [
      'How to study in seven days',
      'Day 1: cover wheel only. Day 2: lagna and Moon. Day 3: one career house (10 or 11). Day 4: one relationship house (7 or 5). Day 5: current dasha planet. Day 6: one pressure planet (Saturn, Mars, or Rahu). Day 7: write ten lines of what matched lived life. Keep the PDF; discard the superstition.'
    ],
    [
      'Language of houses, again',
      '1 identity and body. 2 resources and speech. 3 effort and skills. 4 home and rest. 5 intelligence and romance. 6 conflict and service. 7 the other. 8 depth and change. 9 dharma and teachers. 10 vocation. 11 gains and networks. 12 surrender and distance. Re-read the house that felt least comfortable. That is often the growing edge.'
    ],
    [
      'Lights and shadows',
      'Sun wants to be seen. Moon wants to feel safe. Mars wants a clean fight. Mercury wants a clean sentence. Jupiter wants meaning. Venus wants harmony. Saturn wants a finished job. Rahu wants more. Ketu wants less. Your chart is the mix, not a single slogan.'
    ]
  ];
  let i = 0;
  while (getPageCount() < minPages && i < extras.length * 6) {
    const [title, body] = extras[i % extras.length];
    w.h1(`${title}${i >= extras.length ? ` (continued)` : ''}`);
    w.p(body);
    w.p(
      'Return to the kundali picture whenever a paragraph feels abstract. Locate the graha, then locate the house. The picture and the prose are the same chart in two languages.'
    );
    i += 1;
  }
}

function buildChartReportPdf(chart) {
  if (!chart || !Array.isArray(chart.planets) || chart.planets.length === 0) {
    const err = new Error('A calculated chart with planets is required to build the PDF report.');
    err.statusCode = 400;
    throw err;
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 58, bottom: 54, left: 58, right: 58 },
      bufferPages: true,
      info: {
        Title: `GrahaPath Chart Report — ${chart.name || 'Native'}`,
        Author: 'GrahaPath',
        Subject: 'Vedic birth-chart reading generated from calculated positions'
      }
    });
    const chunks = [];
    let pageCount = 1;
    doc.on('pageAdded', () => {
      pageCount += 1;
    });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    writeCover(doc, chart);
    writeWheelKey(doc, chart);

    const w = new Writer(doc);
    const sections = buildReportSections(chart);
    sections.forEach((section) => {
      w.h1(section.title);
      (section.paragraphs || []).forEach((para) => w.p(para));
    });

    padIfShort(doc, w, () => pageCount, 22);
    writeFooters(doc, chart);
    doc.end();
  });
}

module.exports = {
  buildChartReportPdf,
  safeFilename
};
