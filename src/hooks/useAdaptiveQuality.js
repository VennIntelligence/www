/**
 * useAdaptiveQuality — 通用 GPU 自适应画质 hook（命令式 API）
 *
 * 用途：在 Three.js 渲染循环中动态调节渲染分辨率，保证帧率。
 * 不使用 React state（避免触发重渲染），全部通过 ref 和回调管理。
 *
 * 用法（在 useEffect 内部）：
 *   const quality = useAdaptiveQuality({
 *     // 初始画质等级。默认 'low'。可选 'high' | 'medium' | 'low'。
 *     bootTier: 'low',
 *     // 初始渲染缩放比。默认 0.38。越小首帧越快但画质越低。
 *     bootScale: 0.38,
 *     // 升级到目标画质前的最短等待时间(ms)。默认 800。
 *     bootDelayMs: 800,
 *     // 当画质等级或缩放比变化时的回调
 *     onQualityChange: ({ tier, scale }) => {
 *       material.fragmentShader = buildShader(tier);
 *       material.needsUpdate = true;
 *       renderer.setPixelRatio(dpr * scale);
 *       renderer.setSize(w, h);
 *     },
 *   });
 *
 *   // 在 useEffect 内部：
 *   quality.current.start();           // 启动升级调度
 *   // 每帧末尾调用：
 *   quality.current.adaptFrame();      // 自动监测帧率并调节
 *   // 清理：
 *   quality.current.dispose();         // 取消待定的升级调度
 *
 * 返回值:
 *   React ref，其 .current 包含 { start, adaptFrame, dispose, tier, scale }
 *
 * 自适应规则（采样窗口 30 帧）：
 *   - 平均帧时间 > 40ms → 降低 scale（最低 0.3）
 *   - 平均帧时间 < 20ms → 提升 scale（最高 targetScale）
 */

import { useRef } from 'react';
import { detectGPUTier, getTierScale } from '../utils/unifiedShaderBuilder';

// ── 自适应采样配置 ──

// 采样窗口大小。默认 30 帧。越大越稳定但响应越慢。
const SAMPLE_SIZE = 30;

// 帧时间高于此值(ms)时降低画质。默认 40。
const DOWNGRADE_THRESHOLD_MS = 40;

// 帧时间低于此值(ms)时提升画质。默认 20。
const UPGRADE_THRESHOLD_MS = 20;

// 每次降级的 scale 步进。默认 0.05。
const DOWNGRADE_STEP = 0.05;

// 每次升级的 scale 步进。默认 0.02。
const UPGRADE_STEP = 0.02;

// scale 下限。默认 0.3。再低画质太差。
const MIN_SCALE = 0.3;

/**
 * @param {Object} options
 * @param {string} [options.bootTier='low'] — 初始画质等级
 * @param {number} [options.bootScale=0.38] — 初始缩放比
 * @param {number} [options.bootDelayMs=800] — 升级前最短等待(ms)
 * @param {Function} options.onQualityChange — ({ tier, scale }) => void
 * @returns {React.RefObject<{ start, adaptFrame, dispose, tier, scale }>}
 */
export default function useAdaptiveQuality(options = {}) {
  const {
    bootTier = 'low',
    bootScale = 0.38,
    bootDelayMs = 800,
    onQualityChange,
  } = options;

  const ref = useRef(null);

  // 惰性初始化（避免每次 render 重建）
  if (ref.current === null) {
    const targetTier = detectGPUTier();
    const targetScale = getTierScale(targetTier);

    // 升级后跳过的采样窗口数。默认 2（即 60 帧）。
    // 升级时 shader 重编译和分辨率调整会导致几帧帧时间异常，如果立刻开始
    // 自适应调节会连续触发降级/升级，产生多次闪烁。
    const STABILIZE_WINDOWS = 2;

    const state = {
      tier: bootTier,
      scale: Math.min(bootScale, targetScale),
      targetTier,
      targetScale,
      upgraded: targetTier === bootTier && Math.min(bootScale, targetScale) === targetScale,
      frameTimes: new Float32Array(SAMPLE_SIZE),
      fIdx: 0,
      lastFrameTime: performance.now(),
      timerId: null,
      // 升级后的稳定期计数器：> 0 时跳过自适应调节
      stabilizeCount: 0,
      // 回调支持延迟绑定（组件在 useEffect 内设置）
      onQualityChange: onQualityChange || null,
    };

    /**
     * 升级到目标画质（首帧之后延迟触发）
     */
    function upgrade() {
      if (state.upgraded) return;
      state.upgraded = true;
      state.tier = state.targetTier;
      state.scale = state.targetScale;
      state.lastFrameTime = performance.now();
      state.fIdx = 0;
      // 升级后进入稳定期，跳过几个采样窗口不做自适应调节
      state.stabilizeCount = STABILIZE_WINDOWS;
      state.onQualityChange?.({ tier: state.tier, scale: state.scale });
    }

    /**
     * 启动升级调度（在 useEffect 内部调用）
     */
    function start() {
      if (state.upgraded) return;
      if ('requestIdleCallback' in window) {
        state.timerId = window.requestIdleCallback(upgrade, { timeout: bootDelayMs });
      } else {
        state.timerId = window.setTimeout(upgrade, bootDelayMs);
      }
    }

    /**
     * 每帧末尾调用，监测帧率并动态调节 scale
     */
    function adaptFrame() {
      if (!state.upgraded) return;
      const now = performance.now();
      state.frameTimes[state.fIdx] = now - state.lastFrameTime;
      state.lastFrameTime = now;
      state.fIdx = (state.fIdx + 1) % SAMPLE_SIZE;
      if (state.fIdx !== 0) return;

      // 稳定期内只收集帧时间但不做调节，等 GPU 管线完全稳定
      if (state.stabilizeCount > 0) {
        state.stabilizeCount--;
        return;
      }

      let sum = 0;
      for (let i = 0; i < SAMPLE_SIZE; i++) sum += state.frameTimes[i];
      const avg = sum / SAMPLE_SIZE;

      let changed = false;
      if (avg > DOWNGRADE_THRESHOLD_MS && state.scale > MIN_SCALE) {
        state.scale = Math.max(state.scale - DOWNGRADE_STEP, MIN_SCALE);
        changed = true;
      } else if (avg < UPGRADE_THRESHOLD_MS && state.scale < state.targetScale) {
        state.scale = Math.min(state.scale + UPGRADE_STEP, state.targetScale);
        changed = true;
      }

      if (changed) {
        state.onQualityChange?.({ tier: state.tier, scale: state.scale });
      }
    }

    /**
     * 取消待定的升级调度
     */
    function dispose() {
      if (state.timerId != null) {
        if ('cancelIdleCallback' in window) window.cancelIdleCallback(state.timerId);
        else clearTimeout(state.timerId);
        state.timerId = null;
      }
    }

    ref.current = {
      start,
      adaptFrame,
      dispose,
      get tier() { return state.tier; },
      get scale() { return state.scale; },
      set onQualityChange(fn) { state.onQualityChange = fn; },
    };
  }

  return ref;
}
