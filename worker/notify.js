import { EmailMessage } from 'cloudflare:email';

/**
 * Email the team when an application passes every check and is stored.
 * Uses the Email Routing `send_email` binding (GRANT_NOTIFY), which can only deliver to verified
 * destination addresses — see wrangler.toml. Missing config = silently skipped; failures never
 * affect the applicant's response (called via ctx.waitUntil).
 */

const FROM = 'grants@vennai.org';

// Base64 of UTF-8 text, wrapped at 76 columns as MIME requires.
function base64Utf8(text) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/.{76}/g, '$&\r\n');
}

// RFC 2047 encoded-word; also strips CR/LF so applicant input can't inject headers.
const encodeHeader = (text) => `=?UTF-8?B?${base64Utf8(text.replace(/[\r\n]+/g, ' ')).replace(/\r\n/g, '')}?=`;

export async function notifyNewApplication(env, siteUrl, app) {
  if (!env.GRANT_NOTIFY || !env.GRANT_NOTIFY_TO) return;
  const body = [
    `New grant application from ${app.name} (@${app.githubLogin})`,
    '',
    `Email:        ${app.email}`,
    `Type:         ${app.applicantType}`,
    `Amount:       $${app.amount}`,
    `Project repo: ${app.repoUrl} (★${app.repoStars}, ${app.relation})`,
    `GitHub:       https://github.com/${app.githubLogin} — ${app.stats.repoCount} repos, avg ★${app.stats.avgStars}, top ★${app.stats.maxStars}`,
    app.videoUrl ? `Video:        ${app.videoUrl}` : null,
    app.referrer ? `Referrer:     ${app.referrer}` : null,
    '',
    'Result already achieved:',
    app.result,
    '',
    'What the grant buys:',
    app.grantUse,
    '',
    `Review all applications: ${siteUrl}/admin/grants`,
  ].filter((line) => line !== null).join('\r\n');

  const raw = [
    `From: Venn Grants <${FROM}>`,
    `To: ${env.GRANT_NOTIFY_TO}`,
    `Reply-To: ${app.email.replace(/[\r\n<>]/g, '')}`,
    `Subject: ${encodeHeader(`[Grant] ${app.name} · @${app.githubLogin} · $${app.amount}`)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@vennai.org>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Utf8(body),
  ].join('\r\n');

  try {
    await env.GRANT_NOTIFY.send(new EmailMessage(FROM, env.GRANT_NOTIFY_TO, raw));
  } catch (error) {
    console.error('grant notify failed', error);
  }
}
