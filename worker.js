import { json, readJson, secureCompare } from './worker/http.js';
import { handleGrantsAdmin, handleGrantsApi } from './worker/grants.js';

const CHECKOUT_PATH = '/api/checkout/formal-consulting';
const WEBHOOK_PATH = '/api/stripe/webhook';
const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const SIGNATURE_TOLERANCE_SECONDS = 300;
const APP_SHELL_VERSION = '2026-04-19-checkout';

// ── Chinese SEO: meta tag injection ──
// The Worker injects Chinese meta based on Accept-Language so Chinese crawlers
// and Chinese-speaking users see a Chinese title/description on first paint.
const ZH_META = {
  title: '文氏智能基金会 — AI 研究：自动驾驶、集体智能、智能交易',
  description: '文氏智能基金会资助并亲自开展前沿 AI 研究：闭环自动驾驶（资助参赛团队出战 2026 年 NVIDIA AlpaSim 端到端闭环挑战赛）、集体智能协议、AI 原生交易系统。',
  ogTitle: '文氏智能基金会 — AI 研究：自动驾驶、集体智能、智能交易',
  ogDescription: '前沿 AI 研究基金会。资助参赛团队出战 2026 年 NVIDIA AlpaSim 端到端闭环挑战赛；集体智能协议；AI 原生交易系统。',
  twitterTitle: '文氏智能基金会',
  twitterDescription: '前沿 AI 研究基金会。资助参赛团队出战 2026 年 NVIDIA AlpaSim 端到端闭环挑战赛。',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === CHECKOUT_PATH) {
      return handleCheckoutSession(request, env, url);
    }

    if (url.pathname === WEBHOOK_PATH) {
      return handleStripeWebhook(request, env);
    }

    if (url.pathname.startsWith('/api/grants/')) {
      return handleGrantsApi(request, env, url);
    }

    // Must run before the SPA shell, which would otherwise answer /admin/* with index.html.
    if (url.pathname === '/admin/grants') {
      return handleGrantsAdmin(request, env, url);
    }

    if (isAppShellRequest(request, url)) {
      return handleAppShell(request, env, url);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleCheckoutSession(request, env, url) {
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_FORMAL_CONSULTING_PRICE_ID) {
    return json({ error: 'stripe_not_configured' }, 500);
  }

  const { rate } = await readJson(request);
  const checkoutRate = rate === 'invite' ? 'invite' : 'standard';
  const origin = env.SITE_URL || url.origin;
  const params = new URLSearchParams({
    'line_items[0][price]': env.STRIPE_FORMAL_CONSULTING_PRICE_ID,
    'line_items[0][quantity]': '1',
    mode: 'payment',
    customer_creation: 'always',
    success_url: resolveReturnUrl(origin, env.STRIPE_SUCCESS_URL, '/?checkout=success#consultants'),
    cancel_url: resolveReturnUrl(origin, env.STRIPE_CANCEL_URL, '/?checkout=cancel#consultants'),
    'metadata[service]': 'formal_consulting',
    'metadata[rate]': checkoutRate,
  });

  if (checkoutRate === 'invite') {
    params.set('allow_promotion_codes', 'true');
  }

  const stripeResponse = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const payload = await stripeResponse.json().catch(() => ({}));

  if (!stripeResponse.ok || !payload.url) {
    return json(
      { error: payload.error?.message || 'stripe_checkout_session_failed' },
      502,
    );
  }

  return json({ url: payload.url });
}

async function handleStripeWebhook(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return json({ error: 'stripe_webhook_not_configured' }, 500);
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return json({ error: 'missing_stripe_signature' }, 400);
  }

  const payload = await request.text();
  const isValid = await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET);

  if (!isValid) {
    return json({ error: 'invalid_stripe_signature' }, 400);
  }

  const event = JSON.parse(payload);

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object || {};

    console.log(JSON.stringify({
      type: event.type,
      sessionId: session.id,
      customerEmail: session.customer_details?.email || null,
      rate: session.metadata?.rate || null,
      service: session.metadata?.service || null,
      paymentStatus: session.payment_status || null,
    }));
  }

  return json({ received: true });
}

function resolveReturnUrl(origin, configuredUrl, fallbackPath) {
  return configuredUrl
    ? new URL(configuredUrl, origin).toString()
    : new URL(fallbackPath, origin).toString();
}

async function handleAppShell(request, env, url) {
  const assetUrl = new URL('/index.html', url);
  assetUrl.searchParams.set('v', APP_SHELL_VERSION);

  const assetResponse = await env.ASSETS.fetch(new Request(assetUrl, request));
  const headers = new Headers(assetResponse.headers);

  headers.set('Cache-Control', 'no-store');
  // Vary on Accept-Language so CDN caches per-language versions
  headers.set('Vary', 'Accept-Language');

  const prefersZh = detectChinesePreference(request);
  const isHome = url.pathname === '/';

  if (!prefersZh && isHome) {
    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  }

  let html = await assetResponse.text();
  if (prefersZh) html = injectChineseMeta(html);
  if (!isHome) html = stripHomePreloads(html);
  return new Response(html, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}

/**
 * Remove the HomePage chunk preloads (tagged data-route="/" by vite-plugins/preloadHome.js)
 * so /blog, /drive and 404s do not download three.js they never use.
 */
function stripHomePreloads(html) {
  return html.replace(/<link [^>]*data-route="\/"[^>]*>\s*/g, '');
}

/**
 * Detect whether the request prefers Chinese.
 * Parses Accept-Language and returns true when the zh weight is at least the en weight.
 */
function detectChinesePreference(request) {
  const acceptLang = request.headers.get('Accept-Language') || '';
  // Fast path: no zh at all means no Chinese preference
  if (!acceptLang.includes('zh')) return false;

  // Parse language weights
  const langs = acceptLang.split(',').map(part => {
    const [lang, qPart] = part.trim().split(';');
    const q = qPart ? parseFloat(qPart.replace('q=', '')) : 1.0;
    return { lang: lang.trim().toLowerCase(), q: isNaN(q) ? 0 : q };
  });

  const zhQ = Math.max(0, ...langs.filter(l => l.lang.startsWith('zh')).map(l => l.q));
  const enQ = Math.max(0, ...langs.filter(l => l.lang.startsWith('en')).map(l => l.q));

  return zhQ > 0 && zhQ >= enQ;
}

/**
 * Replace the English meta tags in index.html with Chinese versions.
 * Only SEO-relevant tags are touched; everything else is left as is.
 */
function injectChineseMeta(html) {
  return html
    // <html lang>
    .replace('<html lang="en">', '<html lang="zh-CN">')
    // <title>
    .replace(/<title>[^<]+<\/title>/, `<title>${ZH_META.title}</title>`)
    // <meta name="description">
    .replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${ZH_META.description}" />`
    )
    // og:title
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${ZH_META.ogTitle}" />`
    )
    // og:description
    .replace(
      /<meta property="og:description" content="[^"]*" \/>/,
      `<meta property="og:description" content="${ZH_META.ogDescription}" />`
    )
    // og:locale — switch primary locale
    .replace(
      /<meta property="og:locale" content="en_US" \/>/,
      '<meta property="og:locale" content="zh_CN" />'
    )
    // twitter:title
    .replace(
      /<meta name="twitter:title" content="[^"]*" \/>/,
      `<meta name="twitter:title" content="${ZH_META.twitterTitle}" />`
    )
    // twitter:description
    .replace(
      /<meta name="twitter:description" content="[^"]*" \/>/,
      `<meta name="twitter:description" content="${ZH_META.twitterDescription}" />`
    );
}

function isAppShellRequest(request, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return false;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/api/')) {
    return false;
  }

  if (/\.[a-z0-9]+$/i.test(url.pathname)) {
    return false;
  }

  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html') || url.pathname === '/';
}

async function verifyStripeSignature(payload, signatureHeader, secret) {
  const parts = parseStripeSignature(signatureHeader);
  const timestamp = Number(parts.t?.[0]);
  const signatures = parts.v1 || [];

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);

  if (ageSeconds > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = await hmacSha256Hex(secret, signedPayload);

  return signatures.some((value) => secureCompare(value, expectedSignature));
}

function parseStripeSignature(signatureHeader) {
  return signatureHeader.split(',').reduce((result, item) => {
    const [key, value] = item.split('=');

    if (!key || !value) {
      return result;
    }

    if (!result[key]) {
      result[key] = [];
    }

    result[key].push(value);
    return result;
  }, {});
}

async function hmacSha256Hex(secret, payload) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));

  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

