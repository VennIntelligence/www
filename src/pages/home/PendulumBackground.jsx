import { useRef, useEffect } from 'react';
import useSectionFreeze from '../../hooks/useSectionFreeze';
import { createFrameThrottle } from '../../utils/frameThrottle';

// ─── 配置常量（调参区）────────────────────────────────────────────
// 摆的数量。默认值：20。越多 = 波形越密实。
const NUM_PENDULUMS = 20;

// 完整周期时长（秒）。默认值：60。越长 = 图案变化越慢。
const CYCLE_DURATION = 60;

// 长摆在一个周期内完成的摆动次数。默认值：30。
const BASE_OSCILLATIONS = 30;

// 摆幅角度（度）。默认值：35。越大 = 摆动幅度越大。
const AMPLITUDE_RAD = 35 * (Math.PI / 180);

// 拖尾长度（帧数）。默认值：50。越大 = 拖尾越长。
const TRAIL_LENGTH = 50;

// 重力加速度，用于推算物理摆长。默认值：9.81。
const GRAVITY = 9.81;

// 颜色——CSS filter hue-rotate(90deg) 会把 Amber 系映射到 Emerald（绿宝石）系
const C_A = { r: 200, g: 149, b: 108 }; // Amber  #c8956c
const C_B = { r: 212, g: 165, b: 116 }; // Gold   #d4a574
const C_C = { r: 224, g: 120, b: 80  }; // Coral  #e07850

// 悬挂点距顶部的比例。默认值：0.08。越大 = 悬挂点越低。
const PIVOT_Y_RATIO = 0.08;

// 最长摆的显示长度（相对于视口高度）。默认值：0.72。
const MAX_DISPLAY_RATIO = 0.72;

// 最短摆的显示长度（相对于视口高度）。默认值：0.38。
const MIN_DISPLAY_RATIO = 0.38;

// 水平留白（相对于视口宽度）。默认值：0.10。
const MARGIN_RATIO = 0.10;
// ──────────────────────────────────────────────────────────────────

function lerp(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function mkColor(i, n) {
  const t = i / (n - 1);
  return t < 0.5 ? lerp(C_A, C_B, t * 2) : lerp(C_B, C_C, (t - 0.5) * 2);
}

/** 环形拖尾缓冲（固定长度，帧内不分配，避免 GC） */
class TrailBuffer {
  constructor() {
    // 用两个 Float32Array 存 x/y（比数组更快）
    this.xs = new Float32Array(TRAIL_LENGTH);
    this.ys = new Float32Array(TRAIL_LENGTH);
    this.head = 0;
    this.size = 0;
  }
  push(x, y) {
    this.xs[this.head] = x;
    this.ys[this.head] = y;
    this.head = (this.head + 1) % TRAIL_LENGTH;
    if (this.size < TRAIL_LENGTH) this.size++;
  }
  /** 从旧到新遍历，cb(x0,y0,x1,y1,alpha) */
  draw(ctx, r, g, b) {
    const { xs, ys, size, head } = this;
    if (size < 2) return;
    const start = size < TRAIL_LENGTH ? 0 : head;
    for (let j = 1; j < size; j++) {
      const pi = (start + j - 1) % TRAIL_LENGTH;
      const ci = (start + j) % TRAIL_LENGTH;
      const alpha = (j / size) ** 2 * 0.25;
      ctx.beginPath();
      ctx.moveTo(xs[pi], ys[pi]);
      ctx.lineTo(xs[ci], ys[ci]);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
}

/** 单个摆 */
class Pendulum {
  constructor(i, n) {
    const { r, g, b } = mkColor(i, n);
    this.r = r; this.g = g; this.b = b;
    const osc = BASE_OSCILLATIONS + i;
    const period = CYCLE_DURATION / osc;
    this.omega = 2 * Math.PI / period;
    this.physLen = GRAVITY * (period / (2 * Math.PI)) ** 2;
    this.trail = new TrailBuffer();
  }

  bob(t, px, py, dispLen) {
    const a = AMPLITUDE_RAD * Math.cos(this.omega * t);
    return {
      x: px + Math.sin(a) * dispLen,
      y: py + Math.cos(a) * dispLen,
    };
  }
}

/**
 * PendulumBackground — 摆波动画全屏背景 Canvas
 *
 * Props:
 *   containerRef — 父级 section 的 ref，传给 useSectionFreeze
 */
export default function PendulumBackground({ containerRef }) {
  const canvasRef = useRef(null);

  // 离开视口 / Tab 切走时停机，回来无缝恢复（时间补偿避免 uTime 跳变）
  const { shouldAnimate } = useSectionFreeze(containerRef, {
    activeThreshold: 0.05,
    thresholds: [0, 0.05, 0.2, 0.5],
  });

  // RAF 句柄放 ref，两个 effect 共享
  const rafRef = useRef(null);
  // draw 函数放 ref，解决闭包跨 effect 共享问题
  const drawRef = useRef(null);
  // shouldAnimate 以 ref 形式传给 draw 闭包
  const activeRef = useRef(shouldAnimate);
  activeRef.current = shouldAnimate;

  // ── 主 effect：挂载时初始化，卸载时清理 ──────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 初始化摆列表
    const pends = Array.from({ length: NUM_PENDULUMS }, (_, i) =>
      new Pendulum(i, NUM_PENDULUMS)
    );
    const maxPhys = pends[0].physLen;
    const minPhys = pends[NUM_PENDULUMS - 1].physLen;

    // 冲击波列表（点击 / 触摸）
    const impulses = [];
    const addImpulse = (x, y) => impulses.push({ x, y, age: 0, s: 0.15 });
    const onClickCb = (e) => addImpulse(e.clientX, e.clientY);
    const onTouchCb = (e) => {
      e.preventDefault();
      addImpulse(e.touches[0].clientX, e.touches[0].clientY);
    };
    canvas.addEventListener('click', onClickCb);
    canvas.addEventListener('touchstart', onTouchCb, { passive: false });

    // DPR resize
    let vpW = 0, vpH = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      vpW = window.innerWidth;
      vpH = window.innerHeight;
      canvas.width  = vpW * dpr;
      canvas.height = vpH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', resize);
    resize();

    // 时间状态
    let startTime = null;
    let freezeTs  = null;

    // ── 核心绘制函数（存到 drawRef 供第二个 effect 唤醒） ──────
    const frameThrottle = createFrameThrottle();

    const draw = (ts) => {
      // 冻结检测
      if (!activeRef.current) {
        if (freezeTs === null) freezeTs = ts;
        rafRef.current = null; // 停机
        frameThrottle.reset(); // 停机后重置限流器时钟
        return;
      }

      // 帧率限流（在冻结检测之后，确保冻结逻辑不被跳过）
      rafRef.current = requestAnimationFrame(draw);
      if (frameThrottle.skip()) return;

      // 首次启动
      if (startTime === null) startTime = ts;

      // 解冻：时间补偿
      if (freezeTs !== null) {
        startTime += ts - freezeTs;
        freezeTs = null;
      }

      const t = (ts - startTime) / 1000;
      const margin  = vpW * MARGIN_RATIO;
      const usableW = vpW - margin * 2;
      const pivotY  = vpH * PIVOT_Y_RATIO;
      const maxLen  = vpH * MAX_DISPLAY_RATIO;
      const minLen  = vpH * MIN_DISPLAY_RATIO;

      // 清空
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, vpW, vpH);

      // 参考线（3 条水平虚线）
      ctx.strokeStyle = 'rgba(200,149,108,0.04)';
      ctx.lineWidth = 1;
      for (let j = 0; j < 3; j++) {
        const ry = pivotY + minLen + (maxLen - minLen) * (j / 2);
        ctx.beginPath();
        ctx.moveTo(margin * 0.5, ry);
        ctx.lineTo(vpW - margin * 0.5, ry);
        ctx.stroke();
      }

      // 悬挂横梁
      ctx.strokeStyle = 'rgba(200,149,108,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin - 20, pivotY);
      ctx.lineTo(vpW - margin + 20, pivotY);
      ctx.stroke();

      // 衰减冲击波
      for (let j = impulses.length - 1; j >= 0; j--) {
        impulses[j].age += 1 / 60;
        impulses[j].s   *= 0.98;
        if (impulses[j].s < 0.001) impulses.splice(j, 1);
      }

      // 计算摆球位置 & 更新拖尾
      const bobs = new Array(NUM_PENDULUMS);
      for (let i = 0; i < NUM_PENDULUMS; i++) {
        const p   = pends[i];
        const px  = margin + (usableW / (NUM_PENDULUMS - 1)) * i;
        const lr  = (p.physLen - minPhys) / (maxPhys - minPhys);
        const dl  = minLen + (maxLen - minLen) * lr;
        const bob = p.bob(t, px, pivotY, dl);

        // 冲击波叠加
        for (const imp of impulses) {
          const dx   = px - imp.x;
          const dy   = bob.y - imp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const wave = Math.sin(dist * 0.02 - imp.age * 8) * imp.s * dl;
          bob.x += wave * Math.exp(-dist * 0.003);
        }

        p.trail.push(bob.x, bob.y);
        bobs[i] = { x: bob.x, y: bob.y, px, dl };
      }

      // 拖尾
      for (let i = 0; i < NUM_PENDULUMS; i++) {
        const p = pends[i];
        p.trail.draw(ctx, p.r, p.g, p.b);
      }

      // 连线（光晕 + 精细）
      const drawCurve = (lw, style) => {
        ctx.beginPath();
        ctx.moveTo(bobs[0].x, bobs[0].y);
        for (let i = 1; i < NUM_PENDULUMS; i++) {
          if (i < NUM_PENDULUMS - 1) {
            const cpx = (bobs[i].x + bobs[i + 1].x) / 2;
            const cpy = (bobs[i].y + bobs[i + 1].y) / 2;
            ctx.quadraticCurveTo(bobs[i].x, bobs[i].y, cpx, cpy);
          } else {
            ctx.lineTo(bobs[i].x, bobs[i].y);
          }
        }
        ctx.strokeStyle = style;
        ctx.lineWidth = lw;
        ctx.stroke();
      };
      drawCurve(6, 'rgba(212,165,116,0.08)');
      drawCurve(1, 'rgba(212,165,116,0.15)');

      // 摆线 + 悬挂点 + 球体（外光晕 → 内光晕 → 球核）
      for (let i = 0; i < NUM_PENDULUMS; i++) {
        const { r, g, b } = pends[i];
        const { x, y, px } = bobs[i];

        // 摆线
        ctx.beginPath();
        ctx.moveTo(px, pivotY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.2)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 悬挂点
        ctx.beginPath();
        ctx.arc(px, pivotY, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
        ctx.fill();

        // 外光晕（r=18）
        const g1 = ctx.createRadialGradient(x, y, 0, x, y, 18);
        g1.addColorStop(0,   `rgba(${r},${g},${b},0.3)`);
        g1.addColorStop(0.3, `rgba(${r},${g},${b},0.1)`);
        g1.addColorStop(1,   `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = g1;
        ctx.fill();

        // 内光晕（r=8）
        const g2 = ctx.createRadialGradient(x, y, 0, x, y, 8);
        g2.addColorStop(0, `rgba(${Math.min(255,r+40)},${Math.min(255,g+40)},${Math.min(255,b+30)},0.6)`);
        g2.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = g2;
        ctx.fill();

        // 球核（r=3）
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.min(255,r+60)},${Math.min(255,g+60)},${Math.min(255,b+50)},0.9)`;
        ctx.fill();
      }

    };

    // 保存 draw 引用，供第二个 effect 唤醒用
    drawRef.current = draw;

    // 启动
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      drawRef.current = null;
      canvas.removeEventListener('click', onClickCb);
      canvas.removeEventListener('touchstart', onTouchCb);
      window.removeEventListener('resize', resize);
    };
  }, []); // 仅 mount 时运行

  // ── 唤醒 effect：shouldAnimate 变 true 且 RAF 已停机时重启 ──
  useEffect(() => {
    if (!shouldAnimate) return;
    if (rafRef.current !== null) return; // 已在跑，无需接管
    if (!drawRef.current) return;        // 未初始化
    rafRef.current = requestAnimationFrame(drawRef.current);
  }, [shouldAnimate]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        // Amber/Gold → Emerald 色系映射
        filter: 'hue-rotate(90deg) saturate(1.2)',
        display: 'block',
      }}
    />
  );
}
