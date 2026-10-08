import { loadUser, validUser, rate, ApiError } from './api.js';
import { analyze, summarize, WEEKDAYS } from './analyze.js';
import { esc, donut, hbars, vbars, heatmap } from './charts.js';
import { loadDemo, isDemo } from './demo.js';

const $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat('ar-u-nu-latn');
const dateFmt = new Intl.DateTimeFormat('ar-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
const els = { form: $('form'), u1: $('u1'), u2: $('u2'), vs: $('vs'), cmp: $('cmp'), go: $('go'), status: $('status'), result: $('result'), rate: $('rate') };
let runId = 0, lastData = null, shown = '';

/* ---------- theme ---------- */
function setTheme(t, save) {
  document.documentElement.dataset.theme = t;
  $('tc').content = t === 'light' ? '#f4f7fc' : '#0b0f1a';
  if (save) { try { localStorage.setItem('gi-theme', t); } catch (e) { /* ignore */ } }
}
$('theme').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light', true));
setTheme(document.documentElement.dataset.theme || 'dark', false);

/* ---------- ui helpers ---------- */
function showStatus(kind, html) {
  els.status.hidden = false;
  els.status.className = 'status ' + kind;
  els.status.innerHTML = html;
}
const hideStatus = () => { els.status.hidden = true; };

function setCompare(on) {
  els.vs.hidden = !on;
  els.cmp.setAttribute('aria-pressed', String(on));
  els.cmp.textContent = on ? '× إلغاء المقارنة' : '+ مقارنة';
  if (!on) els.u2.value = '';
}
els.cmp.addEventListener('click', () => { setCompare(els.vs.hidden); if (!els.vs.hidden) els.u2.focus(); });

function updateRate() {
  if (rate.remaining === null) { els.rate.textContent = ''; return; }
  els.rate.textContent = `الطلبات المتبقية: ${nf.format(rate.remaining)} من ${nf.format(rate.limit)}`;
}

function errorMessage(e, who) {
  const name = who ? `<b dir="ltr">${esc(who)}</b>` : '';
  if (e instanceof ApiError) {
    if (e.code === 'notfound') return `لم أجد الحساب ${name}. تأكد من كتابة الاسم بشكل صحيح.`;
    if (e.code === 'ratelimit') {
      const t = e.extra ? new Intl.DateTimeFormat('ar-u-nu-latn', { hour: '2-digit', minute: '2-digit' }).format(new Date(e.extra)) : null;
      return `وصلت للحد المسموح من طلبات GitHub (60 في الساعة بدون تسجيل دخول).${t ? ` جرّب مرة ثانية بعد الساعة ${t}.` : ' جرّب بعد قليل.'}`;
    }
    if (e.code === 'network') return 'تعذّر الاتصال بـ GitHub. تحقق من الإنترنت وحاول مرة ثانية.';
    return `حدث خطأ من GitHub (رمز ${esc(e.extra)}). حاول لاحقاً.`;
  }
  return 'حدث خطأ غير متوقع.';
}

/* ---------- rendering ---------- */
const safeUrl = u => (typeof u === 'string' && /^https:\/\/(github\.com|avatars\.githubusercontent\.com)\//.test(u) ? u : '#');
const avatarSrc = (u, size) => {
  if (typeof u === 'string' && /^data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+$/.test(u)) return u;
  const url = safeUrl(u);
  return url === '#' ? '' : url + (url.includes('?') ? '&' : '?') + 's=' + size;
};
const safeBlog = b => {
  if (!b) return null;
  const url = /^https?:\/\//i.test(b) ? b : 'https://' + b;
  try { const u = new URL(url); return /^https?:$/.test(u.protocol) ? { href: u.href, text: u.host } : null; } catch (e) { return null; }
};

function profileCard(a) {
  const p = a.profile, blog = safeBlog(p.blog);
  const meta = [
    p.location && `<span>📍 ${esc(p.location)}</span>`,
    p.company && `<span>🏢 ${esc(p.company)}</span>`,
    blog && `<a href="${esc(blog.href)}" target="_blank" rel="noopener noreferrer nofollow" dir="ltr">🔗 ${esc(blog.text)}</a>`,
    `<span>📅 انضم ${dateFmt.format(new Date(p.created_at))}</span>`
  ].filter(Boolean).join('');
  return `<section class="card prof">
    <img src="${esc(avatarSrc(p.avatar_url, 240))}" alt="صورة ${esc(p.login)}" width="104" height="104" referrerpolicy="no-referrer">
    <div class="pi">
      <h2>${esc(p.name || p.login)}</h2>
      ${p.__demo ? '<span class="demo-badge">حساب تجريبي · بيانات وهمية للتجربة</span>' : ''}
      <a class="login" href="${esc(safeUrl(p.html_url))}" target="_blank" rel="noopener noreferrer" dir="ltr">@${esc(p.login)}</a>
      ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
      <div class="meta">${meta}</div>
    </div></section>`;
}

const KPIS = [
  ['repos', 'مستودعات', '📦'], ['stars', 'نجوم', '⭐'], ['forks', 'تفرّعات', '🍴'],
  ['followers', 'متابِعون', '👥'], ['following', 'يتابع', '➕'], ['gists', 'Gists', '📝']
];
const kpiGrid = a => `<section class="kpis">${KPIS.map(([k, l, i]) =>
  `<div class="card kpi"><span class="ic" aria-hidden="true">${i}</span><b>${nf.format(a.metrics[k])}</b><span>${l}</span></div>`).join('')}</section>`;

function repoCards(a) {
  if (!a.topRepos.length) return '<p class="muted">لا توجد مستودعات أصلية.</p>';
  return `<div class="repos">${a.topRepos.map(r => `
    <a class="card repo" href="${esc(safeUrl(r.html_url))}" target="_blank" rel="noopener noreferrer">
      <h3 dir="ltr">${esc(r.name)}</h3>
      <p>${esc(r.description || 'بدون وصف')}</p>
      <div class="rm">${r.language ? `<span dir="ltr"><i class="dot"></i>${esc(r.language)}</span>` : ''}
        <span>⭐ ${nf.format(r.stargazers_count)}</span><span>🍴 ${nf.format(r.forks_count)}</span></div>
    </a>`).join('')}</div>`;
}

function renderUser(a) {
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const hourLabels = hours.map((h, i) => (i % 3 === 0 ? h : ''));
  return `
    ${profileCard(a)}
    ${kpiGrid(a)}
    <section class="card summary"><h2>ملخص سريع</h2><ul>${summarize(a, nf).map(s => `<li>${esc(s)}</li>`).join('')}</ul></section>
    <div class="two">
      <section class="card"><h2>اللغات</h2>${donut(a.langs, nf)}<p class="note">حسب عدد المستودعات الأصلية (بدون التفرّعات).</p></section>
      <section class="card"><h2>أنواع النشاط</h2>${hbars(a.typeList.slice(0, 8), nf)}<p class="note">من آخر ${nf.format(a.activity.total)} حدث عام (GitHub يعرض آخر 90 يوماً بحد أقصى 300 حدث).</p></section>
    </div>
    <section class="card"><h2>خريطة النشاط (آخر 91 يوماً)</h2>${heatmap(a.activity.byDay, nf)}</section>
    <div class="two">
      <section class="card"><h2>النشاط حسب اليوم</h2>${vbars(a.activity.byWeekday, WEEKDAYS.map(d => d.replace('ال', '')), nf, 'النشاط حسب أيام الأسبوع')}</section>
      <section class="card"><h2>النشاط حسب الساعة</h2>${vbars(a.activity.byHour, hourLabels, nf, 'النشاط حسب ساعات اليوم')}<p class="note">بتوقيت جهازك.</p></section>
    </div>
    <section><h2 class="sec">أفضل المستودعات</h2>${repoCards(a)}</section>`;
}

const ROWS = [['repos', 'المستودعات'], ['stars', 'النجوم'], ['forks', 'التفرّعات'], ['followers', 'المتابِعون'], ['following', 'يتابع'], ['gists', 'Gists'], ['langs', 'عدد اللغات'], ['events', 'نشاط آخر 90 يوماً']];
function renderCompare(a, b) {
  const rows = ROWS.map(([k, l]) => {
    const x = a.metrics[k], y = b.metrics[k];
    return `<tr><th scope="row">${l}</th><td class="${x > y ? 'win' : ''}">${nf.format(x)}</td><td class="${y > x ? 'win' : ''}">${nf.format(y)}</td></tr>`;
  }).join('');
  const topA = a.langs[0] ? a.langs[0].name : '—', topB = b.langs[0] ? b.langs[0].name : '—';
  const head = p => `<th scope="col"><img src="${esc(avatarSrc(p.avatar_url, 80))}" alt="" width="40" height="40"><span dir="ltr">@${esc(p.login)}</span></th>`;
  return `<section class="card cmpcard"><h2>المقارنة</h2>
    <div class="tbl"><table><thead><tr><th></th>${head(a.profile)}${head(b.profile)}</tr></thead><tbody>${rows}
      <tr><th scope="row">اللغة الأولى</th><td dir="ltr">${esc(topA)}</td><td dir="ltr">${esc(topB)}</td></tr></tbody></table></div>
    <p class="note">الخلية المميّزة هي الأعلى في كل صف.</p></section>`;
}

function renderDetails(a) {
  return `<details class="card more"><summary>عرض تحليل ${esc(a.profile.login)} كاملاً</summary>${renderUser(a)}</details>`;
}

function toolbar() {
  return `<div class="tools">
    <button class="btn ghost sm" id="share">🔗 نسخ رابط التحليل</button>
    <button class="btn ghost sm" id="json">⬇ تحميل البيانات JSON</button></div>`;
}

/* ---------- run ---------- */
async function run(u1, u2) {
  const id = ++runId;
  els.go.disabled = true;
  els.result.hidden = true;
  showStatus('loading', '<span class="spin" aria-hidden="true"></span> جاري تحليل الحساب…');
  let current = u1;
  try {
    const load = u => (isDemo(u) ? loadDemo(u) : loadUser(u));
    const d1 = await load(u1);
    current = u2;
    const d2 = u2 ? await load(u2) : null;
    if (id !== runId) return;
    const a = analyze(d1), b = d2 && analyze(d2);
    lastData = b ? { a: a.metrics, b: b.metrics, users: [a.profile.login, b.profile.login] } : { user: a.profile.login, ...a.metrics, languages: a.langs.map(l => ({ name: l.name, repos: l.count })) };
    els.result.innerHTML = toolbar() + (b ? renderCompare(a, b) + renderDetails(a) + renderDetails(b) : renderUser(a));
    els.result.hidden = false;
    hideStatus();
    shown = b ? `u=${a.profile.login}&v=${b.profile.login}` : `u=${a.profile.login}`;
    location.hash = shown;
    document.title = `${a.profile.login}${b ? ' ⚔ ' + b.profile.login : ''} | GitHub Insights`;
    bindTools();
    els.result.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  } catch (e) {
    if (id !== runId) return;
    showStatus('error', errorMessage(e, current));
  } finally {
    if (id === runId) { els.go.disabled = false; updateRate(); }
  }
}

function bindTools() {
  const share = $('share'), json = $('json');
  share.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(location.href); ok = true; }
    catch (e) {
      const t = document.createElement('textarea');
      t.value = location.href; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.append(t); t.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      t.remove();
    }
    if (ok) share.textContent = '✓ تم نسخ الرابط';
    else { share.textContent = 'انسخ الرابط يدوياً'; window.prompt('انسخ الرابط:', location.href); }
    setTimeout(() => { share.textContent = '🔗 نسخ رابط التحليل'; }, 1800);
  });
  json.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(lastData, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'github-insights.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

els.form.addEventListener('submit', e => {
  e.preventDefault();
  const u1 = els.u1.value.trim().replace(/^@/, ''), u2 = els.vs.hidden ? '' : els.u2.value.trim().replace(/^@/, '');
  if (!validUser(u1)) { showStatus('error', 'اكتب اسم مستخدم صحيح (أحرف إنجليزية وأرقام وشرطة، بحد أقصى 39 حرفاً).'); els.u1.focus(); return; }
  if (u2 && !validUser(u2)) { showStatus('error', 'اسم حساب المقارنة غير صحيح.'); els.u2.focus(); return; }
  if (!els.vs.hidden && !u2) { showStatus('error', 'اكتب حساب المقارنة أو ألغِ المقارنة.'); els.u2.focus(); return; }
  run(u1, u2 || null);
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-u]');
  if (b) {
    e.preventDefault();
    els.u1.value = b.dataset.u;
    if (b.dataset.v) { setCompare(true); els.u2.value = b.dataset.v; } else setCompare(false);
    run(b.dataset.u, b.dataset.v || null);
    return;
  }
  const dead = e.target.closest('a[href="#"]');   // demo accounts have no real GitHub page
  if (dead) e.preventDefault();
});

/* open a shared link */
function fromHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const u = p.get('u'), v = p.get('v');
  if (u && validUser(u)) {
    els.u1.value = u;
    if (v && validUser(v)) { setCompare(true); els.u2.value = v; }
    run(u, v && validUser(v) ? v : null);
  }
}
window.addEventListener('hashchange', () => { if (location.hash.slice(1) !== shown) fromHash(); });
fromHash();
