/**
 * Grant applications: config, GitHub sign-in, live verification, submission and the admin view.
 *
 *   GET  /api/grants/config            → { turnstileSiteKey, githubEnabled }
 *   GET  /api/grants/github/login|callback, POST /api/grants/github/logout  → see githubSession.js
 *   GET  /api/grants/github/me         → { login, avatar, eligible, stats?, repos: [{ fullName, url }] } or 401
 *                                        (`stats` only while GRANT_SHOW_METRICS="1")
 *   GET  /api/grants/verify            → ?repo=&video=  live checks for the form (repo needs a session)
 *   POST /api/grants/apply             → signed-in, gated, validated, rate-limited insert into D1
 *   GET  /admin/grants                 → Basic-auth protected HTML tables (?format=csv&table=applications|logins)
 *
 * Every rule is re-checked here; the browser only mirrors them for instant feedback. The account gate's
 * thresholds and the applicant's metrics never appear in a public response (see worker/github.js).
 */
import { validateApplication, parseRepoUrl, parseVideoUrl } from '../src/config/grantForm.js';
import { PICKER_REPOS, checkRepo, evaluateGate, gateThresholds, ownedRepos } from './github.js';
import { githubAuthConfigured, handleGithubCallback, handleGithubLogin, handleGithubLogout, readSession } from './githubSession.js';
import { json, readJson, secureCompare, sha256Hex } from './http.js';
import { notifyNewApplication } from './notify.js';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const OEMBED_ENDPOINTS = {
  youtube: 'https://www.youtube.com/oembed?format=json&url=',
  vimeo: 'https://vimeo.com/api/oembed.json?url=',
  loom: 'https://www.loom.com/v1/oembed?url=',
};

// Max submissions per hashed IP inside IP_WINDOW_MS. Default: 3 per 24h. Raise for shared NATs (labs, offices).
const IP_LIMIT = 3;
const IP_WINDOW_MS = 24 * 60 * 60 * 1000;
// One application per email, and per GitHub account, inside REAPPLY_WINDOW_MS. Default: 30 days.
// Lower to allow faster re-applications; raise to space them out further.
const REAPPLY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
// Rows rendered on the admin page (CSV export is unbounded). Default: 500.
const ADMIN_PAGE_ROWS = 500;
// Salt prefix for IP hashing, so stored hashes are not plain SHA-256(ip) lookups.
const IP_HASH_PREFIX = 'vennai-grants:';
// The single error code for any gate failure; deliberately says nothing about which criterion failed.
const NOT_ELIGIBLE = 'not_eligible';

export async function handleGrantsApi(request, env, url, ctx) {
  const route = `${request.method} ${url.pathname.slice('/api/grants/'.length)}`;
  switch (route) {
    case 'GET config':
      return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || '', githubEnabled: githubAuthConfigured(env) });
    case 'GET github/login':
      return handleGithubLogin(env, url);
    case 'GET github/callback':
      return handleGithubCallback(request, env, url);
    case 'POST github/logout':
      return handleGithubLogout();
    case 'GET github/me':
      return handleMe(request, env);
    case 'GET verify':
      return handleVerify(request, env, url);
    case 'POST apply':
      return handleApply(request, env, url, ctx);
    default:
      return json({ error: 'not_found' }, 404);
  }
}

const clientIp = (request) => request.headers.get('CF-Connecting-IP') || '0.0.0.0';

// Light per-IP throttle (Workers rate-limit binding) for routes that fan out to GitHub / oEmbed.
async function throttled(request, env) {
  if (!env.GRANTS_VERIFY_LIMITER) return false;
  const { success } = await env.GRANTS_VERIFY_LIMITER.limit({ key: clientIp(request) });
  return !success;
}

// ── Signed-in account ─────────────────────────────────────────

async function handleMe(request, env) {
  const session = await readSession(request, env);
  if (!session) return json({ error: 'not_signed_in' }, 401);
  if (await throttled(request, env)) return json({ error: 'rate_limited' }, 429);

  const repos = await ownedRepos(env, session.login);
  if (!repos) return json({ error: 'github_unavailable' }, 502);
  const { eligible, stats } = evaluateGate(repos, gateThresholds(env));
  return json({
    login: session.login,
    avatar: session.avatar,
    // Test-release switch: the applicant's own numbers, never thresholds or per-criterion results.
    ...(env.GRANT_SHOW_METRICS === '1' && { stats }),
    eligible,
    // Ordered by stars server-side; the counts themselves stay private.
    repos: repos.slice(0, PICKER_REPOS).map(({ fullName, url }) => ({ fullName, url })),
  });
}

// ── Live verification ─────────────────────────────────────────

async function handleVerify(request, env, url) {
  if (await throttled(request, env)) return json({ error: 'rate_limited' }, 429);

  const repoParam = url.searchParams.get('repo');
  const videoParam = url.searchParams.get('video');
  const result = {};

  if (repoParam) {
    const repo = parseRepoUrl(repoParam);
    const session = repo && (await readSession(request, env));
    if (!repo) result.repo = { ok: false, error: 'invalid_repo_url' };
    else if (!session) result.repo = { ok: false, error: 'not_signed_in' };
    else {
      const { ok, error, fullName, relation } = await checkRepo(env, repo, session.login);
      result.repo = ok ? { ok, fullName, relation } : { ok, error };
    }
  }
  if (videoParam) {
    const video = parseVideoUrl(videoParam);
    result.video = video ? await checkVideo(video) : { ok: false, error: 'video_invalid_url' };
  }
  return json(result);
}

// ── Submission ────────────────────────────────────────────────

async function handleApply(request, env, url, ctx) {
  if (!env.GRANTS_DB || !env.TURNSTILE_SECRET_KEY || !env.GRANT_SESSION_SECRET) {
    return json({ error: 'not_configured' }, 503);
  }
  // Identity comes only from the signed session, never from the request body.
  const session = await readSession(request, env);
  if (!session) return json({ error: 'not_signed_in' }, 401);

  const body = await readJson(request);
  const { errors, value } = validateApplication(body);
  if (Object.keys(errors).length) {
    return json({ error: 'invalid_fields', fields: errors }, 400);
  }

  const ip = clientIp(request);
  if (!(await verifyTurnstile(env, body.turnstileToken, ip))) {
    return json({ error: 'turnstile_failed' }, 403);
  }

  const now = Date.now();
  const ipHash = await sha256Hex(IP_HASH_PREFIX + ip);
  const count = (column, key, since) => env.GRANTS_DB
    .prepare(`SELECT COUNT(*) AS n FROM grant_applications WHERE ${column} = ? AND created_at > ?`)
    .bind(key, since);
  const [ipCount, emailCount, githubCount] = await env.GRANTS_DB.batch([
    count('ip_hash', ipHash, now - IP_WINDOW_MS),
    count('email', value.email, now - REAPPLY_WINDOW_MS),
    count('github_id', session.id, now - REAPPLY_WINDOW_MS),
  ]);
  if (ipCount.results[0].n >= IP_LIMIT) return json({ error: 'rate_limited' }, 429);
  if (emailCount.results[0].n > 0) return json({ error: 'duplicate_email' }, 409);
  if (githubCount.results[0].n > 0) return json({ error: 'duplicate_github' }, 409);

  const [repos, repoCheck] = await Promise.all([
    ownedRepos(env, session.login),
    checkRepo(env, parseRepoUrl(value.repoUrl), session.login),
  ]);
  if (!repos) return json({ error: 'github_unavailable' }, 502);
  if (!repoCheck.ok) return json({ error: repoCheck.error }, 422);

  const gate = evaluateGate(repos, gateThresholds(env));
  if (!gate.eligible) return json({ error: NOT_ELIGIBLE }, 403);

  let videoTitle = null;
  if (value.videoUrl) {
    const videoCheck = await checkVideo(parseVideoUrl(value.videoUrl));
    if (!videoCheck.ok) return json({ error: videoCheck.error }, 422);
    videoTitle = videoCheck.title;
  }

  await env.GRANTS_DB.prepare(
    `INSERT INTO grant_applications (
       created_at, status, name, email, applicant_type, github_id, github_login, repo_url, result, grant_use,
       amount_usd, video_url, referrer, ip_hash, repo_stars, repo_forks, repo_description,
       repo_pushed_at, github_relation, video_title, repo_count, avg_stars, max_stars
     ) VALUES (?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    // Store GitHub's canonical name: transferred / renamed repos redirect to their new owner.
    now, value.name, value.email, value.applicantType, session.id, session.login, `https://github.com/${repoCheck.fullName}`,
    value.result, value.grantUse, value.amount, value.videoUrl || null, value.referrer || null, ipHash,
    repoCheck.stars, repoCheck.forks, repoCheck.description, repoCheck.pushedAt, repoCheck.relation, videoTitle,
    gate.stats.repoCount, gate.stats.avgStars, gate.stats.maxStars,
  ).run();

  ctx.waitUntil(notifyNewApplication(env, url.origin, {
    ...value, githubLogin: session.login, repoUrl: `https://github.com/${repoCheck.fullName}`,
    repoStars: repoCheck.stars, relation: repoCheck.relation, stats: gate.stats,
  }));
  return json({ ok: true });
}

async function verifyTurnstile(env, token, ip) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
  });
  const outcome = await response.json().catch(() => ({}));
  return outcome.success === true;
}

// ── Video (oEmbed) ────────────────────────────────────────────

async function checkVideo({ provider, url }) {
  const response = await fetch(OEMBED_ENDPOINTS[provider] + encodeURIComponent(url), {
    headers: { 'User-Agent': 'vennai-grants' },
  });
  if (!response.ok) return { ok: false, error: 'video_not_found' };
  const data = await response.json().catch(() => null);
  if (!data) return { ok: false, error: 'video_not_found' };
  return { ok: true, provider, title: data.title ? String(data.title).slice(0, 300) : null };
}

// ── Admin view ────────────────────────────────────────────────

// Admin tables, each exportable as CSV via ?format=csv&table=<key>. Newest first.
const ADMIN_TABLES = {
  applications: {
    title: 'Grant applications',
    sql: 'SELECT * FROM grant_applications ORDER BY created_at DESC',
    columns: [
      ['id', 'ID'], ['created_at', 'Submitted (UTC)'], ['status', 'Status'], ['name', 'Name'], ['email', 'Email'],
      ['applicant_type', 'Type'], ['amount_usd', 'USD'], ['github_login', 'GitHub login'], ['github_id', 'GitHub ID'],
      ['repo_count', 'Owned repos'], ['avg_stars', 'Avg stars'], ['max_stars', 'Max stars'], ['github_relation', 'Relation'],
      ['repo_url', 'Repository'], ['repo_stars', 'Stars'], ['repo_forks', 'Forks'], ['repo_pushed_at', 'Last push'],
      ['repo_description', 'Repo description'], ['result', 'Result so far'], ['grant_use', 'Grant buys'],
      ['video_url', 'Video'], ['video_title', 'Video title'], ['referrer', 'Referrer'],
    ],
  },
  logins: {
    title: 'GitHub sign-ins',
    sql: 'SELECT * FROM github_logins ORDER BY last_seen DESC',
    columns: [
      ['github_id', 'GitHub ID'], ['login', 'Login'], ['eligible', 'Eligible'], ['repo_count', 'Owned repos'],
      ['avg_stars', 'Avg stars'], ['max_stars', 'Max stars'], ['login_count', 'Sign-ins'],
      ['first_seen', 'First seen (UTC)'], ['last_seen', 'Last seen (UTC)'], ['avatar_url', 'Avatar'],
    ],
  },
};
const LINK_COLUMNS = new Set(['repo_url', 'video_url', 'avatar_url']);
// Epoch-millisecond columns rendered as "YYYY-MM-DD HH:MM" UTC.
const TIME_COLUMNS = ['created_at', 'first_seen', 'last_seen'];

async function loadAdminRows(env, table, limit) {
  const { results } = await env.GRANTS_DB.prepare(`${ADMIN_TABLES[table].sql}${limit ? ` LIMIT ${limit}` : ''}`).all();
  return results.map((row) => {
    const formatted = { ...row };
    for (const key of TIME_COLUMNS) {
      if (key in row && row[key] != null) formatted[key] = new Date(row[key]).toISOString().replace('T', ' ').slice(0, 16);
    }
    return formatted;
  });
}

export async function handleGrantsAdmin(request, env, url) {
  const privateHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };

  // Never serve applications unprotected: without a configured password the page is simply off.
  if (!env.ADMIN_PASSWORD || !env.GRANTS_DB) {
    return new Response('Admin is not configured.', { status: 503, headers: privateHeaders });
  }
  if (!(await isAdmin(request, env.ADMIN_PASSWORD))) {
    return new Response('Authentication required.', {
      status: 401,
      headers: { ...privateHeaders, 'WWW-Authenticate': 'Basic realm="Vennai grants", charset="UTF-8"' },
    });
  }

  if (url.searchParams.get('format') === 'csv') {
    const table = ADMIN_TABLES[url.searchParams.get('table')] ? url.searchParams.get('table') : 'applications';
    const rows = await loadAdminRows(env, table, 0);
    return new Response(toCsv(ADMIN_TABLES[table].columns, rows), {
      headers: {
        ...privateHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="grant-${table}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const sections = await Promise.all(Object.keys(ADMIN_TABLES).map(async (table) => (
    renderAdminSection(table, await loadAdminRows(env, table, ADMIN_PAGE_ROWS))
  )));
  return new Response(renderAdminPage(sections.join('')), {
    headers: {
      ...privateHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      // Applicant text is untrusted: forbid all scripts on this page.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}

async function isAdmin(request, password) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  let decoded = '';
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0)));
  } catch {
    return false;
  }
  const given = decoded.slice(decoded.indexOf(':') + 1); // username is ignored
  // Compare fixed-length digests so neither content nor length leaks through timing.
  return secureCompare(await sha256Hex(given), await sha256Hex(password));
}

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function renderAdminSection(table, rows) {
  const { title, columns } = ADMIN_TABLES[table];
  const head = columns.map(([, label]) => `<th>${label}</th>`).join('');
  const body = rows.map((row) => `<tr>${columns.map(([key]) => {
    const value = row[key];
    if (LINK_COLUMNS.has(key) && value) {
      return `<td><a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value)}</a></td>`;
    }
    return `<td>${escapeHtml(value)}</td>`;
  }).join('')}</tr>`).join('');

  return `<h1>${title}</h1>
<p>${rows.length} shown, newest first · <a href="?format=csv&amp;table=${table}">Download CSV</a></p>
<div class="wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderAdminPage(content) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Grant applications</title>
<style>
body{margin:0;padding:24px;background:#05080f;color:#e8eaf0;font:13px/1.45 ui-sans-serif,system-ui,sans-serif}
h1{font-weight:400;font-size:20px;margin:0 0 4px}p{color:#9aa3b5;margin:0 0 16px}a{color:#ffd27a}
.wrap{overflow-x:auto;border:1px solid #1d2433;margin-bottom:40px}table{border-collapse:collapse;min-width:100%}
th,td{padding:8px 10px;border-bottom:1px solid #1d2433;text-align:left;vertical-align:top}
th{position:sticky;top:0;background:#0b1020;font:11px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;color:#ffd27a;white-space:nowrap}
td{max-width:360px;white-space:pre-wrap;word-break:break-word}
</style></head><body>
${content}
</body></html>`;
}

function toCsv(columns, rows) {
  const cell = (value) => {
    let text = String(value ?? '');
    // Neutralise spreadsheet formula injection from applicant-supplied text.
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const lines = [columns.map(([key]) => cell(key)).join(',')];
  for (const row of rows) lines.push(columns.map(([key]) => cell(row[key])).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
