/**
 * Sign in with GitHub (OAuth App, no scopes: public identity only) and the signed session cookie it issues.
 *
 *   GET  /api/grants/github/login     → state cookie + redirect to GitHub (`?switch=1` forces the account picker)
 *   GET  /api/grants/github/callback  → verify state, resolve the user, set the session cookie, back to /apply
 *   POST /api/grants/github/logout    → clear the session cookie
 *
 * The user's OAuth token only lives inside the callback request; the session holds `{ id, login, avatar, exp }`
 * signed with HMAC-SHA256 (secret GRANT_SESSION_SECRET). Errors land on /apply?github_error=<code>.
 * Every successful sign-in is also upserted into D1 `github_logins` with the account's gate snapshot.
 */
import { GITHUB_API, GITHUB_HEADERS, evaluateGate, gateThresholds, ownedRepos } from './github.js';
import { cookie, json, readCookie, secureCompare } from './http.js';

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const CALLBACK_PATH = '/api/grants/github/callback';
// The state cookie is only ever needed by the callback, so scope it to the OAuth routes.
const STATE_PATH = '/api/grants/github';
const STATE_COOKIE = 'vennai_gh_state';
const SESSION_COOKIE = 'vennai_gh_session';
// Time allowed for the GitHub round trip before the state expires. Default: 600 s (10 min).
// Lower narrows the login-CSRF window; too low breaks slow logins (2FA, new-device checks).
const STATE_TTL_S = 600;
// Session lifetime after connecting. Default: 7200 s (2 h). Raise if applicants need longer to fill
// the form before reconnecting; lower to shorten the life of a stolen cookie.
const SESSION_TTL_S = 7200;

const encoder = new TextEncoder();
const toBase64Url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const hmacKey = (secret) => crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

export const githubAuthConfigured = (env) => Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.GRANT_SESSION_SECRET);

function redirect(location, cookies = []) {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 302, headers });
}

export function handleGithubLogin(env, url) {
  if (!githubAuthConfigured(env)) return redirect('/apply?github_error=not_configured');
  const state = toBase64Url(crypto.getRandomValues(new Uint8Array(24)));
  const authorize = new URL(AUTHORIZE_URL);
  // The origin comes from the request, so a dev OAuth app with a localhost callback works too.
  authorize.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: url.origin + CALLBACK_PATH, state });
  if (url.searchParams.has('switch')) authorize.searchParams.set('prompt', 'select_account');
  return redirect(authorize.toString(), [cookie(STATE_COOKIE, state, { maxAge: STATE_TTL_S, path: STATE_PATH })]);
}

export async function handleGithubCallback(request, env, url) {
  const clearState = cookie(STATE_COOKIE, '', { maxAge: 0, path: STATE_PATH });
  const fail = (code) => redirect(`/apply?github_error=${code}`, [clearState]);
  if (!githubAuthConfigured(env)) return fail('not_configured');
  if (url.searchParams.get('error')) return fail('denied');

  const expected = readCookie(request, STATE_COOKIE) || '';
  const given = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code');
  if (!expected || !code || !secureCompare(given, expected)) return fail('state_mismatch');

  try {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': GITHUB_HEADERS['User-Agent'] },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: url.origin + CALLBACK_PATH,
      }),
    });
    const { access_token: token } = await tokenResponse.json().catch(() => ({}));
    if (!token) return fail('exchange_failed');

    // The token is used for this one call and then dropped; nothing stores it.
    const userResponse = await fetch(`${GITHUB_API}/user`, { headers: { ...GITHUB_HEADERS, Authorization: `Bearer ${token}` } });
    if (!userResponse.ok) return fail('github_unavailable');
    const user = await userResponse.json();
    await recordSignIn(env, user);

    const session = await signSession(env, {
      id: user.id,
      login: user.login,
      avatar: user.avatar_url,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S,
    });
    return redirect('/apply', [clearState, cookie(SESSION_COOKIE, session, { maxAge: SESSION_TTL_S })]);
  } catch {
    return fail('github_unavailable');
  }
}

/** Snapshot the account gate and record the sign-in; failures here never block signing in. */
async function recordSignIn(env, user) {
  if (!env.GRANTS_DB) return;
  try {
    const repos = await ownedRepos(env, user.login);
    await recordGithubLogin(env.GRANTS_DB, user, repos && evaluateGate(repos, gateThresholds(env)), Date.now());
  } catch (error) {
    console.error('github_logins upsert failed', error);
  }
}

/**
 * Upsert one sign-in into `github_logins` (one row per GitHub account id). `gate` is evaluateGate()'s
 * result, or null when GitHub could not be read; the previous snapshot is then kept.
 */
export function recordGithubLogin(db, user, gate, now) {
  return db.prepare(
    `INSERT INTO github_logins (github_id, login, avatar_url, repo_count, avg_stars, max_stars, eligible, login_count, first_seen, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(github_id) DO UPDATE SET
       login = excluded.login,
       avatar_url = excluded.avatar_url,
       repo_count = COALESCE(excluded.repo_count, repo_count),
       avg_stars = COALESCE(excluded.avg_stars, avg_stars),
       max_stars = COALESCE(excluded.max_stars, max_stars),
       eligible = COALESCE(excluded.eligible, eligible),
       login_count = login_count + 1,
       last_seen = excluded.last_seen`,
  ).bind(
    user.id, user.login, user.avatar_url ?? null,
    gate?.stats.repoCount ?? null, gate?.stats.avgStars ?? null, gate?.stats.maxStars ?? null,
    gate ? Number(gate.eligible) : null, now, now,
  ).run();
}

export function handleGithubLogout() {
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(SESSION_COOKIE, '', { maxAge: 0 }) });
}

async function signSession(env, payload) {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(env.GRANT_SESSION_SECRET), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/** The verified, unexpired session `{ id, login, avatar, exp }` from the request cookie, or null. */
export async function readSession(request, env) {
  const raw = readCookie(request, SESSION_COOKIE);
  if (!raw || !env.GRANT_SESSION_SECRET) return null;
  const [body, signature] = raw.split('.');
  if (!body || !signature) return null;
  try {
    // crypto.subtle.verify compares the MAC in constant time.
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(env.GRANT_SESSION_SECRET), fromBase64Url(signature), encoder.encode(body));
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    const fresh = session.exp > Date.now() / 1000;
    return fresh && Number.isInteger(session.id) && typeof session.login === 'string' ? session : null;
  } catch {
    return null;
  }
}
