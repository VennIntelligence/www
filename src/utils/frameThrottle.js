/**
 * frameThrottle — 全局帧率限流器
 *
 * 用途：限制 requestAnimationFrame 驱动的动画循环最高帧率，
 *       避免高刷显示器（120/144/240Hz）上不必要的 GPU/CPU 消耗。
 *
 * 用法：
 *   import { createFrameThrottle } from '../utils/frameThrottle';
 *
 *   const throttle = createFrameThrottle();   // 默认 60fps
 *
 *   function tick() {
 *     animId = requestAnimationFrame(tick);
 *     if (throttle.skip()) return;   // 距上次渲染不够 16.67ms，跳过
 *     // ... 执行实际渲染工作 ...
 *   }
 *
 * 设计决策：
 *   - 不修改 RAF 注册方式，仅在回调内跳过 — 最小侵入性
 *   - 各管线各自创建实例（独立时间戳） — 互不干扰
 *   - 如果客户端本身只有 60Hz，skip() 永远返回 false — 零额外开销
 *   - 使用 performance.now() 高精度时钟
 */

// 全局默认最大帧率。60fps = 16.667ms 间隔。
const DEFAULT_MAX_FPS = 60;

/**
 * 创建一个帧率限流实例。
 *
 * @param {number} [maxFps=60] — 最大帧率上限
 * @returns {{ skip: () => boolean, reset: () => void }}
 */
export function createFrameThrottle(maxFps = DEFAULT_MAX_FPS) {
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
