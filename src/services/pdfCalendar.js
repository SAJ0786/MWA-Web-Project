// Renders the monthly PDF calendar onto a canvas and embeds each page in an A4 PDF (jsPDF, lazy-loaded).
// Two templates:
//   decorative (default, portrait) - MWA artwork with its month-specific text erased (scripts/build-pdf-template.py)
//   classic    (landscape)         - plain light-blue sheet with the building photo and a table
// Only the first page carries the header; continuation pages contain just table rows (and notes).
import bgUrl from '../assets/pdf-template-bg.jpg';
import logoUrl from '../assets/mwa-logo.png';
import photoUrl from '../assets/pdf-classic-photo.jpg';

const SCALE = 2;
const GREEN = '#0b3b2e', GOLD = '#b08d3f', CREAM_TXT = '#f6ecd0', INK = '#2d2d2d', NAVY = '#1b1b6b';
const SERIF = "'Playfair Display', 'Times New Roman', Georgia, serif";
const BODY = "'Times New Roman', 'Liberation Serif', Georgia, serif";
const SANS = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
const ARABIC = "'Amiri', 'Noto Naskh Arabic', 'Traditional Arabic', 'Times New Roman', serif";

const TEMPLATES = {
  decorative: {
    W: 864, H: 1223, orientation: 'portrait', mmW: 210, mmH: 297,
    cols: { x0: 28, x1: 838, c1: 110, c2: 267, c3: 590 },
    colW: 464, minH: 60, pad: 16,
    tFont: `bold 21px ${BODY}`, tLH: 24, dFont: `15px ${BODY}`, dLH: 19, deptLH: 20, deptFont: `bold 15px ${BODY}`,
    tColor: GREEN, dColor: '#444', deptColor: NAVY, rowFont: 19, rowColor: INK,
    firstTop: 664, contTop: 104, bottom: 1040,
    noteFont: `15px ${BODY}`, noteLH: 20, noteColor: '#444', noteX: 40, noteW: 780
  },
  classic: {
    W: 1170, H: 827, orientation: 'landscape', mmW: 297, mmH: 210,
    cols: { x0: 69, x1: 1099, c1: 166, c2: 347, c3: 764, lines: [264, 430] },
    colW: 620, minH: 50, pad: 14,
    tFont: `bold 19px ${SANS}`, tLH: 24, dFont: `18px ${BODY}`, dLH: 22, deptLH: 22, deptFont: `18px ${BODY}`,
    tColor: '#111', dColor: '#333', deptColor: '#1414c8', rowFont: 21, rowColor: '#222',
    firstTop: 477, contTop: 91, bottom: 790,
    noteFont: `19px ${SANS}`, noteLH: 27, noteColor: '#858b91', noteX: 76, noteW: 1010
  }
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load PDF artwork'));
    img.src = src;
  });
}

async function ensureFonts() {
  if (!document.fonts?.load) return;
  const wants = [`700 40px 'Playfair Display'`, `700 40px 'Amiri'`, `400 40px 'Amiri'`];
  await Promise.all(wants.map(f => document.fonts.load(f, 'Aa \u0631\u0628\u064a\u0639').catch(() => null)));
}

function setSpacing(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`; }

// Shrinks the font until the text fits maxW.
function fit(ctx, text, fontFn, size, maxW, min = 10) {
  let s = size;
  ctx.font = fontFn(s);
  while (ctx.measureText(text).width > maxW && s > min) { s -= 1; ctx.font = fontFn(s); }
  return s;
}

function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxW && cur) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Centered run of text segments where {sup:true} segments are small and raised (e.g. "10th").
function drawRich(ctx, segs, cx, y, size, color) {
  const supSize = size * 0.6;
  const widths = segs.map(s => { ctx.font = `${s.sup ? supSize : size}px ${BODY}`; return ctx.measureText(s.t).width; });
  let x = cx - widths.reduce((a, b) => a + b, 0) / 2;
  ctx.fillStyle = color; ctx.textAlign = 'left';
  segs.forEach((s, i) => {
    ctx.font = `${s.sup ? supSize : size}px ${BODY}`;
    ctx.fillText(s.t, x, s.sup ? y - size * 0.38 : y);
    x += widths[i];
  });
  ctx.textAlign = 'center';
}

const hijriSegs = h => (h ? [{ t: String(h.day) }, { t: h.suffix, sup: true }, { t: ` ${h.month}` }] : [{ t: '\u2014' }]);
const gregSegs = g => [{ t: `${g.dow}, ${g.day}` }, { t: g.suffix, sup: true }, { t: ` ${g.month}` }];

// Splits rows (and the optional notes block) across pages. Page 1 starts at cfg.firstTop,
// later pages at cfg.contTop (no header).
function layoutPages(ctx, model, cfg, notes) {
  const items = model.rows.map(r => {
    const blocks = r.events.map(e => {
      ctx.font = cfg.tFont;
      const title = wrap(ctx, e.pending ? `${e.title} (Pending)` : e.title, cfg.colW);
      ctx.font = cfg.dFont;
      const detail = wrap(ctx, e.detail, cfg.colW);
      const h = title.length * cfg.tLH + detail.length * cfg.dLH + (e.department ? cfg.deptLH : 0);
      return { ...e, titleLines: title, detailLines: detail, h };
    });
    const content = blocks.reduce((n, b) => n + b.h, 0) + (blocks.length - 1) * 10;
    return { ...r, blocks, content, height: Math.max(cfg.minH, content + cfg.pad) };
  });
  if (notes.length) {
    ctx.font = cfg.noteFont;
    const lines = notes.flatMap(n => wrap(ctx, `* ${n}`, cfg.noteW));
    items.push({ isNotes: true, lines, height: lines.length * cfg.noteLH + 26 });
  }
  const pages = [{ items: [], top: cfg.firstTop }];
  let y = cfg.firstTop;
  for (const it of items) {
    const cur = pages[pages.length - 1];
    if (y + it.height > cfg.bottom && cur.items.length) {
      pages.push({ items: [], top: cfg.contTop });
      y = cfg.contTop;
    }
    pages[pages.length - 1].items.push(it);
    y += it.height;
  }
  return pages;
}

function drawItems(ctx, cfg, page, emptyMsg) {
  const { cols } = cfg;
  let y = page.top;
  if (cfg.drawGrid && page.items.length) { // top rule for continuation pages
    ctx.strokeStyle = cfg.gridColor; ctx.lineWidth = 1;
    if (page.top === cfg.contTop) { ctx.beginPath(); ctx.moveTo(cols.x0, y); ctx.lineTo(cols.x1, y); ctx.stroke(); }
  }
  if (!page.items.length) {
    ctx.font = `italic 19px ${BODY}`; ctx.fillStyle = '#6b6b6b'; ctx.textAlign = 'center';
    ctx.fillText(emptyMsg, (cols.x0 + cols.x1) / 2, y + 50);
    return;
  }
  for (const r of page.items) {
    if (r.isNotes) {
      ctx.textAlign = 'left'; ctx.font = cfg.noteFont; ctx.fillStyle = cfg.noteColor;
      r.lines.forEach((l, i) => ctx.fillText(l, cfg.noteX, y + 26 + i * cfg.noteLH));
      ctx.textAlign = 'center';
      y += r.height;
      continue;
    }
    const mid = y + r.height / 2 + 6;
    drawRich(ctx, hijriSegs(r.hijri), cols.c1, mid, cfg.rowFont, cfg.rowColor);
    drawRich(ctx, gregSegs(r.greg), cols.c2, mid, cfg.rowFont, cfg.rowColor);
    let ey = y + (r.height - r.content) / 2;
    for (const b of r.blocks) {
      ctx.fillStyle = cfg.tColor; ctx.font = cfg.tFont;
      b.titleLines.forEach(l => { ey += cfg.tLH; ctx.fillText(l, cols.c3, ey - 6); });
      ctx.fillStyle = cfg.dColor; ctx.font = cfg.dFont;
      b.detailLines.forEach(l => { ey += cfg.dLH; ctx.fillText(l, cols.c3, ey - 5); });
      if (b.department) { ctx.fillStyle = cfg.deptColor; ctx.font = cfg.deptFont; ey += cfg.deptLH; ctx.fillText(b.department, cols.c3, ey - 6); }
      ey += 10;
    }
    y += r.height;
    ctx.strokeStyle = cfg.gridColor; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cols.x0, y); ctx.lineTo(cols.x1, y); ctx.stroke();
    if (cfg.drawGrid) {
      ctx.beginPath();
      for (const x of [cols.x0, ...cols.lines, cols.x1]) { ctx.moveTo(x, y - r.height); ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
}

function drawDecorative(ctx, assets, model, page, pageNo, pageCount) {
  const cfg = TEMPLATES.decorative;
  const { W, H } = cfg;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(assets.bg, 0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (pageNo > 1) {
    // Continuation page: no header artwork, the rows panel simply extends to the top.
    ctx.fillStyle = '#0b3b2e';
    ctx.fillRect(0, 0, W, 1062);
    ctx.fillStyle = '#f6edd8';
    ctx.strokeStyle = '#c9a24d'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(6, 16, W - 12, 1060, 16); ctx.fill(); ctx.stroke();
    // Repeat only the column header so the columns stay identifiable.
    const cols = cfg.cols;
    ctx.fillStyle = '#0b3b2e'; ctx.strokeStyle = '#c9a24d'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(cols.x0, 44, cols.x1 - cols.x0, 56, 8); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    for (const x of [192, 344]) { ctx.moveTo(x, 44); ctx.lineTo(x, 100); }
    ctx.stroke();
    ctx.font = `bold 19px ${BODY}`; ctx.fillStyle = CREAM_TXT;
    ctx.fillText('Islamic Dates', cols.c1, 79);
    ctx.fillText('MWA Event Date', cols.c2, 79);
    ctx.fillText('Event', cols.c3, 79);
  } else {
    drawDecorativeHeader(ctx, assets, model);
  }

  drawItems(ctx, { ...cfg, gridColor: '#cdb27a' }, page, 'No events scheduled for this selection.');
  ctx.textAlign = 'right'; ctx.fillStyle = '#333'; ctx.font = `16px ${BODY}`;
  ctx.fillText(model.footerLabel, 832, 1056);
  if (pageCount > 1) { ctx.textAlign = 'left'; ctx.fillText(`Page ${pageNo} of ${pageCount}`, 34, 1056); }
}

function drawDecorativeHeader(ctx, { logo }, model) {
  const cfg = TEMPLATES.decorative;
  // Logo centred at the very top, association name beneath it.
  const lh = 50, lw = lh * logo.width / logo.height;
  ctx.drawImage(logo, 460 - lw / 2, 4, lw, lh);
  const org = 'MUHAMMADI WELFARE ASSOCIATION';
  fit(ctx, org, s => `600 ${s}px ${BODY}`, 27, 560, 16);
  ctx.fillStyle = GREEN;
  ctx.fillText(org, 460, 80);

  // Month title (last word gold when there are several, e.g. RABI SANI).
  const title = model.titleWords.join(' ');
  const ts = fit(ctx, title, s => `700 ${s}px ${SERIF}`, 62, 330, 30);
  ctx.font = `700 ${ts}px ${SERIF}`;
  setSpacing(ctx, 1);
  const total = ctx.measureText(title).width;
  let x = 470 - total / 2;
  ctx.textAlign = 'left';
  model.titleWords.forEach((w, i) => {
    const gold = model.titleWords.length > 1 && i === model.titleWords.length - 1;
    ctx.fillStyle = gold ? GOLD : GREEN;
    ctx.fillText(w, x, 182);
    x += ctx.measureText(`${w} `).width;
  });
  ctx.textAlign = 'center';
  setSpacing(ctx, 0);

  // Arabic month name inside the crescent.
  if (model.arabic) {
    ctx.save();
    ctx.direction = 'rtl';
    const as = fit(ctx, model.arabic, s => `700 ${s}px ${ARABIC}`, 74, 150, 28);
    ctx.font = `700 ${as}px ${ARABIC}`;
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#6b5420'; ctx.fillStyle = '#c9a24d';
    ctx.strokeText(model.arabic, 160, 172);
    ctx.fillText(model.arabic, 160, 172);
    ctx.restore();
  }

  // Year pill and tagline.
  setSpacing(ctx, 3);
  const ps = fit(ctx, model.pill, s => `700 ${s}px ${SERIF}`, 34, 230, 18);
  ctx.font = `700 ${ps}px ${SERIF}`;
  ctx.fillStyle = '#e3c98a';
  ctx.fillText(model.pill, 454, 234);
  setSpacing(ctx, 2.2);
  fit(ctx, model.tagline, s => `${s}px ${SERIF}`, 14, 380, 8);
  ctx.fillStyle = GREEN;
  ctx.fillText(model.tagline, 454, 272);
  setSpacing(ctx, 0);

  // Table header labels.
  ctx.font = `bold 19px ${BODY}`;
  ctx.fillStyle = CREAM_TXT;
  ctx.fillText('Islamic Dates', cfg.cols.c1, 634);
  ctx.fillText('MWA Event Date', cfg.cols.c2, 634);
  ctx.fillText('Event', cfg.cols.c3, 634);
}

function drawClassic(ctx, assets, model, page, pageNo, pageCount) {
  const cfg = { ...TEMPLATES.classic, drawGrid: true, gridColor: '#1d5f8c' };
  const { W, H, cols } = cfg;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#c1e4f7';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';

  if (pageNo === 1) {
    // Association name, stretched to the full table width.
    const org = 'MUHAMMADI WELFARE ASSOCIATION';
    ctx.font = `bold 56px ${SANS}`;
    const sx = 1032 / ctx.measureText(org).width;
    ctx.save();
    ctx.translate(68, 100); ctx.scale(sx, 1);
    ctx.textAlign = 'left'; ctx.fillStyle = '#0f4a69';
    ctx.fillText(org, 0, 0);
    ctx.restore();

    ctx.drawImage(assets.photo, 69, 118, 1025, 234);

    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = `bold 44px ${BODY}`;
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#111';
    ctx.fillText('Monthly Calendar', 62, 388);
    ctx.restore();
    ctx.textAlign = 'right'; ctx.fillStyle = '#2d6a8a';
    fit(ctx, model.footerLabel, s => `300 ${s}px 'Segoe UI', ${SANS}`, 40, 520, 22);
    ctx.fillText(model.footerLabel, 1097, 388);
    ctx.textAlign = 'center';
  }

  // Column header: on every page, so continuation pages stay readable.
  const hy = pageNo === 1 ? 421 : cfg.contTop - 55;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#165f82';
  ctx.fillRect(cols.x0, hy, cols.x1 - cols.x0, 55);
  ctx.strokeStyle = '#8fb6cf'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const x of cols.lines) { ctx.moveTo(x, hy); ctx.lineTo(x, hy + 55); }
  ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `bold 23px ${SANS}`;
  ctx.fillText('Islamic Dates', cols.c1, hy + 35);
  ctx.fillText('MWA', cols.c2, hy + 22);
  ctx.fillText('Event Date', cols.c2, hy + 47);
  ctx.font = `bold 29px ${SANS}`;
  ctx.fillText('Event', cols.c3, hy + 39);

  drawItems(ctx, cfg, page, 'No events scheduled for this selection.');
  if (pageCount > 1) {
    ctx.textAlign = 'right'; ctx.fillStyle = '#5d7f94'; ctx.font = `14px ${SANS}`;
    ctx.fillText(`Page ${pageNo} of ${pageCount}`, 1099, H - 10);
  }
}

/**
 * @param {object} model   from buildPdfModel
 * @param {string} filename
 * @param {{template?: 'decorative'|'classic', notes?: string[]}} [opts]
 */
export async function renderCalendarPdf(model, filename = 'MWA-Calendar.pdf', opts = {}) {
  const template = opts.template === 'classic' ? 'classic' : 'decorative';
  const notes = (opts.notes || []).map(n => String(n).trim()).filter(Boolean);
  const cfg = TEMPLATES[template];
  const [{ jsPDF }, bg, logo, photo] = await Promise.all([
    import('jspdf'),
    template === 'decorative' ? loadImage(bgUrl) : null,
    template === 'decorative' ? loadImage(logoUrl) : null,
    template === 'classic' ? loadImage(photoUrl) : null,
    ensureFonts()
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = cfg.W * SCALE; canvas.height = cfg.H * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const pages = layoutPages(ctx, model, cfg, notes);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: cfg.orientation, compress: true });
  pages.forEach((page, i) => {
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    if (template === 'classic') drawClassic(ctx, { photo }, model, page, i + 1, pages.length);
    else drawDecorative(ctx, { bg, logo }, model, page, i + 1, pages.length);
    if (i > 0) pdf.addPage('a4', cfg.orientation);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, cfg.mmW, cfg.mmH, undefined, 'FAST');
  });
  pdf.setProperties({ title: `MWA Monthly Calendar \u2013 ${model.footerLabel}` });
  pdf.save(filename);
  return pages.length;
}

export function pdfFilename(model) {
  return `MWA-Calendar-${model.footerLabel.replace(/\s*-\s*/g, '-').replace(/[^\w/-]+/g, '-').replace(/\//g, '-')}.pdf`;
}
