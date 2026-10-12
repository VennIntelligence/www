import { useEffect, useRef } from 'react';
import useSectionFreeze from '../hooks/useSectionFreeze';
import { getCappedDPR } from '../utils/cappedDPR';
import { createFrameThrottle } from '../utils/frameThrottle';
import { createSim, stepSim, lanePos, hash01 } from '../utils/closedLoopSim';
import { CLOSED_LOOP_LOOK as L } from '../config/closedLoopLook';
import '../styles/components/closed-loop-stage.css';

/**
 * ClosedLoopStage — 闭环驾驶示意画布（2D canvas）
 *
 * 俯视视角跟随本车：无限延伸的双车道公路、人类日志路径（虚线）、
 * 本车按 2 Hz 重规划输出的 4 s 计划（亮线 + 扫掠足迹）、实际驶过的路径（实线）、
 * 周期性停车的前车、路边停车与对向车流。计划的扫掠足迹碰到前车时，
 * 第一个相交的计划位姿用金色框标出，本车随即刹车：这就是"碰撞已经写在计划里"。
 *
 * 性能约定：
 *   - 单一 RAF 循环，useSectionFreeze 离屏 / 后台即停；dt 积分，解冻无需时间补偿
 *   - 计算内核在 utils/closedLoopSim.js，缓冲一次分配，循环内零对象分配
 *   - DPR 走全站封顶，帧率走全局限流；不是 WebGL，不接 GPU 调参面板
 *   - 可调参数全部在 config/closedLoopLook.js
 *
 * props:
 *   hud      — i18n 的 HUD 文案对象（COPY.drive[lang].hud）
 *   showHud  — 是否绘制左上角读数与图例（默认 true）
 */

const TWO_PI = Math.PI * 2;
const DASH_LOGGED = [1.2, 1.6];
const DASH_DIVIDER = [2.5, 3.5];
const DASH_NONE = [];

/* Read the site hue tokens once so the canvas stays in sync with index.css. */
function readColors(el) {
  const cs = getComputedStyle(el);
  const triplet = (name, fallback) => {
    const parts = cs.getPropertyValue(name).trim().split(/\s+/).map(Number);
    return parts.length === 3 && !parts.some(Number.isNaN) ? parts : fallback;
  };
  const blue = triplet('--hue-blue', [120, 180, 255]);
  const bright = triplet('--hue-blue-bright', [200, 230, 255]);
  const gold = triplet('--hue-gold', [255, 200, 80]);
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  return {
    road: 'rgba(255,255,255,0.045)',
    edge: 'rgba(255,255,255,0.22)',
    divider: 'rgba(255,255,255,0.16)',
    logged: rgba(bright, 0.5),
    other: 'rgba(255,255,255,0.26)',
    otherStroke: 'rgba(255,255,255,0.42)',
    lead: 'rgba(255,255,255,0.5)',
    leadHot: rgba(gold, 0.85),
    sweep: rgba(blue, 0.16),
    plan: rgba(bright, 0.92),
    contact: rgba(gold, 0.95),
    trail: rgba(bright, 0.7),
    ego: rgba(blue, 0.95),
    egoStroke: 'rgba(255,255,255,0.9)',
    hud: rgba(bright, 0.88),
    hudDim: 'rgba(255,255,255,0.42)',
    hudHot: rgba(gold, 1),
    font: cs.getPropertyValue('--font-mono').trim() || 'monospace',
  };
}

function strokeCenterPath(ctx, sim, i0, i1, offset, wobble) {
  const n = L.centerSamples;
  ctx.beginPath();
  for (let i = i0; i <= i1; i++) {
    const slot = i % n;
    const h = sim.ch[slot];
    const off = wobble ? offset + 0.12 * Math.sin(i * L.sampleDs / 17) : offset;
    const x = sim.cx[slot] - Math.sin(h) * off;
    const y = sim.cy[slot] + Math.cos(h) * off;
    if (i === i0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawCar(ctx, x, y, h, fill, stroke) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(h);
  ctx.fillStyle = fill;
  ctx.fillRect(-L.carLen * 0.5, -L.carWidth * 0.5, L.carLen, L.carWidth);
  if (stroke) {
    ctx.lineWidth = 0.1;
    ctx.strokeStyle = stroke;
    ctx.strokeRect(-L.carLen * 0.5, -L.carWidth * 0.5, L.carLen, L.carWidth);
  }
  // Windscreen tick marks the direction of travel.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(L.carLen * 0.12, -L.carWidth * 0.5 + 0.25, 0.3, L.carWidth - 0.5);
  ctx.restore();
}

function render(ctx, sim, w, h, dpr, ppm, colors, hud) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w * 0.5, h * L.egoAnchorY);
  ctx.scale(ppm, -ppm);
  ctx.rotate(-(sim.camH - Math.PI / 2));
  ctx.translate(-sim.x, -sim.y);

  const ds = L.sampleDs;
  const i0 = Math.max(sim.base, Math.floor((sim.s - L.windowBack) / ds));
  const i1 = sim.next - 1;
  const s0 = i0 * ds;
  const s1 = i1 * ds;
  const p = sim.probe;

  // Road band, lane divider, outer edges and the logged (human) path on the lane center.
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  ctx.lineWidth = L.laneWidth * 2;
  ctx.strokeStyle = colors.road;
  strokeCenterPath(ctx, sim, i0, i1, 0, false);
  ctx.lineWidth = 0.12;
  ctx.strokeStyle = colors.edge;
  strokeCenterPath(ctx, sim, i0, i1, L.laneWidth, false);
  strokeCenterPath(ctx, sim, i0, i1, -L.laneWidth, false);
  ctx.setLineDash(DASH_DIVIDER);
  ctx.strokeStyle = colors.divider;
  strokeCenterPath(ctx, sim, i0, i1, 0, false);
  ctx.setLineDash(DASH_LOGGED);
  ctx.lineWidth = 0.1;
  ctx.strokeStyle = colors.logged;
  strokeCenterPath(ctx, sim, i0, i1, -L.laneWidth * 0.5, true);
  ctx.setLineDash(DASH_NONE);

  // Parked cars on the right shoulder: deterministic per cell.
  const pk0 = Math.floor(s0 / L.parkedSpacing);
  const pk1 = Math.floor(s1 / L.parkedSpacing);
  for (let k = pk0; k <= pk1; k++) {
    if (hash01(k * 7 + 3) >= L.parkedProb) continue;
    const s = k * L.parkedSpacing + hash01(k * 13 + 5) * L.parkedSpacing * 0.5;
    if (s < s0 || s > s1) continue;
    lanePos(sim, s, -L.laneWidth * 0.5 - 1.2, p);
    drawCar(ctx, p[0], p[1], p[2], colors.other, colors.otherStroke);
  }

  // Oncoming traffic in the left lane, moving towards the ego.
  const shift = L.oncomingSpeed * sim.t;
  const ok0 = Math.floor((s0 + shift) / L.oncomingSpacing);
  const ok1 = Math.floor((s1 + shift) / L.oncomingSpacing);
  for (let k = ok0; k <= ok1; k++) {
    if (hash01(k * 5 + 1) >= L.oncomingProb) continue;
    const s = k * L.oncomingSpacing - shift;
    if (s < s0 || s > s1) continue;
    lanePos(sim, s, L.laneWidth, p);
    drawCar(ctx, p[0], p[1], p[2] + Math.PI, colors.other, colors.otherStroke);
  }

  // Lead vehicle, tinted when the plan's sweep touches it.
  const hot = sim.contactIdx >= 0;
  drawCar(ctx, sim.leadX, sim.leadY, sim.leadH, hot ? colors.leadHot : colors.lead, colors.otherStroke);

  // Swept footprint of the plan.
  const np = L.planPoints;
  ctx.beginPath();
  ctx.moveTo(sim.sweep[0], sim.sweep[1]);
  for (let k = 1; k <= np; k++) ctx.lineTo(sim.sweep[k * 4], sim.sweep[k * 4 + 1]);
  for (let k = np; k >= 0; k--) ctx.lineTo(sim.sweep[k * 4 + 2], sim.sweep[k * 4 + 3]);
  ctx.closePath();
  ctx.fillStyle = colors.sweep;
  ctx.fill();

  // Plan polyline with a dot per decision point.
  ctx.beginPath();
  ctx.moveTo(sim.planX[0], sim.planY[0]);
  for (let k = 1; k <= np; k++) ctx.lineTo(sim.planX[k], sim.planY[k]);
  ctx.lineWidth = 0.18;
  ctx.lineCap = 'round';
  ctx.strokeStyle = colors.plan;
  ctx.stroke();
  ctx.fillStyle = colors.plan;
  for (let k = 1; k <= np; k++) {
    ctx.beginPath();
    ctx.arc(sim.planX[k], sim.planY[k], 0.22, 0, TWO_PI);
    ctx.fill();
  }

  // First planned pose that intersects the lead.
  if (hot) {
    ctx.save();
    ctx.translate(sim.contactX, sim.contactY);
    ctx.rotate(sim.contactH);
    ctx.lineWidth = 0.16;
    ctx.strokeStyle = colors.contact;
    ctx.strokeRect(-L.carLen * 0.5, -L.carWidth * 0.5, L.carLen, L.carWidth);
    ctx.restore();
  }

  // Driven path.
  if (sim.trailCount > 1) {
    const start = (sim.trailHead - sim.trailCount + L.trailPoints) % L.trailPoints;
    ctx.beginPath();
    for (let j = 0; j < sim.trailCount; j++) {
      const idx = (start + j) % L.trailPoints;
      if (j === 0) ctx.moveTo(sim.trailX[idx], sim.trailY[idx]);
      else ctx.lineTo(sim.trailX[idx], sim.trailY[idx]);
    }
    ctx.lineTo(sim.x, sim.y);
    ctx.lineWidth = 0.2;
    ctx.strokeStyle = colors.trail;
    ctx.stroke();
  }

  drawCar(ctx, sim.x, sim.y, sim.heading, colors.ego, colors.egoStroke);
  ctx.restore();

  if (!hud) return;

  // HUD in screen space.
  const gap = Math.max(0, sim.leadS - sim.s - L.carLen);
  const pad = 16;
  const line = 16;
  ctx.font = `11px ${colors.font}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = colors.hudDim;
  ctx.fillText(`${hud.scene} ${String(sim.scene).padStart(2, '0')}  ·  ${hud.decision} ${String(sim.decision).padStart(2, '0')}/${L.sceneDecisions}`, pad, pad);
  // Decision ticks.
  const tickW = 6;
  for (let k = 0; k < L.sceneDecisions; k++) {
    ctx.fillStyle = k < sim.decision ? colors.hud : colors.hudDim;
    ctx.fillRect(pad + k * (tickW + 3), pad + line + 2, tickW, 3);
  }
  ctx.fillStyle = colors.hud;
  ctx.fillText(`${hud.speed} ${sim.v.toFixed(1)} m/s   ${hud.gap} ${gap.toFixed(1)} m   ${hud.lateral} ${sim.lat >= 0 ? '+' : ''}${sim.lat.toFixed(2)} m`, pad, pad + line * 2 + 2);
  ctx.fillStyle = hot ? colors.hudHot : colors.hudDim;
  ctx.fillText(`${hud.contact}  ${hot ? hud.yes : hud.no}  (p ${sim.contactP.toFixed(2)})`, pad, pad + line * 3 + 2);

  // Legend, bottom-left.
  const ly = h - pad - 12;
  let lx = pad;
  const legend = [
    [colors.trail, hud.legendDriven],
    [colors.logged, hud.legendLogged],
    [colors.plan, hud.legendPlan],
    [colors.sweep, hud.legendSweep],
  ];
  for (let i = 0; i < legend.length; i++) {
    ctx.fillStyle = legend[i][0];
    ctx.fillRect(lx, ly + 3, 14, 4);
    ctx.fillStyle = colors.hudDim;
    ctx.fillText(legend[i][1], lx + 20, ly - 2);
    lx += 20 + ctx.measureText(legend[i][1]).width + 18;
  }
}

export default function ClosedLoopStage({ hud = null, showHud = true, className = '' }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const simRef = useRef(null);
  const { shouldAnimate } = useSectionFreeze(containerRef, { activeThreshold: 0.1 });
  const hudCopy = showHud ? hud : null;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;
    // The simulation state survives freeze / thaw and language switches; only the loop restarts.
    if (!simRef.current) simRef.current = createSim();
    const sim = simRef.current;
    const ctx = canvas.getContext('2d');
    const colors = readColors(container);
    const throttle = createFrameThrottle();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let ppm = L.pxPerMDesktop;

    const draw = () => render(ctx, sim, w, h, dpr, ppm, colors, hudCopy);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      dpr = getCappedDPR();
      ppm = window.innerWidth < 768 ? L.pxPerMMobile : L.pxPerMDesktop;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      stepSim(sim, 0);
      draw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    // Frozen (offscreen / background tab) or reduced motion: keep the last frame, no loop.
    if (!shouldAnimate || reduced) {
      return () => observer.disconnect();
    }

    let animId = 0;
    let last = performance.now();
    throttle.reset();
    const tick = (now) => {
      animId = requestAnimationFrame(tick);
      if (throttle.skip()) return;
      const dt = Math.min((now - last) / 1000, L.maxDt);
      last = now;
      stepSim(sim, dt);
      draw();
    };
    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, [shouldAnimate, hudCopy]);

  return (
    <div ref={containerRef} className={`closed-loop-stage ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
