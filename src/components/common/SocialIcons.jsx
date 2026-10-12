/**
 * SocialIcons — 全站统一社交平台 SVG 图标
 *
 * 所有图标路径与 Hero Section 保持一致。
 * 使用 fill/stroke 继承 currentColor，方便外部通过 CSS 控制颜色。
 *
 * 提供以下图标：
 *   IconX       — X (Twitter)   24×24 filled
 *   IconEmail   — Email envelope 24×24 stroked
 *   IconProduct — 产品图标（菱形）24×24 stroked
 *   IconBlog    — 博客图标（书本）24×24 stroked
 *   IconArrowRight — CTA 按钮内的播放式箭头 24×24 filled（Σ / Ω / Drive / Consultants 共用）
 *   IconLoop    — 闭环箭头 24×24 stroked（Drive 徽章）
 */

const DEFAULTS = { width: 24, height: 24, className: '' };

export function IconArrowRight({ width = DEFAULTS.width, height = DEFAULTS.height, className = DEFAULTS.className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={width} height={height} className={className} aria-hidden="true">
      <polygon points="8,5 19,12 8,19" />
    </svg>
  );
}

export function IconLoop({ width = DEFAULTS.width, height = DEFAULTS.height, className = DEFAULTS.className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={width} height={height} className={className} aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <polyline points="20 4 20 9 15 9" />
    </svg>
  );
}

export function IconX({ width = DEFAULTS.width, height = DEFAULTS.height, className = DEFAULTS.className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={width} height={height} className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function IconEmail({ width = DEFAULTS.width, height = DEFAULTS.height, className = DEFAULTS.className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={width} height={height} className={className} aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 7L2 7" />
    </svg>
  );
}

export function IconProduct({ width = DEFAULTS.width, height = DEFAULTS.height, className = DEFAULTS.className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={width} height={height} className={className} aria-hidden="true">
      <path d="M12 2l8 4.5v9L12 22l-8-6.5v-9L12 2z" />
      <path d="M12 22V11" />
      <path d="M20 6.5l-8 4.5-8-4.5" />
    </svg>
  );
}

export function IconBlog({ width = DEFAULTS.width, height = DEFAULTS.height, className = DEFAULTS.className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={width} height={height} className={className} aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}
