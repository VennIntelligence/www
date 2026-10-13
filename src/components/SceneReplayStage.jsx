import { useEffect, useRef } from 'react';
import useSectionFreeze from '../hooks/useSectionFreeze';
import { getCappedDPR } from '../utils/cappedDPR';
import { createFrameThrottle } from '../utils/frameThrottle';
import { readHueTokens } from '../utils/hueTokens';
import {
  AGENT_BICYCLE,
  AGENT_PEDESTRIAN,
  approachAngle,
  parseScene,
  pointVisible,
  sampleAgent,
  samplePose,
  shapeVisible,
} from '../utils/sceneReplay';
import { SCENE_REPLAY_LOOK as L } from '../config/sceneReplayLook';
import '../styles/components/canvas-stage.css';

/**
 * SceneReplayStage — 真实驾驶场景回放画布（2D canvas，透明背景）
 *
 * 俯视回放 nuPlan / NAVSIM 的真实日志（public/data/drive/<id>.json）：地图（可行驶区域、路口、人行横道、
 * 道路外缘、车道线、路口连接线按红灯着金色、停止线）、他车 / 自行车 / 行人、本车未来 N 秒的日志轨迹（"计划"）、
 * 已驶过的尾迹与本车。2 Hz 关键帧之间插值，按真实时间播放；每段播完停留、淡出，切到下一段，无限循环。
 *
 * 加载与性能约定：
 *   - 容器首次可见才 fetch 第一段（AbortController，离屏 / 卸载即中止），播放时预取下一段；解析结果缓存在 ref
 *   - 单一 RAF 循环，useSectionFreeze 离屏 / 后台即停并保留最后一帧；dt 积分，解冻无需时间补偿
 *   - 地图按每个形状的预计算包围盒与相机视窗做剔除；不在当前帧出现的 agent 直接跳过；循环内零对象分配
 *   - prefers-reduced-motion：只画规划帧（current_frame）的静态画面
 *   - 可调参数全部在 config/sceneReplayLook.js；不是 WebGL，不接 GPU 调参面板
 *
 * props:
 *   scenes    — 场景 id 数组（播放顺序），见 config/driveClips.js → DRIVE_REPLAY_SCENES
 *   className — 追加到容器的类名
 */

const TWO_PI = Math.PI * 2;
const DASH_NONE = [];
const NOOP = () => {};

/* Canvas palette derived from the site hue tokens, read once at setup. */
function readColors(el) {
  const { blue, bright, gold, rgba } = readHueTokens(el);
  return {
    drivable: 'rgba(255,255,255,0.04)',
    walkway: 'rgba(255,255,255,0.02)',
    intersection: 'rgba(255,255,255,0.03)',
    crosswalkFill: 'rgba(255,255,255,0.035)',
    crosswalkStroke: 'rgba(255,255,255,0.16)',
    roadEdge: 'rgba(255,255,255,0.3)',
    laneBoundary: 'rgba(255,255,255,0.13)',
    laneCenterline: 'rgba(255,255,255,0.08)',
    connector: 'rgba(255,255,255,0.06)',
    connectorRed: rgba(gold, 0.6),
    stopLine: 'rgba(255,255,255,0.3)',
    vehicle: 'rgba(255,255,255,0.2)',
    vehicleStroke: 'rgba(255,255,255,0.45)',
    bicycle: 'rgba(255,255,255,0.3)',
    pedestrian: 'rgba(255,255,255,0.55)',
    plan: rgba(bright, 0.95),
    trail: rgba(blue, 0.55),
    ego: rgba(blue, 0.95),
    egoStroke: 'rgba(255,255,255,0.9)',
    windscreen: 'rgba(0,0,0,0.35)',
  };
}

/* Add every visible shape of a layer to the current path (rings closed for polygons). */
function traceLayer(ctx, layer, view, close) {
  const { count, pts, ringStart, shapeStart } = layer;
  for (let s = 0; s < count; s++) {
    if (shapeVisible(layer, s, view)) traceShape(ctx, pts, ringStart, shapeStart[s], shapeStart[s + 1], close);
  }
}

function traceShape(ctx, pts, ringStart, r0, r1, close) {
  for (let r = r0; r < r1; r++) {
    const a = ringStart[r];
    const b = ringStart[r + 1];
    ctx.moveTo(pts[a * 2], pts[a * 2 + 1]);
    for (let i = a + 1; i < b; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
    if (close) ctx.closePath();
  }
}

function fillLayer(ctx, layer, view, style) {
  if (!layer.count) return;
  ctx.beginPath();
  traceLayer(ctx, layer, view, true);
  ctx.fillStyle = style;
  ctx.fill();
}

function strokeLayer(ctx, layer, view, style, width) {
  if (!layer.count) return;
  ctx.beginPath();
  traceLayer(ctx, layer, view, false);
  ctx.lineWidth = width;
  ctx.strokeStyle = style;
  ctx.stroke();
}

/* Connectors whose red flag at frame `fi` equals `red`. */
function strokeConnectors(ctx, scene, fi, view, red, style, width) {
  const layer = scene.map.connectors;
  const { count, pts, ringStart, shapeStart } = layer;
  if (!count) return;
  const row = fi * count;
  ctx.beginPath();
  for (let s = 0; s < count; s++) {
    if (scene.connRed[row + s] !== red || !shapeVisible(layer, s, view)) continue;
    traceShape(ctx, pts, ringStart, shapeStart[s], shapeStart[s + 1], false);
  }
  ctx.lineWidth = width;
  ctx.strokeStyle = style;
  ctx.stroke();
}

/* Oriented box (centre x, y, heading h) added to the current path; `ahead` shifts the centre along h. */
function traceBox(ctx, x, y, h, len, wid, ahead) {
  const c = Math.cos(h);
  const s = Math.sin(h);
  const cx = x + c * ahead;
  const cy = y + s * ahead;
  const hl = len * 0.5;
  const hw = wid * 0.5;
  ctx.moveTo(cx + c * hl - s * hw, cy + s * hl + c * hw);
  ctx.lineTo(cx - c * hl - s * hw, cy - s * hl + c * hw);
  ctx.lineTo(cx - c * hl + s * hw, cy - s * hl - c * hw);
  ctx.lineTo(cx + c * hl + s * hw, cy + s * hl - c * hw);
  ctx.closePath();
}

/* Agents of one type at fractional frame f, batched into a single path. */
function traceAgents(ctx, scene, f, type, view, pose) {
  ctx.beginPath();
  for (let k = 0; k < scene.nAgents; k++) {
    if (scene.agentType[k] !== type || !sampleAgent(scene, k, f, pose)) continue;
    const len = scene.agentLen[k];
    if (!pointVisible(pose[0], pose[1], len, view)) continue;
    if (type === AGENT_PEDESTRIAN) {
      ctx.moveTo(pose[0] + L.pedestrianRadius, pose[1]);
      ctx.arc(pose[0], pose[1], L.pedestrianRadius, 0, TWO_PI);
    } else {
      const wid = type === AGENT_BICYCLE ? Math.max(scene.agentWid[k], L.bicycleMinWidth) : scene.agentWid[k];
      traceBox(ctx, pose[0], pose[1], pose[2], len, wid, 0);
    }
  }
}

/* Ego polyline from fractional frame fa to fb (keyframes in between), optionally with keyframe dots. */
function traceEgoPath(ctx, scene, fa, fb, tmp) {
  const e = scene.ego;
  samplePose(e, 0, scene.n, fa, tmp);
  ctx.moveTo(tmp[0], tmp[1]);
  for (let i = Math.floor(fa) + 1; i < fb; i++) ctx.lineTo(e[i * 3], e[i * 3 + 1]);
  samplePose(e, 0, scene.n, fb, tmp);
  ctx.lineTo(tmp[0], tmp[1]);
}

function render(ctx, scene, f, alpha, cam, geo, colors, view, scratch) {
  const { w, h, dpr, ppm, lw } = geo;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (alpha <= 0) return;

  // Camera window as a world-space AABB (rotation-independent circle bound).
  view[0] = cam.x - geo.radius;
  view[1] = cam.y - geo.radius;
  view[2] = cam.x + geo.radius;
  view[3] = cam.y + geo.radius;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(w * 0.5, h * geo.anchorY);
  ctx.scale(ppm, -ppm);
  ctx.rotate(-(cam.h - Math.PI / 2));
  ctx.translate(-cam.x, -cam.y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Map, faint areas first, then lines.
  const m = scene.map;
  const drivable = m.drivable;
  ctx.fillStyle = colors.drivable;
  for (let s = 0; s < drivable.count; s++) {
    if (!shapeVisible(drivable, s, view)) continue;
    ctx.beginPath();
    traceShape(ctx, drivable.pts, drivable.ringStart, drivable.shapeStart[s], drivable.shapeStart[s + 1], true);
    ctx.fill('evenodd');
  }
  fillLayer(ctx, m.walkways, view, colors.walkway);
  fillLayer(ctx, m.intersections, view, colors.intersection);
  // Crosswalks: faint fill, then outline the same path.
  if (m.crosswalks.count) {
    fillLayer(ctx, m.crosswalks, view, colors.crosswalkFill);
    ctx.lineWidth = lw.crosswalk;
    ctx.strokeStyle = colors.crosswalkStroke;
    ctx.stroke();
  }
  strokeLayer(ctx, m.roadEdges, view, colors.roadEdge, lw.roadEdge);
  strokeLayer(ctx, m.laneBoundaries, view, colors.laneBoundary, lw.laneBoundary);
  if (geo.centerDash) {
    ctx.setLineDash(geo.centerDash);
    strokeLayer(ctx, m.laneCenterlines, view, colors.laneCenterline, lw.laneCenterline);
    ctx.setLineDash(DASH_NONE);
  }
  const fi = Math.floor(f);
  strokeConnectors(ctx, scene, fi, view, 0, colors.connector, lw.connector);
  strokeConnectors(ctx, scene, fi, view, 1, colors.connectorRed, lw.connectorRed);
  fillLayer(ctx, m.stopLines, view, colors.stopLine);

  // Agents: one batched path per type.
  const pose = scratch.pose;
  if (scene.nAgents) {
    traceAgents(ctx, scene, f, 0, view, pose);
    ctx.fillStyle = colors.vehicle;
    ctx.fill();
    ctx.lineWidth = lw.agentStroke;
    ctx.strokeStyle = colors.vehicleStroke;
    ctx.stroke();
    traceAgents(ctx, scene, f, AGENT_BICYCLE, view, pose);
    ctx.fillStyle = colors.bicycle;
    ctx.fill();
    traceAgents(ctx, scene, f, AGENT_PEDESTRIAN, view, pose);
    ctx.fillStyle = colors.pedestrian;
    ctx.fill();
  }

  // Ego driven trail (past) and plan (logged future) with a dot per 0.5 s keyframe.
  const last = scene.n - 1;
  const tmp = scratch.tmp;
  const trailStart = Math.max(0, f - L.trailSeconds * scene.fps);
  if (f > trailStart) {
    ctx.beginPath();
    traceEgoPath(ctx, scene, trailStart, f, tmp);
    ctx.lineWidth = lw.trail;
    ctx.strokeStyle = colors.trail;
    ctx.stroke();
  }
  const planEnd = Math.min(last, f + L.planSeconds * scene.fps);
  if (planEnd > f) {
    ctx.beginPath();
    traceEgoPath(ctx, scene, f, planEnd, tmp);
    ctx.lineWidth = lw.plan;
    ctx.strokeStyle = colors.plan;
    ctx.stroke();
    ctx.beginPath();
    const e = scene.ego;
    const r = lw.planDot;
    for (let i = Math.floor(f) + 1; i <= planEnd; i++) {
      ctx.moveTo(e[i * 3] + r, e[i * 3 + 1]);
      ctx.arc(e[i * 3], e[i * 3 + 1], r, 0, TWO_PI);
    }
    ctx.fillStyle = colors.plan;
    ctx.fill();
  }

  // Ego box centred ahead of the rear axle, windscreen tick marks the direction of travel.
  samplePose(scene.ego, 0, scene.n, f, pose);
  ctx.beginPath();
  traceBox(ctx, pose[0], pose[1], pose[2], scene.egoLen, scene.egoWid, L.egoRearAxleToCenter);
  ctx.fillStyle = colors.ego;
  ctx.fill();
  ctx.lineWidth = lw.egoStroke;
  ctx.strokeStyle = colors.egoStroke;
  ctx.stroke();
  ctx.beginPath();
  traceBox(ctx, pose[0], pose[1], pose[2], 0.3, scene.egoWid - 0.5, L.egoRearAxleToCenter + scene.egoLen * 0.12 + 0.15);
  ctx.fillStyle = colors.windscreen;
  ctx.fill();
  ctx.restore();
}

/* Seconds of real time one scene occupies: playback, hold at the last frame, fade out. */
const playSeconds = (scene) => (scene.n - 1) / (scene.fps * L.playbackSpeed);
const sceneSeconds = (scene) => playSeconds(scene) + L.holdSeconds + L.fadeOutSeconds;

function sceneAlpha(scene, clock) {
  const fadeIn = L.fadeInSeconds > 0 ? Math.min(1, clock / L.fadeInSeconds) : 1;
  const out = clock - playSeconds(scene) - L.holdSeconds;
  const fadeOut = out <= 0 ? 1 : L.fadeOutSeconds > 0 ? Math.max(0, 1 - out / L.fadeOutSeconds) : 0;
  return fadeIn * fadeOut;
}

export default function SceneReplayStage({ scenes, className = '' }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  // Parsed scenes and failed ids survive freeze / thaw; playback and camera state likewise.
  const cacheRef = useRef(new Map());
  const failedRef = useRef(new Set());
  const playRef = useRef({ idx: 0, clock: 0, snap: true, x: 0, y: 0, h: 0 });
  const { shouldAnimate } = useSectionFreeze(containerRef, { activeThreshold: 0.1 });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !scenes.length) return undefined;
    const ctx = canvas.getContext('2d');
    const colors = readColors(container);
    const throttle = createFrameThrottle();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cache = cacheRef.current;
    const failed = failedRef.current;
    const play = playRef.current;
    const count = scenes.length;
    play.idx %= count;

    const view = new Float32Array(4);
    const scratch = { pose: new Float32Array(3), tmp: new Float32Array(3) };
    const geo = {
      w: 1, h: 1, dpr: 1, ppm: L.pxPerMDesktop, radius: 1,
      anchorY: L.cameraMode === 'fixed' ? L.fixedAnchorY : L.egoAnchorY,
      centerDash: L.centerlineDashPx ? [0, 0] : null,
      lw: { ...L.lineWidthPx, planDot: 0 },
    };

    // Lazy loading: only while visible; aborted when frozen or unmounted, retried on the next thaw.
    const controller = new AbortController();
    const pending = new Set();
    let looping = false;
    const ensure = !shouldAnimate ? NOOP : (id) => {
      if (cache.has(id) || failed.has(id) || pending.has(id)) return;
      pending.add(id);
      fetch(`${L.dataBase}${id}.json`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((json) => {
          pending.delete(id);
          cache.set(id, parseScene(json));
          if (!looping) paint(0);
        })
        .catch((err) => {
          pending.delete(id);
          if (err.name !== 'AbortError') failed.add(id);
        });
    };

    // Move to the next loaded scene; a scene still loading makes the current one replay instead.
    const advance = () => {
      for (let k = 1; k <= count; k++) {
        const id = scenes[(play.idx + k) % count];
        if (cache.has(id)) {
          play.idx = (play.idx + k) % count;
          break;
        }
        if (!failed.has(id)) break;
      }
      play.clock = 0;
      play.snap = true;
    };

    // Smoothed camera on the ego box centre; dt = 0 keeps it still unless a snap is pending.
    const follow = (scene, f, dt) => {
      const pose = scratch.pose;
      samplePose(scene.ego, 0, scene.n, f, pose);
      const tx = pose[0] + Math.cos(pose[2]) * L.egoRearAxleToCenter;
      const ty = pose[1] + Math.sin(pose[2]) * L.egoRearAxleToCenter;
      const th = L.cameraMode === 'fixed' ? scene.ego[2] : pose[2];
      if (play.snap) {
        play.x = tx;
        play.y = ty;
        play.h = th;
        play.snap = false;
        return;
      }
      const kp = 1 - Math.exp(-dt / L.camPosTau);
      const kh = 1 - Math.exp(-dt / L.camHeadingTau);
      play.x += (tx - play.x) * kp;
      play.y += (ty - play.y) * kp;
      play.h = approachAngle(play.h, th, kh);
    };

    function paint(dt) {
      const id = scenes[play.idx];
      let scene = cache.get(id);
      if (!scene) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ensure(id);
        if (failed.has(id)) advance();
        return;
      }
      if (dt > 0 && !reduced) {
        ensure(scenes[(play.idx + 1) % count]);
        play.clock += dt;
        if (play.clock >= sceneSeconds(scene)) {
          advance();
          scene = cache.get(scenes[play.idx]);
        }
      }
      const f = reduced ? scene.currentFrame : Math.min(scene.n - 1, play.clock * L.playbackSpeed * scene.fps);
      const alpha = reduced ? 1 : sceneAlpha(scene, play.clock);
      follow(scene, f, dt);
      render(ctx, scene, f, alpha, play, geo, colors, view, scratch);
    }

    const resize = () => {
      const rect = container.getBoundingClientRect();
      geo.w = Math.max(1, Math.round(rect.width));
      geo.h = Math.max(1, Math.round(rect.height));
      geo.dpr = getCappedDPR();
      geo.ppm = window.innerWidth < 768 ? L.pxPerMMobile : L.pxPerMDesktop;
      geo.radius = Math.hypot(geo.w * 0.5, Math.max(geo.anchorY, 1 - geo.anchorY) * geo.h) / geo.ppm;
      // Pixel-constant line widths and dashes, converted to metres for the world transform.
      const px = 1 / geo.ppm;
      for (const key of Object.keys(L.lineWidthPx)) geo.lw[key] = L.lineWidthPx[key] * px;
      geo.lw.planDot = L.planDotPx * px;
      if (geo.centerDash) {
        geo.centerDash[0] = L.centerlineDashPx[0] * px;
        geo.centerDash[1] = L.centerlineDashPx[1] * px;
      }
      canvas.width = Math.round(geo.w * geo.dpr);
      canvas.height = Math.round(geo.h * geo.dpr);
      paint(0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    // Frozen (offscreen / background tab) or reduced motion: keep the last frame, no loop.
    if (!shouldAnimate || reduced) {
      return () => {
        controller.abort();
        observer.disconnect();
      };
    }

    looping = true;
    let animId = 0;
    let last = performance.now();
    throttle.reset();
    const tick = (now) => {
      animId = requestAnimationFrame(tick);
      if (throttle.skip()) return;
      const dt = Math.min((now - last) / 1000, L.maxDt);
      last = now;
      paint(dt);
    };
    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      controller.abort();
      observer.disconnect();
    };
  }, [shouldAnimate, scenes]);

  return (
    <div ref={containerRef} className={`canvas-stage ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
