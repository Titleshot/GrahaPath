const PDFDocument = require('pdfkit');
const { buildMahabhavishyaPages } = require('./reportNarrative');

const NAVY = '#0b1a33';
const NAVY2 = '#12243f';
const GOLD = '#c4a35a';
const GOLD2 = '#e8d5a3';
const IVORY = '#f7f1e6';
const INK = '#1a1f2b';
const MUTED = '#5c6370';

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function drawKundaliWheel(doc, chart, cx, cy, outerR, { dark } = { dark: false }) {
  const innerR = outerR * 0.17;
  const labelR = outerR * 0.9;
  const planetR = outerR * 0.68;
  const stroke = dark ? GOLD : '#8a6a1a';
  const fillGlyph = dark ? GOLD2 : '#f3e6c4';

  doc.save();
  doc.circle(cx, cy, outerR).lineWidth(1.8).strokeColor(stroke).stroke();
  doc.circle(cx, cy, outerR * 0.73).lineWidth(0.6).strokeColor(stroke).stroke();
  doc.circle(cx, cy, outerR * 0.38).lineWidth(0.5).strokeColor(stroke).stroke();

  for (let i = 0; i < 12; i += 1) {
    const a = i * 30;
    const outer = polar(cx, cy, outerR, a);
    const inner = polar(cx, cy, innerR, a);
    doc.moveTo(inner.x, inner.y).lineTo(outer.x, outer.y).lineWidth(0.7).strokeColor(stroke).stroke();
    const label = polar(cx, cy, labelR, a + 15);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(stroke).text(`H${i + 1}`, label.x - 10, label.y - 4, {
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
      doc.circle(pos.x, pos.y, 9).fillColor(dark ? '#07101f' : '#111111').fill();
      doc.circle(pos.x, pos.y, 9).lineWidth(0.8).strokeColor(stroke).stroke();
      const glyph = String(p.symbol || p.name || '?').slice(0, 2);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(fillGlyph).text(glyph, pos.x - 8, pos.y - 3, {
        width: 16,
        align: 'center'
      });
    });
  }

  doc.circle(cx, cy, innerR + 10).fillColor(dark ? '#07101f' : '#0b0b0b').fill();
  doc.font('Helvetica').fontSize(7).fillColor(GOLD).text('LAGNA', cx - 24, cy - 12, { width: 48, align: 'center' });
  doc.font('Times-Bold').fontSize(10).fillColor(GOLD2).text(String(chart?.ascendant || '—'), cx - 36, cy + 2, {
    width: 72,
    align: 'center'
  });
  doc.restore();
}

function safeFilename(name) {
  return (
    String(name || 'chart')
      .replace(/[^\w\-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 42) || 'chart'
  );
}

function paintIvory(doc) {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(IVORY);
  doc.restore();
}

class Writer {
  constructor(doc) {
    this.doc = doc;
    this.left = 54;
    this.width = doc.page.width - 108;
  }

  bottom() {
    return this.doc.page.height - 64;
  }

  ensure(space = 52) {
    if (this.doc.y + space > this.bottom()) {
      this.doc.addPage();
      paintIvory(this.doc);
      this.doc.y = 56;
    }
  }

  kicker(text) {
    this.ensure(28);
    this.doc.font('Helvetica').fontSize(8).fillColor(GOLD).text(String(text || '').toUpperCase(), this.left, this.doc.y, {
      width: this.width,
      characterSpacing: 1.4
    });
    this.doc.moveDown(0.35);
  }

  h1(text) {
    this.ensure(56);
    this.doc.font('Times-Bold').fontSize(22).fillColor(NAVY).text(text, this.left, this.doc.y, { width: this.width });
    this.doc.moveTo(this.left, this.doc.y + 8).lineTo(this.left + 72, this.doc.y + 8).lineWidth(1.4).strokeColor(GOLD).stroke();
    this.doc.moveDown(0.85);
  }

  p(text) {
    const t = String(text || '').trim();
    if (!t) return;
    t.split('\n').forEach((line) => {
      const s = line.trim();
      if (!s) return;
      this.ensure(36);
      this.doc.font('Times-Roman').fontSize(11).fillColor(INK).text(s, this.left, this.doc.y, {
        width: this.width,
        align: 'justify',
        lineGap: 2.6
      });
      this.doc.moveDown(0.42);
    });
  }

  bullets(items) {
    (items || []).forEach((item) => {
      const t = String(item || '').trim();
      if (!t) return;
      this.ensure(28);
      this.doc.font('Times-Roman').fontSize(11).fillColor(INK).text(`•  ${t}`, this.left, this.doc.y, {
        width: this.width,
        lineGap: 2
      });
      this.doc.moveDown(0.28);
    });
  }

  boxes(list) {
    const items = (list || []).filter((b) => b && b.text);
    if (!items.length) return;
    this.ensure(88);
    const gap = 10;
    const w = (this.width - gap * (items.length - 1)) / items.length;
    const y = this.doc.y;
    items.forEach((b, i) => {
      const x = this.left + i * (w + gap);
      this.doc.roundedRect(x, y, w, 78, 6).fillAndStroke('#fffdf8', GOLD);
      this.doc.font('Helvetica-Bold').fontSize(7).fillColor(GOLD).text(String(b.label || '').toUpperCase(), x + 8, y + 10, {
        width: w - 16
      });
      this.doc.font('Times-Roman').fontSize(9).fillColor(NAVY).text(String(b.text), x + 8, y + 26, {
        width: w - 16,
        height: 46
      });
    });
    this.doc.y = y + 90;
  }

  table(table) {
    if (!table?.rows?.length) return;
    const cols = table.headers?.length || 4;
    const widths = cols === 4 ? [46, 150, 90, this.width - 286] : Array(cols).fill(this.width / cols);
    const drawRow = (cells, header) => {
      this.ensure(22);
      let x = this.left;
      const y = this.doc.y;
      cells.forEach((cell, i) => {
        const w = widths[i];
        if (header) this.doc.rect(x, y, w, 18).fill(NAVY);
        this.doc
          .font(header ? 'Helvetica-Bold' : 'Times-Roman')
          .fontSize(header ? 8 : 8.5)
          .fillColor(header ? GOLD2 : INK)
          .text(String(cell || ''), x + 4, y + 4, { width: w - 8, height: 14, ellipsis: true });
        x += w;
      });
      this.doc.y = y + 18;
    };
    if (table.headers) drawRow(table.headers, true);
    table.rows.forEach((row) => drawRow(row, false));
    this.doc.moveDown(0.6);
  }

  meters(list) {
    (list || []).forEach((m) => {
      this.ensure(28);
      const y = this.doc.y;
      this.doc.font('Times-Bold').fontSize(10).fillColor(NAVY).text(m.label, this.left, y, { width: 120 });
      const bx = this.left + 128;
      const bw = this.width - 128;
      this.doc.roundedRect(bx, y + 2, bw, 10, 3).fill('#e6dfd2');
      this.doc.roundedRect(bx, y + 2, Math.max(8, bw * Number(m.value || 0)), 10, 3).fill(GOLD);
      this.doc.y = y + 22;
    });
    this.doc.moveDown(0.3);
  }
}

function writeCover(doc, chart, cover) {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);
  doc.rect(28, 28, doc.page.width - 56, doc.page.height - 56).lineWidth(0.8).strokeColor(GOLD).stroke();
  doc.restore();

  const cx = doc.page.width / 2;
  doc.font('Helvetica').fontSize(11).fillColor(GOLD).text(cover.kicker || 'GRAHAPATH', 54, 72, {
    width: doc.page.width - 108,
    align: 'center',
    characterSpacing: 4
  });
  doc.font('Times-Bold').fontSize(32).fillColor(IVORY).text(cover.title || 'तपाईंको महाभविष्यफल', 54, 108, {
    width: doc.page.width - 108,
    align: 'center'
  });
  doc.font('Times-Italic').fontSize(13).fillColor(GOLD2).text(cover.subtitle || 'Personalized Vedic Astrology Report', 54, 168, {
    width: doc.page.width - 108,
    align: 'center'
  });
  doc.font('Times-Bold').fontSize(26).fillColor(IVORY).text(cover.name || chart?.name || 'You', 54, 210, {
    width: doc.page.width - 108,
    align: 'center'
  });
  const meta = [cover.date, cover.time, cover.place].filter(Boolean).join('\n');
  doc.font('Times-Roman').fontSize(12).fillColor(GOLD2).text(meta, 54, 248, {
    width: doc.page.width - 108,
    align: 'center'
  });

  drawKundaliWheel(doc, chart, cx, 455, 158, { dark: true });
  doc.font('Helvetica').fontSize(9).fillColor(GOLD).text('३०+ पृष्ठको व्यक्तिगत ज्योतिषीय विश्लेषण', 54, 650, {
    width: doc.page.width - 108,
    align: 'center'
  });
}

function writeContentPage(doc, chart, spec) {
  doc.addPage();
  paintIvory(doc);
  doc.y = 52;
  const w = new Writer(doc);
  if (spec.kicker) w.kicker(spec.kicker);
  if (spec.title) w.h1(spec.title);
  if (spec.showWheel) {
    w.ensure(240);
    drawKundaliWheel(doc, chart, doc.page.width / 2, doc.y + 120, 118, { dark: false });
    doc.y += 250;
  }
  (spec.paragraphs || []).forEach((p) => w.p(p));
  if (spec.boxes?.length) w.boxes(spec.boxes);
  if (spec.bullets?.length) w.bullets(spec.bullets);
  if (spec.table) w.table(spec.table);
  if (spec.meters?.length) w.meters(spec.meters);
}

function writeFooters(doc, chart) {
  const range = doc.bufferedPageRange();
  const label = String(chart?.name || 'GrahaPath');
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    const y = doc.page.height - 42;
    const width = doc.page.width - 108;
    const cover = i === 0;
    doc.font('Helvetica').fontSize(8).fillColor(cover ? GOLD : MUTED);
    doc.text(cover ? 'GRAHAPATH  ·  MAHABHAVISHYAFAL' : `GrahaPath  ·  ${label}`, 54, y, {
      width,
      align: 'left',
      lineBreak: false
    });
    doc.text(`${i + 1} / ${range.count}`, 54, y, { width, align: 'right', lineBreak: false });
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
      margins: { top: 52, bottom: 56, left: 54, right: 54 },
      bufferPages: true,
      info: {
        Title: `GrahaPath महाभविष्यफल — ${chart.name || 'Personalized report'}`,
        Author: 'GrahaPath',
        Subject: 'Personalized Vedic astrology report from calculated kundali'
      }
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pages = buildMahabhavishyaPages(chart);
    const cover = pages.find((p) => p.kind === 'cover') || pages[0];
    writeCover(doc, chart, cover);

    const rest = pages.filter((p) => p.kind !== 'cover');
    rest.forEach((spec) => writeContentPage(doc, chart, spec));

    writeFooters(doc, chart);
    doc.end();
  });
}

module.exports = {
  buildChartReportPdf,
  safeFilename
};
