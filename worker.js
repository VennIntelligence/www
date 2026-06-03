const CHECKOUT_PATH = '/api/checkout/formal-consulting';
const WEBHOOK_PATH = '/api/stripe/webhook';
const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const SIGNATURE_TOLERANCE_SECONDS = 300;
const APP_SHELL_VERSION = '2026-04-19-checkout';

// ── 中文 SEO：meta 标签注入 ──
// Worker 层根据 Accept-Language 头注入中文 meta，
// 让 Google 中文爬虫和中文用户首屏都能看到中文 title/description。
const ZH_META = {
  title: '文氏智能基金会 — AI 基础设施与智能交易',
  description: '文氏智能基金会 — 资助人类集体智慧的首批基础设施协议。Project Σ（去中心化智能协议）和 Project Ω（AI 原生交易系统）。',
  ogTitle: '文氏智能基金会 — AI 基础设施与智能交易',
  ogDescription: '资助人类集体智慧的首批基础设施协议。Project Σ（去中心化智能协议）和 Project Ω（AI 原生交易系统）。',
  twitterTitle: '文氏智能基金会',
  twitterDescription: '资助人类集体智慧的首批基础设施协议。',
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

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function resolveReturnUrl(origin, configuredUrl, fallbackPath) {
  return configuredUrl
    ? new URL(configuredUrl, origin).toString()
    : new URL(fallbackPath, origin).toString();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
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

  // 如果偏好中文，注入中文 meta 标签
  if (prefersZh) {
    let html = await assetResponse.text();
    html = injectChineseMeta(html);
    return new Response(html, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  }

  return new Response(assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}

/**
 * 检测请求是否偏好中文。
 * 解析 Accept-Language 头，如果 zh 系列语言的权重高于 en 则返回 true。
 */
function detectChinesePreference(request) {
  const acceptLang = request.headers.get('Accept-Language') || '';
  // 快速检测：包含 zh 且不是纯 en 偏好
  if (!acceptLang.includes('zh')) return false;

  // 解析语言权重
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
 * 将 index.html 中的英文 meta 标签替换为中文版本。
 * 仅替换 SEO 关键标签，保留其余内容不变。
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
    // og:locale — 切换主语言
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

function secureCompare(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}
