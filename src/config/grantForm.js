/**
 * Grant application form rules — shared by the /apply page (instant feedback)
 * and worker/grants.js (authoritative re-validation; the client is never trusted).
 * Ships to the browser: the GitHub account gate thresholds must never live here (see worker/github.js).
 */

// Max characters for the two long-answer textareas.
// Default: 600. Raise to allow longer answers (slower review); lower to force sharper pitches.
export const LONG_TEXT_MAX = 600;

// Max characters for short single-line fields (name, referrer).
// Default: 120. Only guards against junk payloads; lowering may truncate real names.
export const SHORT_TEXT_MAX = 120;

// Requested grant range in whole US dollars.
// Default: 1000 – 10000. Must match the amounts promised in COPY.funding.
export const AMOUNT_MIN_USD = 1000;
export const AMOUNT_MAX_USD = 10000;

export const APPLICANT_TYPES = ['researcher', 'startup'];

// Video hosts accepted for the optional pitch (verified server-side via oEmbed).
export const VIDEO_PROVIDERS = {
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
  vimeo: ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'],
  loom: ['loom.com', 'www.loom.com'],
};

// Longest URL accepted for repo / video links; anything longer is treated as invalid.
const URL_MAX = 300;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GITHUB_LOGIN_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const GITHUB_REPO_RE = /^[\w.-]{1,100}$/;

/** Parse a GitHub repository URL into `{ owner, repo, url }`, or null if it is not one. */
export function parseRepoUrl(input) {
  const url = parseHttpUrl(input);
  if (!url || !['github.com', 'www.github.com'].includes(url.hostname)) return null;
  const [owner, rawRepo] = url.pathname.split('/').filter(Boolean);
  const repo = rawRepo?.replace(/\.git$/i, '');
  if (!owner || !repo || !GITHUB_LOGIN_RE.test(owner) || !GITHUB_REPO_RE.test(repo)) return null;
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}

/** Return `{ provider, url }` for a YouTube / Vimeo / Loom link, or null. */
export function parseVideoUrl(input) {
  const url = parseHttpUrl(input);
  if (!url) return null;
  const provider = Object.keys(VIDEO_PROVIDERS).find((key) => VIDEO_PROVIDERS[key].includes(url.hostname));
  return provider ? { provider, url: url.toString() } : null;
}

function parseHttpUrl(input) {
  const raw = String(input ?? '').trim();
  if (!raw || raw.length > URL_MAX) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

const text = (value) => String(value ?? '').trim();

/**
 * Validate and normalize a raw application payload.
 * Returns `{ errors, value }`; `errors` maps field name → 'required' | 'too_long' | 'invalid'.
 */
export function validateApplication(input = {}) {
  const errors = {};
  const value = {};

  const requireText = (field, max) => {
    const v = text(input[field]);
    if (!v) errors[field] = 'required';
    else if (v.length > max) errors[field] = 'too_long';
    value[field] = v;
  };

  requireText('name', SHORT_TEXT_MAX);
  requireText('result', LONG_TEXT_MAX);
  requireText('grantUse', LONG_TEXT_MAX);

  value.email = text(input.email).toLowerCase();
  if (!value.email) errors.email = 'required';
  else if (value.email.length > 254 || !EMAIL_RE.test(value.email)) errors.email = 'invalid';

  value.applicantType = text(input.applicantType);
  if (!APPLICANT_TYPES.includes(value.applicantType)) errors.applicantType = 'required';

  const repo = parseRepoUrl(input.repoUrl);
  value.repoUrl = repo?.url ?? text(input.repoUrl);
  if (!text(input.repoUrl)) errors.repoUrl = 'required';
  else if (!repo) errors.repoUrl = 'invalid';

  const amountRaw = text(input.amount);
  value.amount = Number(amountRaw);
  if (!amountRaw) errors.amount = 'required';
  else if (!Number.isInteger(value.amount) || value.amount < AMOUNT_MIN_USD || value.amount > AMOUNT_MAX_USD) {
    errors.amount = 'invalid';
  }

  const video = text(input.videoUrl);
  const parsedVideo = parseVideoUrl(video);
  value.videoUrl = parsedVideo?.url ?? video;
  if (video && !parsedVideo) errors.videoUrl = 'invalid';

  value.referrer = text(input.referrer);
  if (value.referrer.length > SHORT_TEXT_MAX) errors.referrer = 'too_long';

  return { errors, value };
}
