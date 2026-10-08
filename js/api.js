const BASE = 'https://api.github.com';
const TTL = 10 * 60 * 1000;
export const rate = { remaining: null, limit: null, reset: null };

export class ApiError extends Error {
  constructor(code, extra) { super(code); this.code = code; this.extra = extra; }
}

export const validUser = u => /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(u);

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { t, d } = JSON.parse(raw);
    return Date.now() - t < TTL ? d : null;
  } catch (e) { return null; }
}
function writeCache(key, d) {
  try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch (e) { /* quota or disabled */ }
}

async function gh(path) {
  const key = 'gi:' + path;
  const hit = readCache(key);
  if (hit) return hit;

  let res;
  try { res = await fetch(BASE + path, { headers: { Accept: 'application/vnd.github+json' } }); }
  catch (e) { throw new ApiError('network'); }

  const rem = res.headers.get('x-ratelimit-remaining');
  if (rem !== null) {
    rate.remaining = +rem;
    rate.limit = +res.headers.get('x-ratelimit-limit');
    rate.reset = +res.headers.get('x-ratelimit-reset') * 1000;
  }
  if (res.status === 404) throw new ApiError('notfound');
  if (res.status === 403 || res.status === 429) throw new ApiError('ratelimit', rate.reset);
  if (!res.ok) throw new ApiError('http', res.status);

  const data = await res.json();
  writeCache(key, data);
  return data;
}

async function paged(path, maxPages) {
  const out = [];
  for (let p = 1; p <= maxPages; p++) {
    const chunk = await gh(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${p}`);
    out.push(...chunk);
    if (chunk.length < 100) break;
  }
  return out;
}

export async function loadUser(login) {
  const profile = await gh(`/users/${encodeURIComponent(login)}`);
  const name = encodeURIComponent(profile.login);
  const [repos, events] = await Promise.all([
    paged(`/users/${name}/repos?type=owner&sort=pushed`, 5),
    paged(`/users/${name}/events/public`, 3).catch(e => {
      if (e.code === 'ratelimit') throw e;
      return [];
    })
  ]);
  return { profile, repos, events };
}
