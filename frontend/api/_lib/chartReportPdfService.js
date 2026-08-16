const path = require('path');
const PDFDocument = require('pdfkit');
const { buildMahabhavishyaPages } = require('./reportNarrative');

const FONT_REG = path.join(__dirname, 'fonts', 'Hind-Regular.ttf');
const FONT_BOLD = path.join(__dirname, 'fonts', 'Hind-Bold.ttf');

function attachFonts(doc) {
  doc.registerFont('Noto', FONT_REG);
  doc.registerFont('Noto-Bold', FONT_BOLD);
}

function txt(doc, str, x, y, opts = {}) {
  return doc.text(str, x, y, { features: [], ...opts });
}

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
    return this.doc.page.height - 80;
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
    this.doc.font('Noto').fontSize(9).fillColor(GOLD);
    txt(this.doc, String(text || ''), this.left, this.doc.y, { width: this.width });
    this.doc.moveDown(0.3);
  }

  h1(text) {
    this.ensure(52);
    this.doc.font('Noto-Bold').fontSize(20).fillColor(NAVY);
    txt(this.doc, String(text || ''), this.left, this.doc.y, { width: this.width });
    this.doc.moveTo(this.left, this.doc.y + 8).lineTo(this.left + 72, this.doc.y + 8).lineWidth(1.4).strokeColor(GOLD).stroke();
    this.doc.moveDown(0.7);
  }

  en(text) {
    const t = String(text || '').trim();
    if (!t) return;
    this.ensure(20);
    this.doc.font('Noto').fontSize(9).fillColor(MUTED);
    txt(this.doc, t, this.left, this.doc.y, { width: this.width });
    this.doc.moveDown(0.45);
  }

  p(text) {
    const t = String(text || '').trim();
    if (!t) return;
    t.split('\n').forEach((line) => {
      const s = line.trim();
      if (!s) return;
      this.ensure(36);
      this.doc.font('Noto').fontSize(11).fillColor(INK);
      txt(this.doc, s, this.left, this.doc.y, { width: this.width, align: 'left', lineGap: 3 });
      this.doc.moveDown(0.4);
    });
  }

  bullets(items) {
    (items || []).forEach((item) => {
      const t = String(item || '').trim();
      if (!t) return;
      this.ensure(28);
      this.doc.font('Noto').fontSize(11).fillColor(INK);
      txt(this.doc, `•  ${t}`, this.left, this.doc.y, { width: this.width, lineGap: 2 });
      this.doc.moveDown(0.26);
    });
  }

  boxes(list) {
    const items = (list || []).filter((b) => b && b.text);
    if (!items.length) return;
    this.ensure(92);
    const gap = 10;
    const w = (this.width - gap * (items.length - 1)) / items.length;
    const y = this.doc.y;
    items.forEach((b, i) => {
      const x = this.left + i * (w + gap);
      this.doc.roundedRect(x, y, w, 82, 6).fillAndStroke('#fffdf8', GOLD);
      this.doc.font('Noto-Bold').fontSize(8).fillColor(GOLD);
      txt(this.doc, String(b.label || ''), x + 8, y + 10, { width: w - 16 });
      this.doc.font('Noto').fontSize(9).fillColor(NAVY);
      txt(this.doc, String(b.text), x + 8, y + 28, { width: w - 16, height: 48 });
    });
    this.doc.y = y + 94;
  }

  table(table) {
    if (!table?.rows?.length) return;
    const cols = table.headers?.length || 2;
    const widths = cols === 4 ? [40, 160, 90, this.width - 290] : cols === 2 ? [150, this.width - 150] : Array(cols).fill(this.width / cols);
    const drawRow = (cells, header) => {
      this.ensure(24);
      let x = this.left;
      const y = this.doc.y;
      cells.forEach((cell, i) => {
        const w = widths[i];
        if (header) this.doc.rect(x, y, w, 20).fill(NAVY);
        this.doc.font(header ? 'Noto-Bold' : 'Noto').fontSize(8).fillColor(header ? GOLD2 : INK);
        txt(this.doc, String(cell || ''), x + 4, y + 5, { width: w - 8, height: 14, ellipsis: true, lineBreak: false });
        x += w;
      });
      this.doc.y = y + 20;
    };
    if (table.headers) drawRow(table.headers, true);
    table.rows.forEach((row) => drawRow(row, false));
    this.doc.moveDown(0.5);
  }

  basis(text) {
    const t = String(text || '').trim();
    if (!t) return;
    this.ensure(40);
    const y = this.doc.y;
    this.doc.roundedRect(this.left, y, this.width, 36, 4).fillAndStroke('#f3eee4', '#ddd2bc');
    this.doc.font('Noto-Bold').fontSize(7).fillColor(GOLD);
    txt(this.doc, 'Chart basis', this.left + 8, y + 6, { width: this.width - 16 });
    this.doc.font('Noto').fontSize(8).fillColor(MUTED);
    txt(this.doc, t, this.left + 8, y + 18, { width: this.width - 16, height: 14, ellipsis: true });
    this.doc.y = y + 46;
  }
}

function writeCover(doc, chart, cover) {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);
  doc.rect(28, 28, doc.page.width - 56, doc.page.height - 56).lineWidth(0.8).strokeColor(GOLD).stroke();
  doc.restore();

  const cx = doc.page.width / 2;
  doc.font('Noto').fontSize(11).fillColor(GOLD);
  txt(doc, cover.kicker || 'GRAHAPATH', 54, 72, { width: doc.page.width - 108, align: 'center' });
  doc.font('Noto-Bold').fontSize(28).fillColor(IVORY);
  txt(doc, cover.title || 'तपाईंको महाभविष्यफल', 54, 108, { width: doc.page.width - 108, align: 'center' });
  doc.font('Noto').fontSize(13).fillColor(GOLD2);
  txt(doc, cover.subtitle || 'Personalized Vedic Astrology Report', 54, 168, { width: doc.page.width - 108, align: 'center' });
  doc.font('Noto-Bold').fontSize(24).fillColor(IVORY);
  txt(doc, cover.name || chart?.name || 'You', 54, 210, { width: doc.page.width - 108, align: 'center' });
  const meta = [cover.date, cover.time, cover.place].filter(Boolean).join('\n');
  doc.font('Noto').fontSize(12).fillColor(GOLD2);
  txt(doc, meta, 54, 248, { width: doc.page.width - 108, align: 'center' });

  drawKundaliWheel(doc, chart, cx, 455, 158, { dark: true });
  doc.font('Noto').fontSize(10).fillColor(GOLD);
  txt(doc, 'व्यक्तिगत ज्योतिषीय विश्लेषण', 54, 650, { width: doc.page.width - 108, align: 'center' });
}

function writeContentPage(doc, chart, spec) {
  doc.addPage();
  paintIvory(doc);
  doc.y = 52;
  const w = new Writer(doc);
  if (spec.kicker) w.kicker(spec.kicker);
  if (spec.title) w.h1(spec.title);
  if (spec.en) w.en(spec.en);
  if (spec.showWheel) {
    w.ensure(240);
    drawKundaliWheel(doc, chart, doc.page.width / 2, doc.y + 120, 118, { dark: false });
    doc.y += 250;
  }
  (spec.paragraphs || []).forEach((p) => w.p(p));
  if (spec.boxes?.length) w.boxes(spec.boxes);
  if (spec.bullets?.length) w.bullets(spec.bullets);
  if (spec.table) w.table(spec.table);
  if (spec.basis) w.basis(spec.basis);
}

function writeFooters(doc, chart) {
  const range = doc.bufferedPageRange();
  const total = range.count;
  const label = String(chart?.name || 'GrahaPath');
  for (let i = 0; i < total; i += 1) {
    doc.switchToPage(range.start + i);
    const y = 742;
    const cover = i === 0;
    doc.font('Noto').fontSize(8).fillColor(cover ? GOLD : MUTED);
    txt(doc, cover ? 'GRAHAPATH' : `GrahaPath  ·  ${label}`, 54, y, {
      width: 360,
      align: 'left',
      lineBreak: false,
      height: 12
    });
    txt(doc, `${i + 1} / ${total}`, 54, y, {
      width: doc.page.width - 108,
      align: 'right',
      lineBreak: false,
      height: 12
    });
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
      margins: { top: 52, bottom: 72, left: 54, right: 54 },
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: `GrahaPath Mahabhavishyafal — ${chart.name || 'Personalized report'}`,
        Author: 'GrahaPath',
        Subject: 'Personalized Vedic astrology report from calculated kundali'
      }
    });
    attachFonts(doc);
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
