// Renders the one-page full-year calendar (modelled on the IHC year sheet):
// a 3-column grid of 12 months - January-December (Gregorian year) or Muharram-Dhul Hijjah
// (Hijri year) - with the primary day large, the other calendar's date beneath, and MWA Program
// days highlighted (green fill) and listed per month.
import logoUrl from '../assets/mwa-logo.png';

export const W = 864, H = 1223, SCALE = 2.5;
export const GREEN = '#1c8f45', DARK = '#1d1d1b', MUTED = '#6d6d6d';
export const SANS = "'Segoe UI', Arial, 'Helvetica Neue', Helvetica, sans-serif";
export const HEAVY = "'Arial Black', 'Segoe UI Black', 'Segoe UI', Arial, sans-serif";
export const MARGIN = 24, GAP = 18, COLS = 3;
const GRID_TOP = 142, GRID_BOTTOM = 1118;
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SITE = 'eventscalendar.muhammadiwelfare.org.au';

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the logo'));
    img.src = src;
  });
}

export function wrap(ctx, text, maxW) {
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

export function fit(ctx, text, fontFn, size, maxW, min = 8) {
  let s = size;
  ctx.font = fontFn(s);
  while (ctx.measureText(text).width > maxW && s > min) { s -= 0.5; ctx.font = fontFn(s); }
  return s;
}

// Shared with the Classic monthly template (pdfCalendar.js).
export function drawSheetHeader(ctx, model, logo) {
  const lh = 104, lw = lh * logo.width / logo.height;
  ctx.drawImage(logo, MARGIN - 4, 10, lw, lh);
  const bx = MARGIN + lw + 8, bw = 650 - bx;
  ctx.fillStyle = GREEN;
  ctx.fillRect(bx, 16, bw, 76);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  fit(ctx, 'MUHAMMADI WELFARE ASSOCIATION', s => `900 ${s}px ${HEAVY}`, 28, bw - 28);
  ctx.fillText('MUHAMMADI WELFARE ASSOCIATION', bx + 14, 48);
  fit(ctx, 'EVENTS CALENDAR', s => `900 ${s}px ${HEAVY}`, 26, bw - 28);
  ctx.fillText('EVENTS CALENDAR', bx + 14, 80);

  ctx.textAlign = 'right';
  ctx.fillStyle = GREEN;
  fit(ctx, model.title, s => `900 ${s}px ${HEAVY}`, 54, W - MARGIN - 662, 20);
  ctx.fillText(model.title, W - MARGIN, 72);
  ctx.fillStyle = DARK;
  ctx.font = `800 15px ${SANS}`;
  ctx.fillText(model.subtitle, W - MARGIN, 94);

  ctx.textAlign = 'left';
  ctx.font = `600 10.5px ${SANS}`;
  ctx.fillStyle = DARK;
  ctx.fillText('Subject to sighting of the moon. Hijri dates follow the moon-sighting adjustments published by MWA.', bx, 108);
  ctx.fillStyle = GREEN;
  ctx.fillText(model.listNote, bx, 123);
}

export function drawSheetFooter(ctx, pageText = '') {
  const y0 = GRID_BOTTOM + 8;
  ctx.strokeStyle = GREEN; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(MARGIN, y0); ctx.lineTo(W - MARGIN, y0); ctx.stroke();
  const tx = MARGIN;
  ctx.textAlign = 'left';
  ctx.fillStyle = GREEN; ctx.font = `800 14px ${SANS}`;
  ctx.fillText('Muhammadi Welfare Association', tx, y0 + 24);
  ctx.fillStyle = DARK; ctx.font = `10.5px ${SANS}`;
  ctx.fillText('81-89 Clifton Avenue, Kemps Creek NSW 2178', tx, y0 + 41);
  ctx.fillText('Program dates may change based on moonsighting every month. Please check the live calendar at', tx, y0 + 56);
  ctx.fillStyle = GREEN; ctx.font = `700 10.5px ${SANS}`;
  ctx.fillText(SITE, tx, y0 + 71);
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'right'; ctx.font = `9.5px ${SANS}`;
  ctx.fillText(`Generated ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`, W - MARGIN, y0 + 24);
  if (pageText) ctx.fillText(pageText, W - MARGIN, y0 + 41);
}

function drawMonth(ctx, m, x, y, w, h, rowH) {
  const colW = w / 7;
  ctx.fillStyle = GREEN;
  ctx.fillRect(x, y, w, 3.5);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const title = m.name;
  ctx.font = `900 18px ${HEAVY}`;
  ctx.fillText(title, x, y + 25);
  const tw = ctx.measureText(title).width;
  ctx.textAlign = 'right'; ctx.fillStyle = DARK;
  fit(ctx, m.sub, s => `800 ${s}px ${SANS}`, 10.5, w - tw - 10);
  ctx.fillText(m.sub, x + w, y + 24);

  ctx.textAlign = 'center'; ctx.fillStyle = DARK; ctx.font = `800 7.5px ${SANS}`;
  DOW.forEach((d, i) => ctx.fillText(d, x + colW * (i + 0.5), y + 40));

  let wy = y + 46;
  for (const week of m.weeks) {
    week.forEach((c, i) => {
      if (!c) return;
      const cx = x + colW * (i + 0.5);
      if (c.highlighted) {
        ctx.fillStyle = GREEN;
        ctx.beginPath(); ctx.roundRect(cx - colW / 2 + 2, wy + 1, colW - 4, rowH - 3, 4); ctx.fill();
      }
      ctx.fillStyle = c.highlighted ? '#fff' : DARK;
      ctx.font = `900 ${Math.min(16, rowH * 0.62)}px ${HEAVY}`;
      ctx.fillText(c.big, cx, wy + rowH * 0.58);
      ctx.font = `600 6.3px ${SANS}`;
      ctx.fillStyle = c.highlighted ? '#fff' : '#444';
      ctx.fillText(c.small, cx, wy + rowH * 0.86);
    });
    wy += rowH;
  }

  // Program list (numbered by Hijri day), then daylight-saving notes.
  const LH = 10.5, numW = 22, maxW = w - numW - 2;
  let ly = wy + 12;
  const bottom = y + h - 4;
  const lines = [];
  ctx.font = `9px ${SANS}`;
  for (const e of m.list) {
    wrap(ctx, e.text, maxW).forEach((l, i) => lines.push({ num: i === 0 ? e.days : '', text: l }));
  }
  for (const n of m.notes) lines.push({ num: '\u25F7', text: n, note: true });
  const capacity = Math.max(0, Math.floor((bottom - ly) / LH) + 1);
  let shown = lines;
  if (lines.length > capacity) {
    shown = lines.slice(0, Math.max(0, capacity - 1));
    const rest = m.list.length - new Set(shown.filter(l => l.num && !l.note).map(l => l.num)).size;
    shown.push({ num: '', text: `+ ${rest} more \u2014 see the online calendar`, more: true });
  }
  for (const l of shown) {
    ctx.textAlign = 'right'; ctx.fillStyle = DARK; ctx.font = `800 9px ${SANS}`;
    if (l.num) ctx.fillText(l.num, x + numW - 4, ly);
    ctx.textAlign = 'left';
    ctx.font = l.more ? `italic 9px ${SANS}` : `9px ${SANS}`;
    ctx.fillStyle = l.note || l.more ? MUTED : DARK;
    ctx.fillText(l.text, x + numW, ly);
    ly += LH;
  }
}

function drawLegend(ctx, x, y, w, h) {
  ctx.fillStyle = GREEN; ctx.fillRect(x, y, w, 3.5);
  ctx.textAlign = 'left'; ctx.fillStyle = DARK;
  ctx.font = `900 16px ${HEAVY}`; ctx.fillText('Key', x, y + 25);
  ctx.fillStyle = GREEN;
  ctx.beginPath(); ctx.roundRect(x, y + 38, 30, 24, 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `900 14px ${HEAVY}`; ctx.fillText('05', x + 15, y + 52);
  ctx.font = `600 6.3px ${SANS}`; ctx.fillText('22 Jun', x + 15, y + 59);
  ctx.fillStyle = DARK; ctx.textAlign = 'left'; ctx.font = `10px ${SANS}`;
  ctx.fillText('Date with the other calendar beneath;', x + 40, y + 48);
  ctx.fillText('green marks an MWA Program.', x + 40, y + 61);
  ctx.fillStyle = MUTED;
  ctx.fillText('\u25F7  Daylight saving changes (Sydney)', x, y + 84);
  void h;
}

export function yearPdfFilename(model) {
  return `MWA-Calendar-${model.basis === 'hijri' ? 'Hijri' : 'Gregorian'}-${model.title}.pdf`;
}

export async function renderYearCalendarPdf(model, filename, opts = {}) {
  const [{ jsPDF }, logo] = await Promise.all([import('jspdf'), loadImage(logoUrl)]);
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE; canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

  drawSheetHeader(ctx, model, logo);
  const n = model.months.length;
  const rows = Math.ceil(n / COLS);
  const cellW = (W - 2 * MARGIN - (COLS - 1) * GAP) / COLS;
  const vGap = rows > 4 ? 6 : 10;
  const cellH = (GRID_BOTTOM - GRID_TOP - (rows - 1) * vGap) / rows;
  for (let r = 0; r < rows; r++) {
    const ms = model.months.slice(r * COLS, r * COLS + COLS);
    const maxWeeks = Math.max(...ms.map(m => m.weeks.length));
    const rowH = Math.min(26, (cellH - 60) * (rows > 4 ? 0.82 : 0.66) / maxWeeks);
    for (let c = 0; c < COLS; c++) {
      const x = MARGIN + c * (cellW + GAP), y = GRID_TOP + r * (cellH + vGap);
      if (ms[c]) drawMonth(ctx, ms[c], x, y, cellW, cellH, rowH);
      else if (c === ms.length) drawLegend(ctx, x, y, cellW, cellH);
    }
  }
  drawSheetFooter(ctx);

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  pdf.setProperties({ title: `MWA ${model.basis === 'hijri' ? 'Hijri' : 'Gregorian'} Calendar ${model.title} (${model.subtitle})` });
  if (opts.returnCanvas) return canvas;
  pdf.save(filename || yearPdfFilename(model));
  return 1;
}
