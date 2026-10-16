import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import { BLOG_POSTS } from '../pages/blog/registry';

/**
 * useDocumentMeta — update SEO meta tags for the current language and route
 *
 * Updates:
 *   - document.title
 *   - <meta name="description">
 *   - <meta property="og:title">
 *   - <meta property="og:description">
 *   - <meta name="twitter:title">
 *   - <meta name="twitter:description">
 *
 * Runs automatically on language or route change.
 */

// ── Per-route meta ──
const ROUTE_META = {
  '/': {
    en: {
      title: 'Venn Intelligence Foundation — AI Research: Autonomous Driving, Collective Intelligence, Trading',
      description: 'Venn Intelligence Foundation funds and runs frontier AI research: closed-loop autonomous driving (funding the team competing in the NVIDIA AlpaSim E2E Closed-Loop Challenge 2026), a collective intelligence protocol, and an AI-native trading system.',
    },
    zh: {
      title: '文氏智能基金会 — AI 研究：自动驾驶、集体智能、智能交易',
      description: '文氏智能基金会资助并亲自开展前沿 AI 研究：闭环自动驾驶（资助参赛团队出战 2026 年 NVIDIA AlpaSim 端到端闭环挑战赛）、集体智能协议、AI 原生交易系统。',
    },
  },
  '/drive': {
    en: {
      title: 'Autonomous Driving — NVIDIA AlpaSim E2E Closed-Loop Challenge 2026 — Venn Intelligence Foundation',
      description: 'Venn Intelligence Foundation funds the team competing in the NVIDIA AlpaSim End-to-End Closed-Loop Challenge 2026. Closed-loop simulation, collision forensics, pre-registered experiments and rollout clips. Results at NeurIPS 2026.',
    },
    zh: {
      title: '自动驾驶 — NVIDIA AlpaSim 端到端闭环挑战赛 2026 — 文氏智能基金会',
      description: '文氏智能基金会资助参赛团队出战 2026 年 NVIDIA AlpaSim 端到端闭环挑战赛：闭环仿真、碰撞取证、预登记实验与闭环回放片段。结果将于 NeurIPS 2026 公布。',
    },
  },
  '/apply': {
    en: {
      title: 'Apply for a Grant — Venn Intelligence Foundation',
      description: 'Apply for a $1,000–$10,000 grant from Venn Intelligence Foundation. For competitive independent researchers and early-stage startups building infrastructure or frontier intelligence. No application fees.',
    },
    zh: {
      title: '申请资助 — 文氏智能基金会',
      description: '申请文氏智能基金会 1,000 至 10,000 美元的资助，面向从事基础设施或前沿智能的独立研究者与早期初创公司。不收取任何申请费。',
    },
  },
  '/blog': {
    en: {
      title: 'Blog — Venn Intelligence Foundation',
      description: 'Thoughts and announcements from Venn Intelligence Foundation on AI infrastructure, collective intelligence protocols, and intelligent trading systems.',
    },
    zh: {
      title: '博客 — 文氏智能基金会',
      description: '文氏智能基金会关于 AI 基础设施、集体智慧协议和智能交易系统的思考与公告。',
    },
  },
};

/**
 * Match the blog article route /blog/:slug and return that post's meta.
 */
function getBlogArticleMeta(pathname, lang) {
  const match = pathname.match(/^\/blog\/(.+)$/);
  if (!match) return null;

  const slug = match[1];
  const post = BLOG_POSTS.find(p => p.slug === slug);
  if (!post) return null;

  const localMeta = post.meta[lang];
  if (!localMeta) return null;

  const suffix = lang === 'zh' ? ' — 文氏智能基金会' : ' — Venn Intelligence Foundation';
  return {
    title: localMeta.title + suffix,
    description: localMeta.excerpt,
  };
}

/**
 * Set the content attribute of an existing <meta> tag.
 */
function setMetaContent(attr, key, content) {
  const selector = `meta[${attr}="${key}"]`;
  const el = document.querySelector(selector);
  if (el) {
    el.setAttribute('content', content);
  }
}

export function useDocumentMeta() {
  const { lang } = useLanguage();
  const { pathname } = useLocation();

  useEffect(() => {
    // Priority: blog article > static route > leave unchanged
    const meta = getBlogArticleMeta(pathname, lang)
      || ROUTE_META[pathname]?.[lang];

    if (!meta) return;

    // document.title
    document.title = meta.title;

    // <meta name="description">
    setMetaContent('name', 'description', meta.description);

    // Open Graph
    setMetaContent('property', 'og:title', meta.title);
    setMetaContent('property', 'og:description', meta.description);

    // Twitter Card
    setMetaContent('name', 'twitter:title', meta.title);
    setMetaContent('name', 'twitter:description', meta.description);
  }, [lang, pathname]);
}
