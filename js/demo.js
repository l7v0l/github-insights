/* Demo accounts: fake, generated in the browser, no network. Names are reserved by the "demo-" prefix. */

const SPECS = {
  'demo-sara': {
    name: 'سارة (حساب تجريبي)', letter: 'S', hues: [210, 280], seed: 11,
    bio: 'مطوّرة واجهات أمامية تحب التصاميم النظيفة. هذا حساب وهمي للتجربة.',
    location: 'الرياض', company: 'استوديو تجريبي', ageYears: 5, followers: 420, following: 96, gists: 7,
    repos: 16, starScale: 90, events: 150, peak: [20, 21, 22], dayW: [.4, 1, 1, 1, 1, .8, .3],
    langs: [['JavaScript', 5], ['TypeScript', 4], ['CSS', 3], ['HTML', 2]],
    names: ['portfolio-site', 'react-dashboard', 'css-animations', 'ui-kit-ar', 'todo-pwa', 'weather-widget', 'landing-pages', 'design-tokens'],
    types: [['PushEvent', 10], ['PullRequestEvent', 3], ['IssueCommentEvent', 2], ['CreateEvent', 2], ['WatchEvent', 2], ['IssuesEvent', 1]]
  },
  'demo-omar': {
    name: 'عمر (حساب تجريبي)', letter: 'O', hues: [150, 200], seed: 29,
    bio: 'مهندس باك إند وأدوات سطر الأوامر. هذا حساب وهمي للتجربة.',
    location: 'جدة', company: 'شركة تجريبية', ageYears: 9, followers: 3150, following: 41, gists: 23,
    repos: 28, starScale: 600, events: 240, peak: [9, 10, 14], dayW: [.2, 1, 1, 1, 1, .6, .1],
    langs: [['Python', 7], ['Go', 5], ['Shell', 3], ['Rust', 2], ['Dockerfile', 1]],
    names: ['fast-api-starter', 'log-parser', 'go-cli-tools', 'k8s-notes', 'rate-limiter', 'dotfiles', 'task-queue', 'api-gateway', 'backup-scripts'],
    types: [['PushEvent', 12], ['PullRequestEvent', 5], ['PullRequestReviewEvent', 3], ['IssueCommentEvent', 4], ['IssuesEvent', 2], ['ReleaseEvent', 1]]
  },
  'demo-noor': {
    name: 'نور (حساب تجريبي)', letter: 'N', hues: [330, 20], seed: 47,
    bio: 'مطوّرة تطبيقات جوال وتجربة مستخدم. هذا حساب وهمي للتجربة.',
    location: 'الدمام', company: '', ageYears: 2, followers: 68, following: 130, gists: 1,
    repos: 9, starScale: 25, events: 45, peak: [16, 17, 23], dayW: [1, .6, .6, .6, .6, .2, 1],
    langs: [['Dart', 4], ['Kotlin', 3], ['Swift', 2], ['Java', 1]],
    names: ['flutter-notes', 'habit-tracker', 'quran-reader-app', 'budget-buddy', 'onboarding-flow'],
    types: [['PushEvent', 8], ['CreateEvent', 3], ['WatchEvent', 3], ['ForkEvent', 1], ['PullRequestEvent', 1]]
  }
};

const DESCS = [
  'مشروع تجريبي لتعلّم الأساسيات وتطبيقها', 'أدوات صغيرة تسهّل العمل اليومي', 'نسخة أولية، والتطوير مستمر',
  'قالب جاهز للبدء بسرعة', 'تجارب وملاحظات من أثناء التعلّم', 'مشروع مفتوح المصدر، المساهمات مرحّب بها'
];

export const DEMO_USERS = Object.keys(SPECS);
export const isDemo = login => Object.prototype.hasOwnProperty.call(SPECS, String(login).toLowerCase());

function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(list, r) {
  const total = list.reduce((s, x) => s + x[1], 0);
  let n = r() * total;
  for (const [v, w] of list) { if ((n -= w) < 0) return v; }
  return list[0][0];
}

function avatar(spec) {
  const [h1, h2] = spec.hues;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1} 80% 55%)"/><stop offset="1" stop-color="hsl(${h2} 80% 50%)"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><text x="60" y="80" font-size="56" font-family="Arial,sans-serif" font-weight="700" text-anchor="middle" fill="#fff">${spec.letter}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

export async function loadDemo(login) {
  const key = login.toLowerCase(), spec = SPECS[key], r = rng(spec.seed);
  const now = Date.now(), DAY = 864e5;

  const repos = Array.from({ length: spec.repos }, (_, i) => {
    const base = spec.names[i % spec.names.length], round = Math.floor(i / spec.names.length);
    const stars = Math.floor(Math.pow(r(), 3) * spec.starScale * (i === 0 ? 3 : 1));
    return {
      name: round ? `${base}-v${round + 1}` : base,
      description: DESCS[Math.floor(r() * DESCS.length)],
      language: pickWeighted(spec.langs, r),
      stargazers_count: stars,
      forks_count: Math.floor(stars * 0.25 * r()),
      fork: i % 9 === 8,
      pushed_at: new Date(now - r() * 220 * DAY).toISOString(),
      html_url: '#'
    };
  });

  const events = [];
  while (events.length < spec.events) {
    const off = Math.floor(r() * 90), d = new Date(now - off * DAY);
    if (r() > spec.dayW[d.getDay()]) continue;
    const peak = spec.peak[Math.floor(r() * spec.peak.length)];
    const hour = (peak + Math.round((r() + r() - 1) * 3) + 24) % 24;
    d.setHours(hour, Math.floor(r() * 60), 0, 0);
    if (d.getTime() > now) continue;
    events.push({ type: pickWeighted(spec.types, r), created_at: d.toISOString() });
  }

  return {
    profile: {
      login: key, name: spec.name, bio: spec.bio, location: spec.location, company: spec.company,
      blog: 'example.com', created_at: new Date(now - spec.ageYears * 365 * DAY).toISOString(),
      public_repos: spec.repos, followers: spec.followers, following: spec.following, public_gists: spec.gists,
      avatar_url: avatar(spec), html_url: '#', __demo: true
    },
    repos, events
  };
}
