import * as THREE from 'three';
import {
  CAMERA_Z,
  CAMERA_FOV_ABS,
  VIEW_SHIFT_X,
  VIEW_SHIFT_Y,
  SPIKE_SIZE,
  SPIKE_HANDLE_SCALE,
  SPIKE_HANDLE_MIN_SIZE,
  SPIKE_INIT_SPEED,
  SPIKE_BOUNCE_RESTITUTION,
  SPIKE_BOUNCE_JITTER,
  SPIKE_FREE_DAMPING,
  SPIKE_MIN_SPEED,
  SPIKE_BOUNDS,
  SPIKE_Z_RANGE,
  SPIKE_THROW_GAIN,
  SPIKE_RELEASE_MIN_SPEED,
  DROP_RADII,
  ABOUT_CUBE_POS_DESKTOP,
  ABOUT_CUBE_POS_MOBILE,
  ABOUT_CUBE_SCALE,
  ABOUT_IDLE_SPIN,
  ABOUT_DRAG_SLERP,
  ABOUT_IDLE_SLERP,
  TRANSITION_START,
  TRANSITION_END,
  TRANSITION_DAMPING_DESKTOP,
  TRANSITION_DAMPING_MOBILE,
  TRANSITION_FOLLOW_SPEED,
  VIDEO_FADE_START,
  VIDEO_FADE_END,
  CUBE_FADEOUT_START,
  CUBE_FADEOUT_END,
  OMEGA_CUBE_POS_DESKTOP,
  OMEGA_CUBE_POS_MOBILE,
  OMEGA_CUBE_SCALE,
  OMEGA_MORPH_START,
  OMEGA_MORPH_END,
  OMEGA_BG_FADE_START,
  OMEGA_BG_FADE_END,
  OMEGA_FADEOUT_START,
  OMEGA_FADEOUT_END,
} from '../config/waveLook';

// ══════════════════════════════════════════════════════════════
// 统一物理引擎
// 负责: 弹球立方体、液滴、Hero→About 过渡
// 纯数学函数 + 状态工厂，不依赖 React 或 DOM
// ══════════════════════════════════════════════════════════════

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ── Arcball 投影 ──
const _arcStart = new THREE.Vector3();
const _arcCurrent = new THREE.Vector3();
const _arcAxis = new THREE.Vector3();
const _deltaQuat = new THREE.Quaternion();

export function projectToArcball(rect, clientX, clientY, target) {
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  const lenSq = x * x + y * y;
  if (lenSq <= 0.5) {
    target.set(x, y, Math.sqrt(1 - lenSq));
    return target;
  }
  const s = 0.5 / Math.sqrt(lenSq);
  target.set(x * s, y * s, s);
  return target.normalize();
}

// ── 三颗液滴的轨道函数 ──
// 设计原则：三体星球式轨迹，大部分时间各飞各的，偶尔擦边。
// 每颗液滴有独立的轨道中心偏移、多层螺旋叠加＋随机扰动，
// 使得它们在大部分时间都处于画布的不同区域。

export function setOrbitA(time, target) {
  return target.set(
    Math.sin(time * 0.17) * 1.3 + Math.sin(time * 0.41 + 1.0) * 0.4 + Math.sin(time * 0.73 + 2.7) * 0.15,
    Math.cos(time * 0.13) * 0.9 + Math.sin(time * 0.37 + 2.0) * 0.3 + Math.cos(time * 0.67 + 4.1) * 0.12,
    Math.sin(time * 0.23 + 0.7) * 0.5 + Math.cos(time * 0.53 + 1.3) * 0.2,
  );
}

export function setOrbitB(time, target) {
  return target.set(
    Math.cos(time * 0.19 + 2.1) * 1.5 + Math.sin(time * 0.31 + 3.5) * 0.35 + Math.cos(time * 0.61 + 5.2) * 0.18,
    Math.sin(time * 0.15 + 1.4) * 1.0 + Math.cos(time * 0.43 + 0.3) * 0.25 + Math.sin(time * 0.71 + 3.3) * 0.1,
    Math.cos(time * 0.29 + 1.2) * 0.55 + Math.sin(time * 0.59 + 2.8) * 0.15,
  );
}

export function setOrbitC(time, target) {
  return target.set(
    Math.sin(time * 0.21 + 4.3) * 1.4 + Math.cos(time * 0.13 + 0.8) * 0.45 + Math.sin(time * 0.79 + 1.6) * 0.2,
    Math.cos(time * 0.23 + 3.0) * 0.8 + Math.sin(time * 0.47 + 1.7) * 0.3 + Math.cos(time * 0.83 + 5.5) * 0.15,
    Math.cos(time * 0.17 + 2.5) * 0.6 + Math.sin(time * 0.57 + 3.9) * 0.25,
  );
}

export const DROP_ORBITS = [setOrbitA, setOrbitB, setOrbitC];

// ── 液滴对排斥 ──
// 当两颗球交融到一定比例后产生斥力。
// 它既作为硬碰撞（防止完全重合），也提供了柔韧的推开感。
export function applyPairRepulsion(a, b, radiusA, radiusB, scratch) {
  scratch.subVectors(a, b);
  const distance = Math.max(scratch.length(), 0.001);
  // 阈值定义：球体半径之和的一定比例。
  // 约 0.85 * 接触距离。这意味着它们可以有 15% 的显著交融，
  // 但在此之后斥力会迅速介入。之前比例是 0.5 太小了（即要交融 50% 才排斥）。
  const thresholdScale = 0.85; 
  const targetDistance = (radiusA + radiusB) * thresholdScale;
  
  const overlap = Math.max(targetDistance - distance, 0);
  if (!overlap) return;

  // 这里的归一化距离用于控制非线性斥力的强度。
  const closeness = clamp(overlap / targetDistance, 0, 1);
  
  // 非线性斥力：越接近，推开的加速度/力度增长越快（立方增长）。
  // 让它们在边缘时很软（满意交融感），在核心处很硬（推开）。
  const response = 0.65 + 3.2 * closeness * closeness * closeness;
  
  const moveAmount = (overlap * response * 0.5) / distance;
  scratch.multiplyScalar(moveAmount);
  
  a.add(scratch);
  b.sub(scratch);
}

// ── 坐标转换 ──
/** 屏幕客户端坐标 → 世界坐标 */
export function clientToWorld(clientX, clientY, depth, rect, target) {
  const minDim = Math.min(rect.width, rect.height);
  const rawX = (clientX - rect.left - rect.width * 0.5) / minDim;
  const rawY = (rect.height * 0.5 - (clientY - rect.top)) / minDim;
  const shiftedX = rawX + VIEW_SHIFT_X;
  const shiftedY = rawY + VIEW_SHIFT_Y;
  const planeDepth = CAMERA_Z - depth;
  return target.set(
    (shiftedX * planeDepth) / CAMERA_FOV_ABS,
    (shiftedY * planeDepth) / CAMERA_FOV_ABS,
    depth,
  );
}

/** 世界坐标 → 容器内局部屏幕像素坐标 */
export function worldToLocalScreen(position, rect, target) {
  const minDim = Math.min(rect.width, rect.height);
  const planeDepth = CAMERA_Z - position.z;
  const shiftedX = (position.x * CAMERA_FOV_ABS) / planeDepth;
  const shiftedY = (position.y * CAMERA_FOV_ABS) / planeDepth;
  const rawX = shiftedX - VIEW_SHIFT_X;
  const rawY = shiftedY - VIEW_SHIFT_Y;
  return target.set(
    rect.width * 0.5 + rawX * minDim,
    rect.height * 0.5 - rawY * minDim,
  );
}

/** 获取 spike（立方体）在屏幕上的可交互区域大小 */
export function getSpikeHandleSize(rect, depth) {
  const minDim = Math.min(rect.width, rect.height);
  return Math.max(
    ((SPIKE_SIZE * CAMERA_FOV_ABS) / (CAMERA_Z - depth)) * minDim * SPIKE_HANDLE_SCALE,
    SPIKE_HANDLE_MIN_SIZE,
  );
}

// ══════════════════════════════════════════════════════════════
// 弹球立方体物理
// ══════════════════════════════════════════════════════════════

/**
 * 给立方体一个随机方向的初速度
 */
function randomDirection() {
  const angle = Math.random() * Math.PI * 2;
  return new THREE.Vector3(
    Math.cos(angle) * SPIKE_INIT_SPEED,
    Math.sin(angle) * SPIKE_INIT_SPEED,
    0,
  );
}

/**
 * 创建弹球立方体初始状态
 */
export function createSpikeState() {
  const initVel = randomDirection();
  return {
    position: new THREE.Vector3(0, 0, 0.38),
    velocity: initVel,
    // 拖拽中
    dragging: false,
    pointerId: null,
    captureTarget: null,
    dragOffset: new THREE.Vector3(),
    dragVelocity: new THREE.Vector2(),
    lastDragAt: 0,
    // 当前阶段：'hero' | 'transition' | 'about'
    phase: 'hero',
    // Hero 阶段的最后位置（用于过渡起始点）
    heroFreezePos: new THREE.Vector3(),
    // 过渡目标位置（实际位置通过弹簧追随此目标）
    transitionTarget: new THREE.Vector3(),
    // About 阶段 arcball 旋转
    targetRotation: new THREE.Quaternion(),
    currentRotation: new THREE.Quaternion(),
    // About arcball 交互
    arcballDragging: false,
    arcballPointerId: null,
  };
}

/**
 * 弹球反弹物理 tick
 * @param {Object} spike - 立方体状态
 * @param {number} dt - 时间步长（秒）
 */
export function tickSpikeBounce(spike, dt) {
  if (spike.phase !== 'hero' || spike.dragging) return;

  // 阻尼
  const decay = Math.exp(-dt * SPIKE_FREE_DAMPING);
  spike.velocity.x *= decay;
  spike.velocity.y *= decay;

  // 速度低于阈值时重新加速
  const speed = Math.sqrt(spike.velocity.x * spike.velocity.x + spike.velocity.y * spike.velocity.y);
  if (speed < SPIKE_MIN_SPEED && speed > 0.001) {
    const boost = SPIKE_INIT_SPEED / speed;
    spike.velocity.x *= boost;
    spike.velocity.y *= boost;
  }

  // 移动
  spike.position.x += spike.velocity.x * dt;
  spike.position.y += spike.velocity.y * dt;

  // Z 轴缓慢漂移（装饰性）
  spike.position.z += Math.sin(performance.now() * 0.0003) * 0.001;
  spike.position.z = clamp(spike.position.z, SPIKE_Z_RANGE[0], SPIKE_Z_RANGE[1]);

  // 边界反弹
  const [left, right, bottom, top] = SPIKE_BOUNDS;
  if (spike.position.x < left) {
    spike.position.x = left;
    spike.velocity.x = Math.abs(spike.velocity.x) * SPIKE_BOUNCE_RESTITUTION;
    applyBounceJitter(spike.velocity);
  } else if (spike.position.x > right) {
    spike.position.x = right;
    spike.velocity.x = -Math.abs(spike.velocity.x) * SPIKE_BOUNCE_RESTITUTION;
    applyBounceJitter(spike.velocity);
  }
  if (spike.position.y < bottom) {
    spike.position.y = bottom;
    spike.velocity.y = Math.abs(spike.velocity.y) * SPIKE_BOUNCE_RESTITUTION;
    applyBounceJitter(spike.velocity);
  } else if (spike.position.y > top) {
    spike.position.y = top;
    spike.velocity.y = -Math.abs(spike.velocity.y) * SPIKE_BOUNCE_RESTITUTION;
    applyBounceJitter(spike.velocity);
  }
}

function applyBounceJitter(velocity) {
  const angle = (Math.random() - 0.5) * 2 * SPIKE_BOUNCE_JITTER;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const vx = velocity.x * cos - velocity.y * sin;
  const vy = velocity.x * sin + velocity.y * cos;
  velocity.x = vx;
  velocity.y = vy;
}

/**
 * 释放弹球拖拽 — 给予随机方向初速度
 */
export function releaseSpikeDrag(spike) {
  if (!spike.dragging) return;

  // 释放 pointer capture
  if (spike.captureTarget?.hasPointerCapture?.(spike.pointerId)) {
    spike.captureTarget.releasePointerCapture(spike.pointerId);
  }

  // 基于拖拽速度 + 保底速度的抛出
  let throwSpeed = Math.sqrt(
    spike.dragVelocity.x * spike.dragVelocity.x +
    spike.dragVelocity.y * spike.dragVelocity.y,
  ) * SPIKE_THROW_GAIN;
  throwSpeed = Math.max(throwSpeed, SPIKE_RELEASE_MIN_SPEED);

  // 方向 = 拖拽方向，或者随机方向（如果几乎没动）
  if (spike.dragVelocity.lengthSq() > 0.01) {
    const angle = Math.atan2(spike.dragVelocity.y, spike.dragVelocity.x);
    spike.velocity.x = Math.cos(angle) * throwSpeed;
    spike.velocity.y = Math.sin(angle) * throwSpeed;
  } else {
    const angle = Math.random() * Math.PI * 2;
    spike.velocity.x = Math.cos(angle) * throwSpeed;
    spike.velocity.y = Math.sin(angle) * throwSpeed;
  }
  spike.velocity.z = 0;

  spike.dragging = false;
  spike.pointerId = null;
  spike.captureTarget = null;
  spike.dragVelocity.set(0, 0);
}

// ══════════════════════════════════════════════════════════════
// Hero→About 过渡
// ══════════════════════════════════════════════════════════════

const _aboutTargetPos = new THREE.Vector3();
const _idleSpinEuler = new THREE.Euler();
const _idleSpinQuat = new THREE.Quaternion();
const _rotMat4 = new THREE.Matrix4();

/**
 * 棉花球式软弹跳缓动
 * 模拟软体物质被推动 — 缓慢启动，柔和减速，带微弱的弹性过冲然后沉降。
 * damping 控制弹跳衰减速度（越大弹性越小），越小弹性越明显。
 *   默认 damping=5.0 — 非常软的弹性，几乎看不到回弹
 *   damping=3.0 — 轻微可见的弹性
 *   damping=8.0 — 几乎没有弹性（接近纯缓动）
 * overshoot 控制过冲幅度。
 *   默认 0.012 — 极微弱的过冲，像棉花球轻轻晃一下
 *   0.03 — 明显可见的弹性感
 */
function easeSoftBounce(t, damping) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  // ease-out cubic 作为主体曲线
  const base = 1 - Math.pow(1 - t, 3);
  // 叠加衰减正弦波 — 软体弹性震荡
  const overshoot = 0.012;
  const freq = 2.2; // 震荡频率（圈数）
  const bounce = Math.sin(t * Math.PI * freq) * overshoot * Math.exp(-t * damping);
  return base + bounce;
}

/**
 * 计算滚动过渡进度
 * @param {number} scrollProgress 0=Hero完全可见, 1=About完全可见
 * @param {boolean} isMobile
 * @param {number} aboutExitProgress 0=About底部还在视口内, 1=About底部完全离开视口
 * @param {number} productScrollProgress 0=product section不可见, 1=product section完全可见
 * @param {number} productExitProgress 0=product section底部在视口内, 1=product section完全离开
 * @returns {{ phase, t, cubeScale, videoMix, aboutPos, omegaPos, cubeFade, morphFactor, bgAlpha }}
 */
export function computeTransition(
  scrollProgress,
  isMobile,
  aboutExitProgress = 0,
  productScrollProgress = 0,
  productExitProgress = 0,
) {
  const aboutPos = isMobile ? ABOUT_CUBE_POS_MOBILE : ABOUT_CUBE_POS_DESKTOP;
  const omegaPos = isMobile ? OMEGA_CUBE_POS_MOBILE : OMEGA_CUBE_POS_DESKTOP;
  const damping = isMobile ? TRANSITION_DAMPING_MOBILE : TRANSITION_DAMPING_DESKTOP;

  // ── Omega 变形进度（基于 aboutExitProgress）──
  const morphFactor = clamp(
    (aboutExitProgress - OMEGA_MORPH_START) / (OMEGA_MORPH_END - OMEGA_MORPH_START),
    0, 1,
  );

  // ── 液态金背景淡出进度 ──
  const bgAlpha = 1 - clamp(
    (aboutExitProgress - OMEGA_BG_FADE_START) / (OMEGA_BG_FADE_END - OMEGA_BG_FADE_START),
    0, 1,
  );

  // ── Hero 阶段 ──
  if (scrollProgress < TRANSITION_START) {
    return {
      phase: 'hero', t: 0, cubeScale: 1.0, videoMix: 0,
      aboutPos, omegaPos, cubeFade: 1, morphFactor: 0, bgAlpha: 0,
    };
  }

  // ── Omega 阶段（变形完成，四面体 arcball）──
  if (morphFactor >= 1.0) {
    const omegaFade = 1 - clamp(
      (productExitProgress - OMEGA_FADEOUT_START) / (OMEGA_FADEOUT_END - OMEGA_FADEOUT_START),
      0, 1,
    );
    if (omegaFade <= 0) {
      return {
        phase: 'hidden', t: 1, cubeScale: OMEGA_CUBE_SCALE, videoMix: 1,
        aboutPos, omegaPos, cubeFade: 0, morphFactor: 1, bgAlpha: 0,
      };
    }
    return {
      phase: 'omega', t: 1, cubeScale: OMEGA_CUBE_SCALE, videoMix: 1,
      aboutPos, omegaPos, cubeFade: omegaFade, morphFactor: 1, bgAlpha: 0,
    };
  }

  // ── Omega-morph 阶段（正在从立方体变形为四面体）──
  if (morphFactor > 0) {
    return {
      phase: 'omega-morph', t: 1,
      cubeScale: lerp(ABOUT_CUBE_SCALE, OMEGA_CUBE_SCALE, morphFactor),
      videoMix: 1,
      aboutPos, omegaPos, cubeFade: 1, morphFactor, bgAlpha,
    };
  }

  // ── 旧式立方体淡出（About 退场但 Omega 尚未开始，理论上不应触发）──
  const cubeFade = 1 - clamp(
    (aboutExitProgress - CUBE_FADEOUT_START) / (CUBE_FADEOUT_END - CUBE_FADEOUT_START),
    0, 1,
  );

  if (cubeFade <= 0) {
    return {
      phase: 'hidden', t: 1, cubeScale: ABOUT_CUBE_SCALE, videoMix: 1,
      aboutPos, omegaPos, cubeFade: 0, morphFactor: 0, bgAlpha: 1,
    };
  }

  if (scrollProgress > TRANSITION_END) {
    return {
      phase: 'about', t: 1, cubeScale: ABOUT_CUBE_SCALE,
      videoMix: clamp(
        (scrollProgress - VIDEO_FADE_START) / (VIDEO_FADE_END - VIDEO_FADE_START), 0, 1,
      ),
      aboutPos, omegaPos, cubeFade, morphFactor: 0, bgAlpha: 1,
    };
  }

  // ── 过渡阶段（立方体从 Hero 位置移向 About 位置）──
  const rawT = clamp(
    (scrollProgress - TRANSITION_START) / (TRANSITION_END - TRANSITION_START), 0, 1,
  );
  const t = easeSoftBounce(rawT, damping);
  const cubeScale = lerp(1.0, ABOUT_CUBE_SCALE, t);
  const videoMix = clamp(
    (scrollProgress - VIDEO_FADE_START) / (VIDEO_FADE_END - VIDEO_FADE_START), 0, 1,
  );
  return { phase: 'transition', t, cubeScale, videoMix, aboutPos, omegaPos, cubeFade, morphFactor: 0, bgAlpha: 1 };
}

/**
 * 计算立方体/四面体的理想目标位置（不直接移动立方体）
 * 实际移动由 smoothFollowSpike 在每帧中完成
 */
export function applySpikeTransition(spike, transition) {
  if (transition.phase === 'hero') {
    spike.phase = 'hero';
    return;
  }

  if (transition.phase === 'hidden') {
    spike.phase = 'hidden';
    spike.dragging = false;
    if (spike.arcballDragging) {
      spike.arcballDragging = false;
      spike.arcballPointerId = null;
    }
    return;
  }

  // 刚进入过渡时，记录 Hero 阶段最后位置
  if (spike.phase === 'hero') {
    spike.heroFreezePos.copy(spike.position);
    spike.transitionTarget.copy(spike.position);
    // 停止弹球拖拽
    if (spike.dragging) releaseSpikeDrag(spike);
    spike.phase = 'transition';
  }

  if (transition.phase === 'transition') {
    spike.phase = 'transition';
    // 计算目标位置（不直接设置 position）
    spike.transitionTarget.lerpVectors(spike.heroFreezePos, transition.aboutPos, transition.t);
    spike.dragging = false;
  } else if (transition.phase === 'omega-morph') {
    // 从 About 位置向 Omega 位置平滑移动，与变形同步
    if (spike.phase === 'about' || spike.phase === 'transition') {
      // 刚进入 omega-morph，停止 arcball
      if (spike.arcballDragging) {
        spike.arcballDragging = false;
        spike.arcballPointerId = null;
      }
    }
    spike.phase = 'omega-morph';
    spike.transitionTarget.lerpVectors(transition.aboutPos, transition.omegaPos, transition.morphFactor);
    spike.dragging = false;
  } else if (transition.phase === 'omega') {
    spike.phase = 'omega';
    spike.transitionTarget.copy(transition.omegaPos);
    spike.dragging = false;
  } else {
    // About 阶段
    spike.phase = 'about';
    spike.transitionTarget.copy(transition.aboutPos);
    spike.dragging = false;
  }
}

/**
 * 每帧平滑追随目标位置 — 立方体以自己的节奏缓动到位
 * 像棉花球被软推过去，而不是瞬间跳到位
 * @param {Object} spike - 立方体状态
 * @param {number} dt - 时间步长（秒）
 */
export function smoothFollowSpike(spike, dt) {
  if (spike.phase !== 'transition' && spike.phase !== 'about'
      && spike.phase !== 'omega-morph' && spike.phase !== 'omega') return;
  // 指数衰减追随 — TRANSITION_FOLLOW_SPEED 越大追随越快
  const followFactor = 1 - Math.exp(-TRANSITION_FOLLOW_SPEED * dt);
  spike.position.lerp(spike.transitionTarget, followFactor);
}

/**
 * About 阶段 arcball 旋转 tick
 */
export function tickAboutRotation(spike, dt) {
  if (spike.phase !== 'about' && spike.phase !== 'transition'
      && spike.phase !== 'omega' && spike.phase !== 'omega-morph') return;

  // 空闲自转
  _idleSpinEuler.set(
    ABOUT_IDLE_SPIN[0] * dt,
    ABOUT_IDLE_SPIN[1] * dt,
    ABOUT_IDLE_SPIN[2] * dt,
  );
  _idleSpinQuat.setFromEuler(_idleSpinEuler);

  if (!spike.arcballDragging) {
    spike.targetRotation.multiply(_idleSpinQuat);
  }

  const slerpFactor = spike.arcballDragging ? ABOUT_DRAG_SLERP : ABOUT_IDLE_SLERP;
  spike.currentRotation.slerp(spike.targetRotation, slerpFactor);
}

/**
 * 获取旋转矩阵（用于 shader uniform）
 */
export function getSpikeRotationMatrix3(spike, target) {
  _rotMat4.makeRotationFromQuaternion(spike.currentRotation);
  target.setFromMatrix4(_rotMat4);
  return target;
}

// ── About 阶段 Arcball 交互事件处理 ──
export function onAboutArcballDown(spike, rect, clientX, clientY) {
  if (spike.phase !== 'about' && spike.phase !== 'omega') return false;
  spike.arcballDragging = true;
  projectToArcball(rect, clientX, clientY, _arcStart);
  return true;
}

export function onAboutArcballMove(spike, rect, clientX, clientY) {
  if (!spike.arcballDragging) return;
  projectToArcball(rect, clientX, clientY, _arcCurrent);
  _arcAxis.crossVectors(_arcStart, _arcCurrent);
  if (_arcAxis.lengthSq() > 1e-7) {
    const angle = Math.acos(THREE.MathUtils.clamp(_arcStart.dot(_arcCurrent), -1, 1));
    _deltaQuat.setFromAxisAngle(_arcAxis.normalize(), angle * 1.25);
    spike.targetRotation.premultiply(_deltaQuat);
    _arcStart.copy(_arcCurrent);
  }
}

export function onAboutArcballUp(spike) {
  spike.arcballDragging = false;
  spike.arcballPointerId = null;
}

// ── 液滴状态工厂 ──
export function createDropStates() {
  return DROP_RADII.map((radius, index) => {
    const position = DROP_ORBITS[index](0, new THREE.Vector3());
    return {
      radius,
      mass: 1 + radius * 1.6,
      orbit: DROP_ORBITS[index],
      base: position.clone(),
      position,
      previousPosition: position.clone(),
      velocity: new THREE.Vector3(),
      renderVelocity: new THREE.Vector3(),
    };
  });
}

// Re-export constants used by the renderer
export { DROP_RADII };
