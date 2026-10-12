import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import { BLOG_POSTS } from '../pages/blog/registry';

/**
 * useDocumentMeta — 根据当前语言和路由动态更新 SEO meta 标签
 *
 * 更新内容：
 *   - document.title
 *   - <meta name="description">
 *   - <meta property="og:title">
 *   - <meta property="og:description">
 *   - <meta name="twitter:title">
 *   - <meta name="twitter:description">
 *
 * 在语言切换或路由变化时自动执行。
 */

// ── 路由级 meta 配置 ──
const ROUTE_META = {
  '/': {
    en: {
      title: 'Venn Intelligence Foundation — AI Research: Autonomous Driving, Collective Intelligence, Trading',
      description: 'Venn Intelligence Foundation funds and runs frontier AI research: closed-loop autonomous driving (sponsor and competing team in the NVIDIA AlpaSim E2E Closed-Loop Challenge 2026), a collective intelligence protocol, and an AI-native trading system.',
    },
    zh: {
      title: '文氏智能基金会 — AI 研究：自动驾驶、集体智能、智能交易',
      description: '文氏智能基金会资助并亲自开展前沿 AI 研究：闭环自动驾驶（赞助并参与 2026 年 NVIDIA AlpaSim 端到端闭环挑战赛）、集体智能协议、AI 原生交易系统。',
    },
  },
  '/drive': {
    en: {
      title: 'Autonomous Driving — NVIDIA AlpaSim E2E Closed-Loop Challenge 2026 — Venn Intelligence Foundation',
      description: 'Venn Intelligence Foundation sponsors and competes in the NVIDIA AlpaSim End-to-End Closed-Loop Challenge 2026. Closed-loop simulation, collision forensics, pre-registered experiments and rollout clips. Results at NeurIPS 2026.',
    },
    zh: {
      title: '自动驾驶 — NVIDIA AlpaSim 端到端闭环挑战赛 2026 — 文氏智能基金会',
      description: '文氏智能基金会赞助并参与 2026 年 NVIDIA AlpaSim 端到端闭环挑战赛：闭环仿真、碰撞取证、预登记实验与闭环回放片段。结果将于 NeurIPS 2026 公布。',
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
 * 尝试匹配博客文章路由 /blog/:slug，返回文章特定的 meta。
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
 * 设置或更新一个 <meta> 标签的 content 属性。
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
    // 优先级：博客文章 > 静态路由 > 不更新
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
