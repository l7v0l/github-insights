export const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const EVENT_LABELS = {
  PushEvent: 'دفع كود (Push)',
  PullRequestEvent: 'طلبات دمج',
  PullRequestReviewEvent: 'مراجعات',
  PullRequestReviewCommentEvent: 'تعليقات المراجعة',
  IssuesEvent: 'قضايا (Issues)',
  IssueCommentEvent: 'تعليقات',
  CreateEvent: 'إنشاء فروع/مستودعات',
  DeleteEvent: 'حذف فروع',
  WatchEvent: 'نجوم أعطاها',
  ForkEvent: 'تفرّعات',
  ReleaseEvent: 'إصدارات',
  PublicEvent: 'نشر مستودع',
  MemberEvent: 'أعضاء',
  CommitCommentEvent: 'تعليقات على commits'
};

export const dayKey = d => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219', 'C++': '#f34b7d', C: '#808080',
  'C#': '#178600', Go: '#00ADD8', Rust: '#dea584', PHP: '#4F5D95', Ruby: '#701516', Swift: '#F05138', Kotlin: '#A97BFF',
  HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c', Shell: '#89e051', Lua: '#000080', Dart: '#00B4AB', Vue: '#41b883',
  Svelte: '#ff3e00', 'Jupyter Notebook': '#DA5B0B', PowerShell: '#012456', Batchfile: '#C1F12E', Zig: '#ec915c'
};
export function langColor(name) {
  if (COLORS[name]) return COLORS[name];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 65% 60%)`;
}

export function analyze({ profile, repos, events }) {
  const own = repos.filter(r => !r.fork);
  const stars = own.reduce((s, r) => s + r.stargazers_count, 0);
  const forks = own.reduce((s, r) => s + r.forks_count, 0);

  const langMap = new Map();
  own.forEach(r => { if (r.language) langMap.set(r.language, (langMap.get(r.language) || 0) + 1); });
  const langTotal = [...langMap.values()].reduce((a, b) => a + b, 0);
  const langs = [...langMap.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count, pct: count / langTotal * 100 }));

  const topRepos = [...own]
    .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, 6);

  const byDay = new Map(), byWeekday = Array(7).fill(0), byHour = Array(24).fill(0), types = new Map();
  events.forEach(e => {
    const d = new Date(e.created_at);
    byDay.set(dayKey(d), (byDay.get(dayKey(d)) || 0) + 1);
    byWeekday[d.getDay()]++;
    byHour[d.getHours()]++;
    types.set(e.type, (types.get(e.type) || 0) + 1);
  });
  const typeList = [...types.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, label: EVENT_LABELS[type] || 'أخرى', count }));

  const ageDays = (Date.now() - new Date(profile.created_at)) / 864e5;

  return {
    profile, own, stars, forks, langs, topRepos, typeList, ageDays,
    activity: { byDay, byWeekday, byHour, total: events.length },
    metrics: {
      repos: profile.public_repos, stars, forks, followers: profile.followers, following: profile.following,
      gists: profile.public_gists, langs: langs.length, events: events.length
    }
  };
}

export function summarize(a, nf) {
  const p = a.profile, out = [];
  const years = Math.floor(a.ageDays / 365), months = Math.floor((a.ageDays % 365) / 30);
  const age = years
    ? `${years} ${years > 2 && years < 11 ? 'سنوات' : 'سنة'}`
    : `${months} ${months > 2 && months < 11 ? 'أشهر' : 'شهر'}`;
  out.push(`حساب عمره نحو ${age}، وفيه ${nf.format(p.public_repos)} مستودع عام.`);
  if (a.langs[0]) {
    const rest = a.langs.slice(1, 3).map(l => l.name);
    out.push(`لغته الأكثر استخداماً ${a.langs[0].name} (${Math.round(a.langs[0].pct)}% من مستودعاته)${rest.length ? '، يليها ' + rest.join(' و') : ''}.`);
  }
  if (a.stars) out.push(`جمعت مستودعاته الأصلية ${nf.format(a.stars)} نجمة، وأعلاها ${a.topRepos[0].name}.`);
  if (a.activity.total) {
    const wd = a.activity.byWeekday, hr = a.activity.byHour;
    const bestDay = WEEKDAYS[wd.indexOf(Math.max(...wd))], bestHr = hr.indexOf(Math.max(...hr));
    out.push(`آخر نشاط عام (${nf.format(a.activity.total)} حدث) يتركز يوم ${bestDay}، وأنشط ساعة تقريباً ${String(bestHr).padStart(2, '0')}:00 بتوقيتك.`);
  } else {
    out.push('لا يوجد نشاط عام حديث ضمن آخر 90 يوماً.');
  }
  return out;
}
