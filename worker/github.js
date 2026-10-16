/**
 * Public GitHub data for the grant gate: the account-level gate over the applicant's own repos,
 * and the ownership / contribution check for the selected project repo.
 *
 * The gate thresholds never leave the server, and neither do the applicant's metrics (admin view only)
 * unless the test-release flag GRANT_SHOW_METRICS="1" shows applicants their own numbers on /me.
 * Applicants who could see the criteria would game them.
 */
export const GITHUB_API = 'https://api.github.com';
export const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'vennai-grants',
  'X-GitHub-Api-Version': '2022-11-28',
};

// Fallback gate thresholds when the wrangler vars are unset or malformed (production values).
// Defaults: 10 repos / 10 average stars / 100 stars on the best repo. See wrangler.toml for tuning effects.
const DEFAULT_THRESHOLDS = { repos: 10, avg: 10, max: 100 };
// Pages of 100 repos read per account. Default: 10 (first 1000 owned repos). Raise for very prolific
// accounts (more GitHub calls per check); lower to save API quota (huge accounts get undercounted).
const REPO_PAGES_MAX = 10;
// Owned repos offered in the /apply project picker, most-starred first. Default: 30.
// Raise if applicants miss their project in the list; lower for a shorter select.
export const PICKER_REPOS = 30;

export function githubFetch(env, path) {
  // Unauthenticated calls are capped at 60/h per Worker egress IP; the app token lifts that to 5000/h.
  const headers = env.GITHUB_TOKEN ? { ...GITHUB_HEADERS, Authorization: `Bearer ${env.GITHUB_TOKEN}` } : GITHUB_HEADERS;
  return fetch(`${GITHUB_API}${path}`, { headers });
}

function readThreshold(raw, fallback) {
  const value = Number(raw);
  return raw !== undefined && raw !== '' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function gateThresholds(env) {
  return {
    repos: readThreshold(env.GRANT_MIN_REPOS, DEFAULT_THRESHOLDS.repos),
    avg: readThreshold(env.GRANT_MIN_AVG_STARS, DEFAULT_THRESHOLDS.avg),
    max: readThreshold(env.GRANT_MIN_MAX_STARS, DEFAULT_THRESHOLDS.max),
  };
}

/** Public, non-fork repos owned by `login`, most-starred first: `[{ fullName, url, stars }]`, or null if GitHub failed. */
export async function ownedRepos(env, login) {
  const repos = [];
  for (let page = 1; page <= REPO_PAGES_MAX; page += 1) {
    const response = await githubFetch(env, `/users/${encodeURIComponent(login)}/repos?type=owner&per_page=100&page=${page}`);
    if (!response.ok) return null;
    const batch = await response.json();
    for (const repo of batch) {
      if (!repo.fork && !repo.private) repos.push({ fullName: repo.full_name, url: repo.html_url, stars: repo.stargazers_count });
    }
    if (batch.length < 100) break;
  }
  return repos.sort((a, b) => b.stars - a.stars);
}

/**
 * Account gate over `repos` (from ownedRepos). All three must hold:
 *   repos — at least `thresholds.repos` public, non-fork repos owned by the applicant;
 *   avg   — average stars across those repos ≥ `thresholds.avg`;
 *   max   — the most-starred repo ≥ `thresholds.max`.
 * Startups often keep their flagship repo under an organization, so for the `max` metric only, the
 * selected project repo also counts when it is org-owned and the applicant is a verified contributor
 * (`projectStars`; pass 0 otherwise). It never enters the `repos` / `avg` metrics.
 */
export function evaluateGate(repos, thresholds, projectStars = 0) {
  const repoCount = repos.length;
  const avgStars = repoCount ? repos.reduce((sum, repo) => sum + repo.stars, 0) / repoCount : 0;
  const maxStars = Math.max(repos[0]?.stars ?? 0, projectStars);
  const passes = { repos: repoCount >= thresholds.repos, avg: avgStars >= thresholds.avg, max: maxStars >= thresholds.max };
  return {
    stats: { repoCount, avgStars: Math.round(avgStars * 10) / 10, maxStars },
    passes,
    eligible: passes.repos && passes.avg && passes.max,
  };
}

/**
 * Check that `{ owner, repo }` is public, not a fork, and that `login` owns it or appears among its
 * contributors. Returns `{ ok, error? , fullName, stars, forks, description, pushedAt, relation, orgOwned }`.
 */
export async function checkRepo(env, { owner, repo }, login) {
  const response = await githubFetch(env, `/repos/${owner}/${repo}`);
  if (response.status === 404) return { ok: false, error: 'repo_not_found' };
  if (!response.ok) return { ok: false, error: 'github_unavailable' };

  const data = await response.json();
  if (data.private) return { ok: false, error: 'repo_not_found' };
  if (data.fork) return { ok: false, error: 'repo_fork' };

  const relation = await githubRelation(env, data, login);
  if (relation === 'unavailable') return { ok: false, error: 'github_unavailable' };
  if (!relation) return { ok: false, error: 'repo_not_contributor' };
  return {
    ok: true,
    relation,
    fullName: data.full_name,
    stars: data.stargazers_count,
    forks: data.forks_count,
    description: data.description ? String(data.description).slice(0, 500) : null,
    pushedAt: data.pushed_at || null,
    orgOwned: data.owner?.type === 'Organization',
  };
}

async function githubRelation(env, repoData, user) {
  const login = user.toLowerCase();
  if (repoData.owner?.login?.toLowerCase() === login) return 'owner';

  const path = `/repos/${repoData.full_name}`;
  const response = await githubFetch(env, `${path}/contributors?per_page=100`);
  if (response.status === 204) return null; // empty repository
  // 403 here means the history is too large for GitHub to list contributors; use the commit check below.
  if (!response.ok && response.status !== 403) return 'unavailable';
  if (response.ok) {
    const contributors = await response.json();
    if (contributors.some((c) => c.login?.toLowerCase() === login)) return 'contributor';
    if (contributors.length < 100) return null;
  }

  // Large repos: the first page only lists the top 100, so fall back to "has authored a commit".
  const commits = await githubFetch(env, `${path}/commits?per_page=1&author=${encodeURIComponent(user)}`);
  if (!commits.ok) return 'unavailable';
  return (await commits.json()).length > 0 ? 'contributor' : null;
}
