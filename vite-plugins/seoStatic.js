// Vite plugin: SEO static file auto-generation
// Scans blog post meta files and i18n config at build time,
// emits sitemap.xml and llms-full.txt into the output directory.
// Also serves them dynamically during dev.
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const SITE_URL = 'https://vennai.org';

/**
 * 从 meta.js 文件文本中提取纯数据对象。
 * meta.js 格式为 `const meta = { ... }; export default meta;`
 * 无 import/JSX 依赖，可安全求值。
 */
function parseMeta(filePath) {
  let raw = readFileSync(filePath, 'utf-8');
  // 移除注释行
  raw = raw.replace(/\/\/.*$/gm, '');
  raw = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  // 移除 ESM 语法
  raw = raw.replace(/export\s+default\s+\w+;?/g, '');
  raw = raw.replace(/const\s+meta\s*=\s*/, 'return ');
  try {
    return new Function(raw)();
  } catch {
    return null;
  }
}

/**
 * 扫描 src/pages/blog/posts/ 目录，返回所有文章元数据。
 */
function collectBlogMetas(root) {
  const postsDir = resolve(root, 'src/pages/blog/posts');
  let dirs;
  try {
    dirs = readdirSync(postsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch {
    return [];
  }

  return dirs
    .map(slug => {
      const metaPath = join(postsDir, slug, 'meta.js');
      const meta = parseMeta(metaPath);
      return meta ? { slug, ...meta } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/**
 * 从 i18n.js 提取全站文案。
 * i18n.js 只 export 一个纯对象（COPY），无 JSX 依赖。
 */
function parseI18n(root) {
  const i18nPath = resolve(root, 'src/config/i18n.js');
  let raw = readFileSync(i18nPath, 'utf-8');
  // 将 `export const COPY = {` 转为可求值形式
  raw = raw.replace(/export\s+const\s+COPY\s*=\s*/, 'return ');
  // 移除行尾注释（保留字符串内的）
  raw = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  try {
    return new Function(raw)();
  } catch {
    return null;
  }
}

/**
 * 生成 sitemap.xml 内容。
 * 包含首页、博客列表页、所有博客文章页。
 */
function buildSitemap(metas) {
  const today = new Date().toISOString().split('T')[0];
  const urls = [
    { loc: SITE_URL + '/', lastmod: today, priority: '1.0', changefreq: 'weekly' },
    { loc: SITE_URL + '/drive', lastmod: today, priority: '0.8', changefreq: 'weekly' },
    { loc: SITE_URL + '/blog', lastmod: metas[0]?.date || today, priority: '0.8', changefreq: 'weekly' },
    ...metas.map(m => ({
      loc: `${SITE_URL}/blog/${m.slug}`,
      lastmod: m.date || today,
      priority: '0.6',
      changefreq: 'monthly',
    })),
  ];

  // 每个 URL 都声明 en/zh/x-default hreflang 替代链接
  const entries = urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${u.loc}" />
    <xhtml:link rel="alternate" hreflang="zh" href="${u.loc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${u.loc}" />
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>`;
}

/* 需要导出的项目区块：i18n key + 双语标题 */
const PROJECT_EXPORTS = [
  { key: 'drive', en: '## Autonomous Driving — NVIDIA AlpaSim E2E Closed-Loop Challenge 2026', zh: '## 自动驾驶 — AlpaSim 端到端闭环挑战赛 2026（中文）' },
  { key: 'sigma', en: '## Project Σ — Collective Intelligence Protocol', zh: '## Project Σ — 集体智慧协议（中文）' },
  { key: 'omega', en: '## Project Ω — AI-Native Trading Infrastructure', zh: '## Project Ω — AI 原生交易基础设施（中文）' },
];

/**
 * 把一个项目区块（标题行 / 副标题 / 宣言 / 支柱）写成 Markdown。
 * headingLines 可能是数组或 { lg, sm } 断点对象；joiner 为语言的行连接符（英文空格、中文空串）。
 */
function pushProject(lines, proj, title, joiner) {
  if (!proj) return;
  lines.push(title);
  lines.push('');
  const heading = proj.headingLines;
  const headingText = (Array.isArray(heading) ? heading : (heading?.lg || [])).join(joiner);
  if (headingText) lines.push(headingText);
  lines.push('');
  if (proj.subtitle) {
    lines.push(proj.subtitle);
    lines.push('');
  }
  if (proj.manifesto) lines.push(proj.manifesto);
  if (proj.manifestoHighlight) {
    lines.push('');
    lines.push(`**${proj.manifestoHighlight}**`);
  }
  lines.push('');
  if (proj.pillars) {
    lines.push(`### ${proj.pillarTitle || 'Pillars'}`);
    lines.push('');
    for (const p of proj.pillars) lines.push(`- **${p.title}**: ${p.desc}`);
    lines.push('');
  }
}

/**
 * 生成 llms-full.txt —— AI Agent 可直接消费的全站纯文本内容导出。
 * 包含组织描述、项目详情、博客文章元数据。
 */
function buildLlmsFullTxt(metas, i18n) {
  const lines = [];
  lines.push('# Venn Intelligence Foundation — Full Content Export');
  lines.push('');
  lines.push('> This file contains the complete textual content of vennai.org,');
  lines.push('> exported in plain Markdown for AI agent consumption.');
  lines.push('> Bilingual: English + 中文. Auto-generated at build time.');
  lines.push('');

  // ── 组织描述 ──
  lines.push('## Organization');
  lines.push('');
  lines.push('Venn Intelligence Foundation is a research foundation that funds and runs frontier AI research:');
  lines.push('closed-loop autonomous driving (funding the team competing in the NVIDIA AlpaSim E2E Closed-Loop');
  lines.push('Challenge 2026), a collective intelligence protocol, and an AI-native trading system.');
  lines.push('Founded by Taitan Pascal. Website: https://vennai.org');
  lines.push('Email: contact@vennai.org | Twitter: @venn_foundation | GitHub: VennIntelligence');
  lines.push('');
  lines.push('文氏智能基金会资助并亲自开展前沿 AI 研究：闭环自动驾驶（资助参赛团队出战 2026 年 NVIDIA AlpaSim 端到端闭环挑战赛）、');
  lines.push('集体智能协议、AI 原生交易系统。由 Taitan Pascal 创立。网站：https://vennai.org');
  lines.push('');

  // ── 从 i18n 提取项目内容（英文 + 中文）：三个项目区块共用同一套字段 ──
  if (i18n) {
    for (const { key, en, zh } of PROJECT_EXPORTS) {
      pushProject(lines, i18n[key]?.en, en, ' ');
      pushProject(lines, i18n[key]?.zh, zh, '');
    }

    // 自动驾驶项目页专属内容（赛事信息 + 回放片段说明）
    for (const lang of ['en', 'zh']) {
      const page = i18n.drive?.[lang]?.page;
      if (!page) continue;
      lines.push(`### ${page.title}`);
      lines.push('');
      lines.push(page.lead);
      lines.push('');
      for (const fact of (page.facts || [])) lines.push(`- ${fact.label}: ${fact.value}`);
      lines.push('');
      if (page.clips) {
        lines.push(`#### ${page.wallTitle}`);
        lines.push('');
        for (const [id, caption] of Object.entries(page.clips)) lines.push(`- ${id}: ${caption}`);
        lines.push('');
      }
      if (page.disclosure) lines.push(`_${page.disclosure}_`);
      lines.push('');
    }

    // Consulting — English
    const consult = i18n.consultants?.en;
    if (consult) {
      lines.push('## Consulting');
      lines.push('');
      lines.push(`**${consult.name}** — ${consult.bio1} ${consult.bio2}`);
      lines.push('');
      for (const tier of (consult.tiers || [])) {
        lines.push(`- **${tier.name}**: ${tier.price} ${tier.duration} — ${tier.summary}`);
      }
      lines.push('');
    }

    // Consulting — 中文
    const consultZh = i18n.consultants?.zh;
    if (consultZh) {
      lines.push('## 咨询服务（中文）');
      lines.push('');
      lines.push(`**${consultZh.name}** — ${consultZh.bio1} ${consultZh.bio2}`);
      lines.push('');
      for (const tier of (consultZh.tiers || [])) {
        lines.push(`- **${tier.name}**: ${tier.price} ${tier.duration} — ${tier.summary}`);
      }
      lines.push('');
    }
  }

  // ── 博客文章（双语） ──
  if (metas.length > 0) {
    lines.push('## Blog Posts / 博客文章');
    lines.push('');
    for (const m of metas) {
      const en = m.en || {};
      const zh = m.zh || {};
      lines.push(`### ${en.title || m.slug}`);
      if (zh.title) lines.push(`### ${zh.title}`);
      lines.push(`- URL: ${SITE_URL}/blog/${m.slug}`);
      lines.push(`- Date: ${m.date}`);
      lines.push(`- Tags: ${(m.tags || []).join(', ')}`);
      if (en.excerpt) lines.push(`- Summary (EN): ${en.excerpt}`);
      if (zh.excerpt) lines.push(`- 摘要 (ZH): ${zh.excerpt}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Vite 插件入口。
 * 在 generateBundle 时产出 sitemap.xml 和 llms-full.txt 到 dist/。
 * 在 dev server 中通过 middleware 动态响应这些路径。
 */
export default function seoStaticPlugin() {
  let root = process.cwd();

  return {
    name: 'vennai-seo-static',
    configResolved(config) {
      root = config.root;
    },

    // ── dev server: 动态响应 /sitemap.xml 和 /llms-full.txt ──
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/sitemap.xml') {
          const metas = collectBlogMetas(root);
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.end(buildSitemap(metas));
          return;
        }
        if (req.url === '/llms-full.txt') {
          const metas = collectBlogMetas(root);
          const i18n = parseI18n(root);
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(buildLlmsFullTxt(metas, i18n));
          return;
        }
        next();
      });
    },

    // ── production build: 产出到 dist/ ──
    generateBundle() {
      const metas = collectBlogMetas(root);
      const i18n = parseI18n(root);

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: buildSitemap(metas),
      });

      this.emitFile({
        type: 'asset',
        fileName: 'llms-full.txt',
        source: buildLlmsFullTxt(metas, i18n),
      });
    },
  };
}
