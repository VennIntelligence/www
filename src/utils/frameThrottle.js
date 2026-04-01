/**
 * frameThrottle — 全局帧率限流器
 *
 * 用途：限制 requestAnimationFrame 驱动的动画循环最高帧率，
 *       避免高刷显示器（120/144/240Hz）上不必要的 GPU/CPU 消耗。
 *
 * 用法：
 *   import { createFrameThrottle, MAX_FPS } from '../utils/frameThrottle';
 *
 *   const throttle = createFrameThrottle();   // 使用下方 MAX_FPS
 *
 *   function tick() {
 *     animId = requestAnimationFrame(tick);
 *     if (throttle.skip()) return;   // 距上次渲染不够间隔，跳过
 *     // ... 执行实际渲染工作 ...
 *   }
 *
 * 调参：
 *   直接修改下方 MAX_FPS 即可全局生效。
 *   0 = 不限制（跟随显示器原生刷新率）
 */

/* ════════════════════════════════════════════════════════════════
 *  ★ 全局最大帧率 — 改这里即可全站生效
 *
 *  推荐值：60 （匹配主流 60Hz 显示器，节省 ~57% 计算量）
 *  其他选项：0 = 不限制 | 30 = 省电模式 | 120 = 高刷屏
 * ════════════════════════════════════════════════════════════════ */
export const MAX_FPS = 20;

/**
 * 创建一个帧率限流实例。
 *
 * @param {number} [maxFps=MAX_FPS] — 最大帧率上限，0 = 不限制
 * @returns {{ skip: () => boolean, reset: () => void }}
 */
export function createFrameThrottle(maxFps = MAX_FPS) {
  if (maxFps <= 0) {
    // 不限制模式：skip() 永远返回 false
    return { skip: () => false, reset: () => {} };
  }
  const minInterval = 1000 / maxFps;
  let lastRenderTime = 0;

  /**
   * 在 RAF 回调开头调用。
   * @returns {boolean} true = 跳过本帧, false = 正常渲染
   */
  function skip() {
    const now = performance.now();
    const elapsed = now - lastRenderTime;
    if (elapsed < minInterval) return true;
    // 使用上次渲染时间 + 间隔来补偿累计误差，
    // 而非直接设为 now（避免帧率缓慢漂移）
    lastRenderTime = now - (elapsed % minInterval);
    return false;
  }

  /**
   * 重置内部时钟。在冻结/解冻时调用，避免解冻后立刻连续渲染多帧。
   */
  function reset() {
    lastRenderTime = performance.now();
  }

  return { skip, reset };
}
