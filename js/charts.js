import { langColor, dayKey, WEEKDAYS } from './analyze.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Donut of languages. Uses stroke-dasharray on a circle of circumference 100. */
export function donut(langs, nf) {
  if (!langs.length) return '<p class="muted">لا توجد لغات محددة في المستودعات.</p>';
  const shown = langs.slice(0, 7);
  const restPct = 100 - shown.reduce((s, l) => s + l.pct, 0);
  const items = restPct > 0.5 ? [...shown, { name: 'أخرى', count: 0, pct: restPct, other: true }] : shown;
  let off = 25;
  const arcs = items.map(l => {
    const c = l.other ? '#7d8aa3' : langColor(l.name);
    const a = `<circle r="15.9155" cx="21" cy="21" fill="none" stroke="${c}" stroke-width="6" stroke-dasharray="${l.pct.toFixed(2)} ${(100 - l.pct).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"><title>${esc(l.name)} ${l.pct.toFixed(1)}%</title></circle>`;
    off -= l.pct;
    return a;
  }).join('');
  const legend = items.map(l => `
    <li><i style="background:${l.other ? '#7d8aa3' : langColor(l.name)}"></i><span dir="ltr">${esc(l.name)}</span><b>${l.pct.toFixed(1)}%</b></li>`).join('');
  return `<div class="donut-wrap">
    <svg viewBox="0 0 42 42" class="donut" role="img" aria-label="توزيع اللغات">${arcs}
      <text x="21" y="20.2" text-anchor="middle" class="d-n">${nf.format(langs.length)}</text>
      <text x="21" y="25.6" text-anchor="middle" class="d-l">لغة</text></svg>
    <ul class="legend">${legend}</ul></div>`;
}

/* Horizontal bars (HTML) */
export function hbars(rows, nf) {
  if (!rows.length) return '<p class="muted">لا توجد بيانات.</p>';
  const max = Math.max(...rows.map(r => r.count));
  return `<ul class="hbars">${rows.map(r => `
    <li><span class="hl">${esc(r.label)}</span>
      <span class="hb"><i style="width:${Math.max(3, r.count / max * 100)}%"></i></span>
      <b>${nf.format(r.count)}</b></li>`).join('')}</ul>`;
}

/* Vertical bars (HTML) */
export function vbars(values, labels, nf, hiLabel) {
  const max = Math.max(...values, 1), top = values.indexOf(Math.max(...values));
  return `<div class="vbars" role="img" aria-label="${esc(hiLabel)}">${values.map((v, i) => `
    <div class="vb${i === top && v > 0 ? ' top' : ''}" title="${esc(labels[i])}: ${nf.format(v)}">
      <span class="vv">${v ? nf.format(v) : ''}</span>
      <i style="height:${v ? Math.max(4, v / max * 100) : 2}%"></i>
      <em>${esc(labels[i])}</em></div>`).join('')}</div>`;
}

/* Heatmap of the last 91 days, Sunday-first columns */
export function heatmap(byDay, nf) {
  const DAYS = 91, today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - (DAYS - 1));
  const pad = start.getDay();
  const cells = [], counts = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const n = byDay.get(dayKey(d)) || 0;
    counts.push(n);
    cells.push({ d, n, col: Math.floor((i + pad) / 7), row: (i + pad) % 7 });
  }
  const max = Math.max(...counts, 1), cols = Math.floor((DAYS - 1 + pad) / 7) + 1, S = 14, G = 3;
  const lvl = n => (n === 0 ? 0 : Math.min(4, Math.ceil(n / max * 4)));
  const fmt = new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'long' });
  const rects = cells.map(c => `<rect x="${c.col * (S + G)}" y="${c.row * (S + G)}" width="${S}" height="${S}" rx="3" class="hm l${lvl(c.n)}"><title>${fmt.format(c.d)}: ${nf.format(c.n)}</title></rect>`).join('');
  const w = cols * (S + G) - G, h = 7 * (S + G) - G;
  return `<div class="hm-scroll" dir="ltr"><svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="نشاط آخر 91 يوماً">${rects}</svg></div>
    <div class="hm-key" dir="ltr"><span>أقل</span>${[0, 1, 2, 3, 4].map(l => `<svg width="14" height="14"><rect width="14" height="14" rx="3" class="hm l${l}"/></svg>`).join('')}<span>أكثر</span></div>`;
}

export const dayLabels = WEEKDAYS;
