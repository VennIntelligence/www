import { useEffect, useRef, useState, useCallback } from 'react';
import bus from '../utils/gpuDebugBus';
import '../styles/components/gpu-debug-panel.css';

/**
 * GPUDebugPanel — 浮动 GPU 调参面板
 *
 * 仅在 dev:gpu 模式下渲染（通过 dynamic import 确保 tree-shaking）。
 * 面板文本为开发者工具，不走 i18n 系统（整个模块在生产构建中被排除）。
 *
 * 功能：
 *   1. Low / Medium / High 画质切换
 *   2. 各档位 shader 质量参数滑块
 *   3. 实时 FPS 图表 + 性能数据
 *   4. 一键复制全部配置
 */

// ── 滑块参数定义 ──
const PARAM_DEFS = [
  { key: 'renderScale',        label: '渲染缩放',   min: 0.1,   max: 1.0,  step: 0.01, fmt: v => v.toFixed(2) },
  { key: 'maxSteps',           label: '光追步数',   min: 8,     max: 80,   step: 1,    fmt: v => String(v) },
  { key: 'surfDist',           label: '表面距离',   min: 0.001, max: 0.02, step: 0.001,fmt: v => v.toFixed(3) },
  { key: 'normalEps',          label: '法线精度',   min: 0.001, max: 0.01, step: 0.001,fmt: v => v.toFixed(3) },
  { key: 'glassInteriorSteps', label: '玻璃步数',   min: 2,     max: 24,   step: 1,    fmt: v => String(v) },
];

// ── FPS 图表颜色 ──
const FPS_COLOR_GOOD = '#4ecdc4';
const FPS_COLOR_WARN = '#ffd166';
const FPS_COLOR_BAD  = '#ff6b6b';

function fpsColor(fps) {
  if (fps >= 50) return FPS_COLOR_GOOD;
  if (fps >= 30) return FPS_COLOR_WARN;
  return FPS_COLOR_BAD;
}

function fpsGrade(fps) {
  if (fps >= 50) return 'good';
  if (fps >= 30) return 'warn';
  return 'bad';
}

export default function GPUDebugPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTier, setActiveTier] = useState('low');
  const [params, setParams] = useState(() => JSON.parse(JSON.stringify(bus.tierParams)));
  const [metrics, setMetrics] = useState({ fps: 0, frameTimeMs: 0, activeTier: 'low', activeScale: 0.38, gpuName: '' });
  const [pos, setPos] = useState({ x: window.innerWidth - 360, y: 80 });
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef(null);
  const dragRef = useRef({ active: false, ox: 0, oy: 0 });
  const perfAnimRef = useRef(0);

  // ── 启用 debug bus ──
  useEffect(() => {
    bus.enable();
    bus.setForcedTier('low');
    setActiveTier('low');
    return () => bus.disable();
  }, []);

  // ── 订阅 bus 状态变更 ──
  useEffect(() => {
    return bus.subscribe(() => {
      setParams(JSON.parse(JSON.stringify(bus.tierParams)));
    });
  }, []);

  // ── 性能指标定时刷新（10Hz，避免不必要的重渲染） ──
  useEffect(() => {
    const id = setInterval(() => setMetrics(bus.getMetrics()), 100);
    return () => clearInterval(id);
  }, []);

  // ── FPS 独立 RAF 采样 + 图表绘制 ──
  useEffect(() => {
    if (collapsed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const draw = () => {
      perfAnimRef.current = requestAnimationFrame(draw);
      bus.reportFrame();

      ctx.clearRect(0, 0, w, h);
      const samples = bus.frameTimes;
      const idx = bus.frameIdx;
      const len = samples.length;
      const barW = w / len;

      for (let i = 0; i < len; i++) {
        const si = (idx + i) % len;
        const dt = samples[si];
        if (dt <= 0) continue;
        const fps = 1000 / dt;
        const barH = Math.min((fps / 120) * h, h);
        ctx.fillStyle = fpsColor(fps);
        ctx.globalAlpha = 0.6 + (i / len) * 0.4;
        ctx.fillRect(i * barW, h - barH, barW - 0.5, barH);
      }
      ctx.globalAlpha = 1;

      // 60fps 参考线
      const y60 = h - (60 / 120) * h;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y60);
      ctx.lineTo(w, y60);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    draw();
    return () => cancelAnimationFrame(perfAnimRef.current);
  }, [collapsed]);

  // ── 拖拽 ──
  const onTitleDown = useCallback((e) => {
    dragRef.current = { active: true, ox: e.clientX - pos.x, oy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pos]);

  const onTitleMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    setPos({ x: e.clientX - dragRef.current.ox, y: e.clientY - dragRef.current.oy });
  }, []);

  const onTitleUp = useCallback(() => { dragRef.current.active = false; }, []);

  // ── 画质切换 ──
  const switchTier = useCallback((tier) => {
    setActiveTier(tier);
    bus.setForcedTier(tier);
  }, []);

  // ── 参数调节 ──
  const onSliderChange = useCallback((key, raw) => {
    const def = PARAM_DEFS.find(d => d.key === key);
    const value = def?.step >= 1 ? parseInt(raw, 10) : parseFloat(raw);
    bus.setParam(activeTier, key, value);
  }, [activeTier]);

  // ── 复制配置 ──
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bus.exportConfig());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback: select text */ }
  }, []);

  // ── 重置 ──
  const handleReset = useCallback(() => bus.resetToDefaults(), []);

  const tierParams = params[activeTier] || params.medium;

  return (
    <div className="gpu-debug-panel" style={{ left: pos.x, top: pos.y }}>
      {/* 标题栏 */}
      <div
        className="gpu-debug-title"
        onPointerDown={onTitleDown}
        onPointerMove={onTitleMove}
        onPointerUp={onTitleUp}
      >
        <span className="gpu-debug-title-text">GPU Debug</span>
        <div className="gpu-debug-title-btns">
          <button className="gpu-debug-title-btn" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="gpu-debug-body">
          {/* GPU 信息 */}
          <div className="gpu-debug-gpu-info">
            <span className="gpu-debug-gpu-label">GPU</span>
            {metrics.gpuName || 'Detecting...'}
          </div>

          {/* 画质切换 */}
          <div className="gpu-debug-group">
            <div className="gpu-debug-group-title">画质切换</div>
            <div className="gpu-debug-tiers">
              {['low', 'medium', 'high'].map(tier => (
                <button
                  key={tier}
                  className="gpu-debug-tier-btn"
                  data-tier={tier}
                  data-active={activeTier === tier}
                  onClick={() => switchTier(tier)}
                >
                  {tier === 'low' ? '低' : tier === 'medium' ? '中' : '高'}
                </button>
              ))}
            </div>
          </div>

          {/* 渲染参数滑块 */}
          <div className="gpu-debug-group">
            <div className="gpu-debug-group-title">
              渲染参数 ({activeTier.toUpperCase()})
            </div>
            {PARAM_DEFS.map(({ key, label, min, max, step, fmt }) => (
              <div className="gpu-debug-slider-row" key={key}>
                <span className="gpu-debug-slider-label">{label}</span>
                <input
                  className="gpu-debug-slider"
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={tierParams[key]}
                  onChange={e => onSliderChange(key, e.target.value)}
                />
                <span className="gpu-debug-slider-value">{fmt(tierParams[key])}</span>
              </div>
            ))}
          </div>

          {/* 性能监控 */}
          <div className="gpu-debug-group">
            <div className="gpu-debug-group-title">性能监控</div>
            <div className="gpu-debug-perf-row">
              <div className="gpu-debug-perf-stat">
                <span className="gpu-debug-perf-value" data-good={fpsGrade(metrics.fps) === 'good'} data-warn={fpsGrade(metrics.fps) === 'warn'} data-bad={fpsGrade(metrics.fps) === 'bad'}>
                  {metrics.fps}
                </span>
                <span className="gpu-debug-perf-label">FPS</span>
              </div>
              <div className="gpu-debug-perf-stat">
                <span className="gpu-debug-perf-value" data-good={metrics.frameTimeMs < 20} data-warn={metrics.frameTimeMs >= 20 && metrics.frameTimeMs < 40} data-bad={metrics.frameTimeMs >= 40}>
                  {metrics.frameTimeMs}
                </span>
                <span className="gpu-debug-perf-label">帧时间(ms)</span>
              </div>
            </div>
            <canvas ref={canvasRef} className="gpu-debug-perf-canvas" />
            <div className="gpu-debug-perf-meta">
              <span>档位: {metrics.activeTier?.toUpperCase()}</span>
              <span>缩放: {(metrics.activeScale || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="gpu-debug-actions">
            <button className="gpu-debug-btn" onClick={handleReset}>重置</button>
            <button
              className={`gpu-debug-btn gpu-debug-btn-copy ${copied ? 'gpu-debug-btn-copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? '✓ 已复制' : '📋 复制全部配置'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
