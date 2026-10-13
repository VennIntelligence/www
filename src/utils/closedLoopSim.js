/**
 * closedLoopSim — 闭环驾驶示意画布的纯计算内核（无 DOM、无 React）
 *
 * 世界：一条由两个正弦曲率叠加、沿弧长 s 无限延伸的双车道公路。
 * 本车在车道坐标 (s, lat) 里运动，按 decisionDt 重规划一段 planHorizon 的计划并执行到下一个决策；
 * 前车速度周期性起伏并停车；计划的扫掠足迹若在时域内触到前车，记为"计划接触"并把执行计划刹到前车速度之下。
 * 沿 s 每隔约 intersectionSpacing 米按确定性哈希放置一个垂直十字路口（crossingS），横向车流只做视觉、不与本车交互。
 *
 * 所有缓冲在 createSim() 里一次分配，stepSim() 内零对象分配。可调参数见 config/closedLoopLook.js。
 */
import { CLOSED_LOOP_LOOK as L } from '../config/closedLoopLook';

const TWO_PI = Math.PI * 2;

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/* Deterministic hash in [0, 1) for integer cells: parked cars and oncoming traffic are pure functions of position. */
export function hash01(k) {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* Arc length of the cross street in cell k, or -1 when the cell has none. Pure function of k. */
export function crossingS(k) {
  if (hash01(k * 11 + 7) >= L.intersectionProb) return -1;
  return (k + 0.5 + (hash01(k * 17 + 9) - 0.5) * L.intersectionJitter) * L.intersectionSpacing;
}

/* True when s lies within `margin` metres of any cross street's junction box. */
export function nearCrossing(s, margin) {
  const k = Math.floor(s / L.intersectionSpacing);
  for (let j = k - 1; j <= k + 1; j++) {
    const c = crossingS(j);
    if (c >= 0 && Math.abs(s - c) < L.laneWidth + margin) return true;
  }
  return false;
}

function curvature(s) {
  return L.curvAmp1 * Math.sin(TWO_PI * s / L.curvLen1) + L.curvAmp2 * Math.sin(TWO_PI * s / L.curvLen2 + 1.3);
}

export function createSim() {
  const n = L.planPoints + 1;
  return {
    t: 0,
    // Centerline ring buffer: slot (i % centerSamples) holds sample i at s = i * sampleDs.
    cx: new Float32Array(L.centerSamples),
    cy: new Float32Array(L.centerSamples),
    ch: new Float32Array(L.centerSamples),
    base: 0,
    next: 0,
    tailX: 0,
    tailY: 0,
    tailH: Math.PI / 2,
    // Ego state in lane coordinates (s along the road, lat relative to the lane center) and world pose.
    s: 0,
    lat: 0,
    v: 0,
    x: 0,
    y: 0,
    heading: Math.PI / 2,
    camH: Math.PI / 2,
    // Current plan (lane coordinates), its world polyline and swept footprint (left xy, right xy per point).
    planS: new Float32Array(n),
    planLat: new Float32Array(n),
    planX: new Float32Array(n),
    planY: new Float32Array(n),
    planH: new Float32Array(n),
    sweep: new Float32Array(n * 4),
    planV: 0,
    planAge: L.decisionDt,
    decision: 0,
    scene: 1,
    contactIdx: -1,
    contactP: 0,
    contactX: 0,
    contactY: 0,
    contactH: 0,
    // Lead vehicle.
    leadS: L.leadGapInit,
    leadV: L.leadVBase,
    leadX: 0,
    leadY: 0,
    leadH: Math.PI / 2,
    // Driven-path trail ring buffer.
    trailX: new Float32Array(L.trailPoints),
    trailY: new Float32Array(L.trailPoints),
    trailHead: 0,
    trailCount: 0,
    trailAcc: 0,
    // Scratch for sampleAt / lanePos: x, y, heading.
    probe: new Float64Array(3),
  };
}

/* Extend the centerline ahead of the ego until the window is covered; the ring drops the oldest samples. */
function ensureWindow(sim) {
  const ds = L.sampleDs;
  const n = L.centerSamples;
  const need = Math.floor((sim.s + L.windowAhead) / ds) + 2;
  while (sim.next < need) {
    const i = sim.next;
    const h = sim.tailH + curvature(i * ds) * ds;
    sim.tailX += Math.cos(h) * ds;
    sim.tailY += Math.sin(h) * ds;
    sim.tailH = h;
    const slot = i % n;
    sim.cx[slot] = sim.tailX;
    sim.cy[slot] = sim.tailY;
    sim.ch[slot] = h;
    sim.next = i + 1;
  }
  if (sim.next - n > sim.base) sim.base = sim.next - n;
}

export function sampleAt(sim, s, out) {
  const n = L.centerSamples;
  let f = s / L.sampleDs;
  let i = Math.floor(f);
  const hi = sim.next - 2;
  if (i < sim.base) { i = sim.base; f = i; } else if (i > hi) { i = hi; f = i; }
  const fr = f - i;
  const a = i % n;
  const b = (i + 1) % n;
  out[0] = sim.cx[a] + (sim.cx[b] - sim.cx[a]) * fr;
  out[1] = sim.cy[a] + (sim.cy[b] - sim.cy[a]) * fr;
  out[2] = sim.ch[a] + (sim.ch[b] - sim.ch[a]) * fr;
}

/* World pose of a lane coordinate: the ego lane is the right lane, lat > 0 moves left. */
export function lanePos(sim, s, lat, out) {
  sampleAt(sim, s, out);
  const off = lat - L.laneWidth * 0.5;
  out[0] += -Math.sin(out[2]) * off;
  out[1] += Math.cos(out[2]) * off;
}

function fillPlanS(sim, vCmd) {
  const n = L.planPoints;
  const dtp = L.planHorizon / n;
  for (let k = 0; k <= n; k++) {
    const tk = k * dtp;
    const vk = sim.v + clamp(vCmd - sim.v, -L.brakeMax * tk, L.accelMax * tk);
    sim.planS[k] = sim.s + (sim.v + vk) * 0.5 * tk;
  }
}

function makePlan(sim) {
  const n = L.planPoints;
  const dtp = L.planHorizon / n;
  const p = sim.probe;
  const gap = sim.leadS - sim.s - L.carLen;
  let vCmd = clamp((gap - L.minGap) * L.gapGain, 0, L.cruiseSpeed);
  const bias = L.driftAmp * Math.sin(TWO_PI * sim.s / L.driftLen);
  const seed = sim.scene * 97 + sim.decision * 31;

  // Lateral intent: the imitation drift pulls the plan off the lane center, the policy corrects it over latTau.
  for (let k = 0; k <= n; k++) {
    const tk = k * dtp;
    const decay = Math.exp(-tk / L.latTau);
    sim.planLat[k] = sim.lat * decay + bias * (1 - decay) + (hash01(seed + k) - 0.5) * L.planNoise * (tk / L.planHorizon);
  }

  // The uncorrected plan: does its swept box reach the lead within the horizon?
  fillPlanS(sim, vCmd);
  sim.contactIdx = -1;
  for (let k = 1; k <= n; k++) {
    const leadRear = sim.leadS + sim.leadV * k * dtp - L.carLen * 0.5;
    if (sim.planS[k] + L.carLen * 0.5 >= leadRear) { sim.contactIdx = k; break; }
  }

  if (sim.contactIdx >= 0) {
    lanePos(sim, sim.planS[sim.contactIdx], sim.planLat[sim.contactIdx], p);
    sim.contactX = p[0];
    sim.contactY = p[1];
    sim.contactH = p[2];
    sim.contactP = clamp(1 - (sim.contactIdx * dtp / L.planHorizon) * 0.5, 0.6, 0.97);
    // Brake below the lead speed and re-time the executed plan.
    vCmd = clamp(Math.min(vCmd, sim.leadV - 0.6), 0, L.cruiseSpeed);
    fillPlanS(sim, vCmd);
  } else {
    sim.contactP = clamp(0.04 + 0.3 * (1 - gap / 40), 0.02, 0.4);
  }

  sim.planV = vCmd;
  sim.planAge = 0;
  sim.decision += 1;
  if (sim.decision > L.sceneDecisions) {
    sim.decision = 1;
    sim.scene += 1;
  }

  // World polyline and swept footprint of the executed plan.
  const hw = L.carWidth * 0.5;
  for (let k = 0; k <= n; k++) {
    lanePos(sim, sim.planS[k], sim.planLat[k], p);
    sim.planX[k] = p[0];
    sim.planY[k] = p[1];
    const kn = k < n ? k + 1 : k;
    const kp = k < n ? k : k - 1;
    const dLat = sim.planLat[kn] - sim.planLat[kp];
    const dS = Math.max(sim.planS[kn] - sim.planS[kp], 0.5);
    const h = p[2] + Math.atan2(dLat, dS);
    sim.planH[k] = h;
    const nx = -Math.sin(h) * hw;
    const ny = Math.cos(h) * hw;
    sim.sweep[k * 4] = p[0] + nx;
    sim.sweep[k * 4 + 1] = p[1] + ny;
    sim.sweep[k * 4 + 2] = p[0] - nx;
    sim.sweep[k * 4 + 3] = p[1] - ny;
  }
}

export function stepSim(sim, dt) {
  const p = sim.probe;
  sim.t += dt;

  sim.leadV = Math.max(0, L.leadVBase + L.leadVAmp * Math.sin(TWO_PI * sim.t / L.leadPeriod));
  sim.leadS += sim.leadV * dt;

  ensureWindow(sim);
  sim.planAge += dt;
  if (sim.planAge >= L.decisionDt) makePlan(sim);

  // Execute the current plan: track its lateral target, approach its speed, hard-stop if the gap collapses.
  const dtp = L.planHorizon / L.planPoints;
  const k = Math.min(Math.floor(sim.planAge / dtp), L.planPoints - 1);
  const fr = clamp(sim.planAge / dtp - k, 0, 1);
  const latTarget = sim.planLat[k] + (sim.planLat[k + 1] - sim.planLat[k]) * fr;
  const gapNow = sim.leadS - sim.s - L.carLen;
  const vTarget = gapNow < 1 ? 0 : sim.planV;
  sim.v += clamp(vTarget - sim.v, -L.brakeMax * dt, L.accelMax * dt);
  if (dt > 0) sim.lat += (latTarget - sim.lat) * Math.min(1, dt / L.trackTau);
  sim.s += sim.v * dt;
  ensureWindow(sim);

  lanePos(sim, sim.s, sim.lat, p);
  const dx = p[0] - sim.x;
  const dy = p[1] - sim.y;
  if (dt > 0 && dx * dx + dy * dy > 1e-6) sim.heading = Math.atan2(dy, dx);
  sim.x = p[0];
  sim.y = p[1];
  // The camera follows the road heading, not the ego heading, so lateral corrections do not swing the view.
  sim.camH += (p[2] - sim.camH) * L.camSmooth;

  lanePos(sim, sim.leadS, 0, p);
  sim.leadX = p[0];
  sim.leadY = p[1];
  sim.leadH = p[2];

  sim.trailAcc += dt;
  if (sim.trailAcc >= L.trailDt) {
    sim.trailAcc = 0;
    sim.trailX[sim.trailHead] = sim.x;
    sim.trailY[sim.trailHead] = sim.y;
    sim.trailHead = (sim.trailHead + 1) % L.trailPoints;
    if (sim.trailCount < L.trailPoints) sim.trailCount += 1;
  }
}
