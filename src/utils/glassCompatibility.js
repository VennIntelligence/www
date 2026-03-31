/* ================================================================
   glassCompatibility — 跨平台磨砂玻璃/液态玻璃兼容性检测
   ================================================================

   三级降级策略：
   tier = 'liquid'  → 完整 SVG displacement liquid glass（仅桌面 + 非安卓）
   tier = 'frost'   → CSS backdrop-filter 磨砂（iOS / 桌面 / backdrop 真实可用）
   tier = 'solid'   → 纯色半透明底 + box-shadow 模拟深度（安卓 / 不支持 backdrop）

   安卓特殊处理：
   - 大多数安卓浏览器声称支持 backdrop-filter 但渲染质量极差（模糊不均匀、
     透明度异常、甚至完全透明），因此安卓统一降级到 'solid' 层。
   - 'solid' 层用较高不透明度的纯色背景 + box-shadow 模拟玻璃质感，
     视觉上接近磨砂但不依赖 backdrop-filter。
   ================================================================ */

const GLASS_MOBILE_BREAKPOINT = 768;

function detectPlatform(win) {
  const ua = win.navigator?.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/i.test(ua)
    || (win.navigator?.platform === 'MacIntel' && win.navigator?.maxTouchPoints > 1);

  if (isAndroid) return 'android';
  if (isIOS) return 'ios';
  return 'other';
}

function supportsBackdropFilter(win) {
  const supports = win.CSS?.supports;
  if (typeof supports !== 'function') return false;

  return supports('backdrop-filter: blur(1px)') || supports('-webkit-backdrop-filter: blur(1px)');
}

/**
 * 检测 backdrop-filter 是否真正可用（而非仅声称支持）。
 * 安卓 Chrome 等浏览器声明支持但渲染结果不可靠，因此
 * 对安卓平台即使通过特性检测也标记为不可靠。
 */
function isBackdropReliable(platform, win) {
  if (platform === 'android') return false;
  return supportsBackdropFilter(win);
}

function supportsUrlBackdropFilter(win) {
  const testNode = win.document?.createElement?.('div');
  if (!testNode) return false;

  testNode.style.backdropFilter = 'url(#liquid-glass-compat) blur(1px)';
  testNode.style.webkitBackdropFilter = 'url(#liquid-glass-compat) blur(1px)';

  const standard = typeof testNode.style.backdropFilter === 'string'
    && testNode.style.backdropFilter.includes('url(');
  const webkit = typeof testNode.style.webkitBackdropFilter === 'string'
    && testNode.style.webkitBackdropFilter.includes('url(');

  return standard || webkit;
}

export function getGlassCompatibility(win = window) {
  const platform = detectPlatform(win);
  const isMobileViewport = win.innerWidth <= GLASS_MOBILE_BREAKPOINT;
  const backdropSupported = supportsBackdropFilter(win);
  const backdropReliable = isBackdropReliable(platform, win);
  const liquidFilterSupported = backdropReliable && supportsUrlBackdropFilter(win);

  // liquid 仅用于桌面 + 非安卓 + 支持 SVG filter
  const liquidSupported = liquidFilterSupported && platform !== 'android' && !isMobileViewport;

  // tier 判定：安卓一律 solid；iOS/桌面按 backdrop 可靠性分层
  const tier = liquidSupported
    ? 'liquid'
    : (backdropReliable ? 'frost' : 'solid');

  return {
    tier,
    platform,
    isMobileViewport,
    backdropSupported,
    backdropReliable,
    liquidSupported,
  };
}

export function syncGlassCompatibility(root = document.documentElement, win = window) {
  const profile = getGlassCompatibility(win);

  if (!root) return profile;

  root.dataset.glassTier = profile.tier;
  root.dataset.glassPlatform = profile.platform;
  root.dataset.glassBackdrop = profile.backdropReliable ? '1' : '0';
  root.dataset.glassLiquid = profile.liquidSupported ? '1' : '0';
  root.dataset.glassMobile = profile.isMobileViewport ? '1' : '0';

  return profile;
}

export { GLASS_MOBILE_BREAKPOINT };
