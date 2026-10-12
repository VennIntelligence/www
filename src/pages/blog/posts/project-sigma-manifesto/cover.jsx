/**
 * project-sigma-manifesto 封面 —— 白皮书扉页，静态极简
 *
 * 浅色纸面 + 坐标纸网格 + 一个大 Σ + 两行等宽标注。无动画，不挂 useCoverLoop。
 * 颜色走 blog-paper-theme.css 的纸面 token（带回退值），和列表页底色一致。
 * viewBox 800×500，slice 裁切适配任意卡片比例。
 */

import CoverGrid from '../../components/CoverGrid';

/* Σ 字号（默认 300）与字重（默认 500）。调大更压迫，调小更空灵 */
const SIGMA_SIZE = 300;
const SIGMA_WEIGHT = 500;

const INK = 'var(--paper-ink, #16181d)';
const INK_3 = 'var(--paper-ink-3, #878a92)';
const RULE = 'var(--paper-rule, #dddbd4)';

export default function SigmaCover() {
  return (
    <svg className="blog-cover-art" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="800" height="500" fill="var(--paper-bg, #f6f5f1)" />
      <CoverGrid stroke="var(--paper-grid, rgba(22, 24, 29, 0.06))" />

      {/* 扉页标注 */}
      <text x="60" y="72" fill={INK_3} fontSize="12" letterSpacing="4">
        PROJECT Σ · WHITEPAPER
      </text>
      <text x="740" y="72" fill={INK_3} fontSize="12" letterSpacing="4" textAnchor="end">
        V0.1 · PUBLIC DRAFT
      </text>

      {/* 主体：一个 Σ */}
      <text
        x="400"
        y="335"
        fill={INK}
        fontSize={SIGMA_SIZE}
        fontWeight={SIGMA_WEIGHT}
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        Σ
      </text>

      {/* 底部细线 + 协议管线 */}
      <line x1="60" y1="428" x2="740" y2="428" stroke={RULE} strokeWidth="1" />
      <text x="400" y="462" fill={INK_3} fontSize="12" textAnchor="middle" letterSpacing="3">
        FLOW · EVALUATE · SETTLE · EVOLVE
      </text>
    </svg>
  );
}
