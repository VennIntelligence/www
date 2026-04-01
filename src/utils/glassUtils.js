/* ================================================================
   glassUtils — 公共磨砂玻璃 fallback className 构建工具
   ================================================================

   所有需要磨砂/毛玻璃 fallback 效果的组件（NavBar、Footer、面板、按钮等）
   均应通过此工具生成 fallback class，不应各自手写逻辑。

   三档 tier：
   - 'liquid'  → LiquidGlass component（调用方自行渲染，此工具无关）
   - 'frost'   → CSS backdrop-filter 磨砂（iOS/桌面）
   - 'solid'   → 增强型纯色半透明（安卓/不支持 backdrop 的环境）

   安卓 solid 策略：
   用高不透明度的深色背景 + 明显 box-shadow + 细微渐变营造质感，
   视觉上接近磨砂但完全不依赖 backdrop-filter。
   ================================================================ */

import { getGlassCompatibility } from './glassCompatibility';

/**
 * 为任意组件生成标准化的 glass fallback className 字符串。
 *
 * @param {string}   prefix     - 组件专属前缀，如 'navbar__glass-fallback', 'footer-glass'
 * @param {object}   [opts]     - 可选修饰符，详见下方字段说明
 * @param {boolean}  [opts.scrolled]    - 是否处于滚动状态（加强磨砂/阴影）
 * @param {boolean}  [opts.open]        - 是否处于展开/激活状态（面板/抽屉）
 * @param {string[]} [opts.extra]       - 额外的 class 字符串（需调用方自行加）
 * @param {import('./glassCompatibility').GlassCompatibility} [opts.compat] - 外部传入检测结果，避免重复 UA 计算
 * @returns {{ className: string, tier: string, compat: object }}
 */
export function buildGlassFallbackClass(prefix, opts = {}) {
  const { scrolled = false, open = false, extra = [], compat: compatOverride } = opts;
  const compat = compatOverride ?? getGlassCompatibility();
  const { tier, backdropReliable } = compat;

  const classes = [
    prefix,                                                         // 基类
    scrolled ? `${prefix}--scrolled` : '',                         // 滚动强化
    open     ? `${prefix}--open`     : '',                         // 展开状态
    `${prefix}--${tier}`,                                          // tier 类：--liquid / --frost / --solid
    !backdropReliable ? `${prefix}--no-backdrop` : '',             // 无 backdrop-filter 时的额外标记
    ...extra,
  ];

  return {
    className: classes.filter(Boolean).join(' '),
    tier,
    compat,
  };
}

/**
 * 轻量版：仅返回 className 字符串（大多数使用场景）。
 *
 * @param {string}  prefix
 * @param {object}  [opts]
 * @returns {string}
 */
export function glassClass(prefix, opts = {}) {
  return buildGlassFallbackClass(prefix, opts).className;
}
