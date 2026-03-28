/**
 * gpuDebugBus.js — GPU 调参面板中央状态管理器
 *
 * 职责：
 *   1. 存储画质档位参数覆盖（low / medium / high 各一组）
 *   2. 采集性能指标（FPS、帧时间环形缓冲区）
 *   3. 通知渲染器重建 shader（自定义事件 gpu-debug-rebuild）
 *   4. 导出当前配置为可粘贴代码
 *
 * 渲染器集成方式：
 *   检测 window.__GPU_DEBUG__ 是否存在。存在时：
 *     - RAF 尾部调用 reportFrame() 上报帧时间
 *     - 调用 reportMetrics(tier, scale) 上报当前状态
 *     - 监听 window 'gpu-debug-rebuild' 事件重建 shader
 *     - forcedTier 非 null 时覆盖自动档位
 */

// ── 三档默认 shader 质量参数 ──
export const DEFAULT_TIER_PARAMS = {
  high: {
    // 光线行进最大步数。越大越精确但越慢。默认 40。范围 [8, 80]。
    maxSteps: 40,
    // 表面距离判定阈值。越小细节越好但越慢。默认 0.002。范围 [0.001, 0.02]。
    surfDist: 0.002,
    // 法线计算采样偏移。越小越准但多 3 次 SDF 采样。默认 0.004。范围 [0.001, 0.01]。
    normalEps: 0.004,
    // 玻璃内部折射步数。越大透明效果越好但越慢。默认 12。范围 [2, 24]。
    glassInteriorSteps: 12,
    // 渲染分辨率缩放。1.0 = 原生 DPR。默认 0.75。范围 [0.1, 1.0]。
    renderScale: 0.75,
  },
  medium: {
    maxSteps: 36, surfDist: 0.003, normalEps: 0.003,
    glassInteriorSteps: 10, renderScale: 0.5,
  },
  low: {
    maxSteps: 24, surfDist: 0.006, normalEps: 0.004,
    glassInteriorSteps: 8, renderScale: 0.35,
  },
};

// 性能采样环形缓冲区大小（约 2 秒 @ 60fps）
const PERF_SAMPLES = 128;

function detectGPUName() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return 'Unknown';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'Unknown';
  } catch { return 'Unknown'; }
}

class GPUDebugBus {
  constructor() {
    this.enabled = false;
    /** @type {'high'|'medium'|'low'|null} null = 自动检测 */
    this.forcedTier = null;
    this.tierParams = JSON.parse(JSON.stringify(DEFAULT_TIER_PARAMS));

    // 性能指标
    this.frameTimes = new Float32Array(PERF_SAMPLES);
    this.frameIdx = 0;
    this._lastTs = 0;
    this.activeTier = 'low';
    this.activeScale = 0.38;
    this.gpuName = '';

    this._listeners = new Set();
  }

  enable() {
    this.enabled = true;
    this.gpuName = detectGPUName();
    window.__GPU_DEBUG__ = this;
    this._notify('enable');
  }

  disable() {
    this.enabled = false;
    delete window.__GPU_DEBUG__;
    this._notify('disable');
  }

  /** 强制切换画质档位 */
  setForcedTier(tier) {
    this.forcedTier = tier;
    this._notify('tier-change');
    this._dispatchRebuild();
  }

  /** 修改某个档位的某个参数 */
  setParam(tier, key, value) {
    if (!this.tierParams[tier]) return;
    this.tierParams[tier][key] = value;
    const active = this.forcedTier || this.activeTier;
    if (tier === active) this._dispatchRebuild();
    this._notify('param-change');
  }

  /** 获取当前激活档位的参数 */
  getActiveTierParams() {
    const tier = this.forcedTier || this.activeTier;
    return this.tierParams[tier] || this.tierParams.medium;
  }

  /** 渲染器每帧尾部调用 */
  reportFrame() {
    const now = performance.now();
    if (this._lastTs > 0) {
      this.frameTimes[this.frameIdx] = now - this._lastTs;
      this.frameIdx = (this.frameIdx + 1) % PERF_SAMPLES;
    }
    this._lastTs = now;
  }

  /** 渲染器上报当前状态 */
  reportMetrics(tier, scale) {
    this.activeTier = tier;
    this.activeScale = scale;
  }

  /** 读取当前性能快照 */
  getMetrics() {
    let sum = 0, count = 0;
    for (let i = 0; i < PERF_SAMPLES; i++) {
      if (this.frameTimes[i] > 0) { sum += this.frameTimes[i]; count++; }
    }
    const avgMs = count > 0 ? sum / count : 16.67;
    return {
      fps: Math.round(1000 / avgMs),
      frameTimeMs: +avgMs.toFixed(1),
      activeTier: this.activeTier,
      activeScale: this.activeScale,
      gpuName: this.gpuName,
    };
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify(type) {
    for (const fn of this._listeners) fn(type);
  }

  _dispatchRebuild() {
    window.dispatchEvent(new CustomEvent('gpu-debug-rebuild', {
      detail: {
        tier: this.forcedTier || this.activeTier,
        params: this.getActiveTierParams(),
      },
    }));
  }

  resetToDefaults() {
    this.tierParams = JSON.parse(JSON.stringify(DEFAULT_TIER_PARAMS));
    this._notify('param-change');
    this._dispatchRebuild();
  }

  /** 导出当前三档配置为可粘贴的 JS 代码 */
  exportConfig() {
    const p = this.tierParams;
    const lines = [
      '// ══════════════════════════════════════════════════════════════',
      '// GPU Debug Panel — 导出的画质配置',
      `// 生成时间: ${new Date().toISOString()}`,
      `// GPU: ${this.gpuName}`,
      '// ══════════════════════════════════════════════════════════════',
      '',
      '// --- waveLook.js → TIER_SCALE ---',
      `export const TIER_SCALE = { high: ${p.high.renderScale}, medium: ${p.medium.renderScale}, low: ${p.low.renderScale} };`,
      '',
      '// --- shader builder → TIER_DEFINES ---',
      'const TIER_DEFINES = {',
    ];
    for (const tier of ['high', 'medium', 'low']) {
      const t = p[tier];
      const qd = { high: 'QUALITY_HIGH', medium: 'QUALITY_MEDIUM', low: 'QUALITY_LOW' }[tier];
      lines.push(`  ${tier}: [`);
      lines.push(`    '#define MAX_STEPS ${t.maxSteps}',`);
      lines.push(`    '#define SURF_DIST ${t.surfDist}',`);
      lines.push(`    '#define NORMAL_EPS ${t.normalEps}',`);
      lines.push(`    '#define GLASS_INTERIOR_STEPS ${t.glassInteriorSteps}',`);
      lines.push(`    '#define ${qd}',`);
      lines.push(`    '#define SPIKE_ENABLED',`);
      lines.push(`  ],`);
    }
    lines.push('};');
    return lines.join('\n');
  }
}

/** Singleton */
const bus = new GPUDebugBus();
export default bus;
