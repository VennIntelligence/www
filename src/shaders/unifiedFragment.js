// ═══════════════════════════════════════════════════════════════
// 统一片段着色器
// 合并 waveFragment.js（液滴 + 玻璃立方体）
//      + glassCubeFragment.js（视频纹理环境映射）
//
// 新增 uniform:
//   uPhase      — 0.0=Hero阶段（液滴+弹球方块）, 1.0=About阶段
//   uCubeScale  — 方块 SDF 半径缩放（Hero→About 放大）
//   uVideoMix   — 视频纹理混合度（0→1 渐显）
//   uCameraTex  — 预录视频纹理
//   uCameraActive — 视频是否激活
//   uCameraAspect — 视频宽高比
//
// 注意：此字符串前面需要由 unifiedShaderBuilder 拼接 #define
// ═══════════════════════════════════════════════════════════════
export const fragmentShaderBody = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform float uPointerEnergy;
uniform float uScrollEnergy;
uniform vec3  uDropA;
uniform vec3  uDropB;
uniform vec3  uDropC;
uniform vec3  uDropVelA;
uniform vec3  uDropVelB;
uniform vec3  uDropVelC;
uniform vec3  uSpikePos;
uniform mat3  uSpikeRot;

// ── 统一过渡 uniform ──
uniform float uPhase;        // 0=Hero, 1=About
uniform float uCubeScale;    // 方块 SDF 半边长（Hero=0.3, About 约 0.55）
uniform float uVideoMix;     // 视频纹理混合度
uniform float uCubeFade;     // 立方体整体淡出（0=完全透明, 1=完全可见）

// ── 视频纹理 ──
uniform sampler2D uCameraTex;
uniform float uCameraActive;
uniform float uCameraAspect;

#define MAX_DIST  16.0
#define PI 3.14159265

/* ═══════════════════════════════════════════════════════════
   🎛️  可调参数
   ═══════════════════════════════════════════════════════════ */

// --- 液滴形变 ---
#define VEL_STRETCH  0.05

// --- 液滴表面颤动 ---
#define WOBBLE_BASE    0.01
#define WOBBLE_SCROLL  0.1
#define WOBBLE_POINTER 0.2

// --- 液滴交融 ---
#define BLEND_K      0.39
#define RIPPLE_FREQ  1.0
#define RIPPLE_AMP   0.025
#define RIPPLE_SPEED 1.0

// --- 液滴斥力 ---
#define REPEL_PAD    0.5
#define REPEL_MARGIN 0.03
#define REPEL_NEAR_BOOST 1.15

// --- 立方体 ---
#define SPIKE_SIZE   0.3
#define SPIKE_ROUND  0.01

// --- spike 在液面上的形变 ---
#define SPIKE_DEFORM 0.22
#define SPIKE_DEFORM_FALL 0.8
#define WAKE_FREQ    1.0
#define WAKE_AMP     0.0
#define WAKE_FALL    1.5

// --- 相机 ---
#define CAM_Z        12
#define CAM_FOV     -3.9

/* ═══════════════════════════════════════════════════════════ */

/* ── Globals ── */
vec3 gDropA, gDropB, gDropC;
vec3 gVelA, gVelB, gVelC;
#ifdef SPIKE_ENABLED
vec3  gSpikePos;
mat3  gSpikeRot;
float gSpikeActive;
float gCubeScale;
#endif

/* ── Smooth min ── */
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

/* ── Rotation helpers ── */
mat3 rotY(float a) {
  float s = sin(a), c = cos(a);
  return mat3(c,0,-s, 0,1,0, s,0,c);
}
mat3 rotZ(float a) {
  float s = sin(a), c = cos(a);
  return mat3(c,-s,0, s,c,0, 0,0,1);
}

/* ── Cube SDF — 使用 gCubeScale 作为半边长 ── */
#ifdef SPIKE_ENABLED
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
#endif

/* ── Wobble ── */
float getWobble() {
  return WOBBLE_BASE + uScrollEnergy * WOBBLE_SCROLL + uPointerEnergy * WOBBLE_POINTER;
}

/* ── Velocity-based ellipsoidal SDF for a single drop ── */
float sdVelDrop(vec3 p, vec3 center, float radius, vec3 vel) {
  vec3 d = p - center;
  float speed = length(vel);
  float stretchAmt = 1.0 + speed * VEL_STRETCH;
  if (speed > 0.001) {
    vec3 vn = vel / speed;
    float proj = dot(d, vn);
    d = d - vn * proj * (1.0 - 1.0/stretchAmt);
  }
  return length(d) - radius;
}

float getSurfaceDeform(vec3 p) {
  float wobble = getWobble();
  float t = uTime;

  #ifdef QUALITY_HIGH
  float da = 0.03 + wobble;
  float deform = sin(p.x*1.5+t*0.3)*sin(p.y*1.8+t*0.25)*da
               + sin(p.z*2.0+p.x*1.2+t*0.4)*da*0.4;
  #elif defined(QUALITY_MEDIUM)
  float da = 0.025 + wobble;
  float deform = sin(p.x*1.5+t*0.3)*sin(p.y*1.8+t*0.25)*da;
  #else
  float deform = 0.0;
  #endif

  #ifdef SPIKE_ENABLED
  if (gSpikeActive > 0.5) {
    float spikeDist = length(p - gSpikePos);
    deform -= exp(-spikeDist * SPIKE_DEFORM_FALL) * SPIKE_DEFORM;
    float wake = sin(spikeDist * WAKE_FREQ - t * 4.0) * exp(-spikeDist * WAKE_FALL) * WAKE_AMP;
    deform += wake;
  }
  #endif

  return deform;
}

float mapDrops(vec3 p, float deform) {
  // About 阶段不渲染液滴 SDF（液滴在物理层被边界推挤到视口外）
  if (uPhase > 0.95) return 1e5;

  float t = uTime;
  float dropA = sdVelDrop(p, gDropA, 0.85, gVelA) + deform;
  float dropB = sdVelDrop(p, gDropB, 0.58, gVelB) + deform;
  float dropC = sdVelDrop(p, gDropC, 0.40, gVelC) + deform;

  #ifndef QUALITY_LOW
  float abDist = length(gDropA - gDropB);
  float abProximity = smoothstep(2.5, 0.8, abDist);
  float rippleAB = sin(length(p - (gDropA+gDropB)*0.5)*RIPPLE_FREQ - t*RIPPLE_SPEED) * RIPPLE_AMP * abProximity;

  float acDist = length(gDropA - gDropC);
  float acProximity = smoothstep(2.0, 0.6, acDist);
  float rippleAC = sin(length(p - (gDropA+gDropC)*0.5)*(RIPPLE_FREQ+2.0) - t*(RIPPLE_SPEED-0.5)) * (RIPPLE_AMP*0.8) * acProximity;

  float bcDist = length(gDropB - gDropC);
  float bcProximity = smoothstep(1.8, 0.5, bcDist);
  float rippleBC = sin(length(p - (gDropB+gDropC)*0.5)*(RIPPLE_FREQ+4.0) - t*(RIPPLE_SPEED+0.5)) * (RIPPLE_AMP*0.72) * bcProximity;
  #else
  float rippleAB = 0.0, rippleAC = 0.0, rippleBC = 0.0;
  #endif

  float d = smin(dropA + rippleAB, dropB + rippleAB, BLEND_K);
  d = smin(d + rippleAC + rippleBC, dropC + rippleAC + rippleBC, BLEND_K);

  return d;
}

float mapSpike(vec3 p) {
  float spikeD = 1e5;
  #ifdef SPIKE_ENABLED
  if (gSpikeActive > 0.5) {
    vec3 sp = gSpikeRot * (p - gSpikePos);
    spikeD = sdRoundBox(sp, vec3(gCubeScale), SPIKE_ROUND);
  }
  #endif
  return spikeD;
}

/* ── Scene SDF (drops only) ── */
float mapDropsOnly(vec3 p) {
  float deform = getSurfaceDeform(p);
  return mapDrops(p, deform);
}

void getSceneDistances(vec3 p, out float dropD, out float spikeD) {
  float deform = getSurfaceDeform(p);
  dropD = mapDrops(p, deform);
  spikeD = mapSpike(p);
}

/* ── Scene SDF ── */
#ifdef SPIKE_MATERIAL_GLASS
float map(vec3 p) {
  return mapDropsOnly(p);
}
#else
float map(vec3 p) {
  float dropD;
  float spikeD;
  getSceneDistances(p, dropD, spikeD);
  return min(dropD, spikeD);
}
#endif

/* ── Normal ── */
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(NORMAL_EPS, -NORMAL_EPS);
  return normalize(
    e.xyy * map(p + e.xyy) +
    e.yyx * map(p + e.yyx) +
    e.yxy * map(p + e.yxy) +
    e.xxx * map(p + e.xxx)
  );
}

#ifdef SPIKE_MATERIAL_GLASS
vec3 calcSpikeNormal(vec3 p) {
  vec2 e = vec2(NORMAL_EPS, -NORMAL_EPS);
  return normalize(
    e.xyy * mapSpike(p + e.xyy) +
    e.yyx * mapSpike(p + e.yyx) +
    e.yxy * mapSpike(p + e.yxy) +
    e.xxx * mapSpike(p + e.xxx)
  );
}
#endif

/* ── Raymarching ── */
float rayMarch(vec3 ro, vec3 rd) {
  float d = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    float ds = map(ro + rd * d);
    d += ds;
    if (ds < SURF_DIST || d > MAX_DIST) break;
  }
  return d;
}

#ifdef SPIKE_MATERIAL_GLASS
float rayMarchInsideSpike(vec3 ro, vec3 rd) {
  float d = 0.0;
  for (int i = 0; i < GLASS_INTERIOR_STEPS; i++) {
    float ds = -mapSpike(ro + rd * d);
    d += max(ds, SURF_DIST * 0.5);
    if (ds < SURF_DIST || d > 4.0) break;
  }
  return d;
}

float rayMarchSpike(vec3 ro, vec3 rd) {
  float d = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    float ds = mapSpike(ro + rd * d);
    d += ds;
    if (ds < SURF_DIST || d > MAX_DIST) break;
  }
  return d;
}
#endif

/* ── Environment Lighting ── */
vec3 animateDir(vec3 dir, float seed) {
  float t = uTime * ENV_DRIFT_SPEED + seed;
  vec3 drift = vec3(
    sin(t * 0.91) * ENV_DRIFT_X_AMP,
    cos(t * 0.63) * ENV_DRIFT_Y_AMP,
    sin(t * 0.58 + seed * 1.4) * ENV_DRIFT_Z_AMP
  );
  return normalize(dir + drift);
}

float softBox(vec3 rd, vec3 dir, vec2 size, float focus) {
  vec3 z = normalize(dir);
  vec3 up = abs(z.y) > 0.96 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 x = normalize(cross(up, z));
  vec3 y = normalize(cross(z, x));
  vec2 q = vec2(dot(rd, x), dot(rd, y));
  float shape = exp(-(q.x*q.x)/(size.x*size.x) - (q.y*q.y)/(size.y*size.y));
  float facing = pow(max(dot(rd, z), 0.0), focus);
  return shape * facing;
}

vec3 envMap(vec3 rd) {
  float t = uTime;
  vec3 col = vec3(0.003, 0.004, 0.01);

  vec3 keyDir = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
  float kd = max(dot(rd, keyDir), 0.0);
  col += vec3(1.0, 0.99, 0.97) * (pow(kd, 6.0) * ENV_KEY_SOFT_GAIN + pow(kd, 200.0) * ENV_KEY_HARD_GAIN);

  vec3 fillDir = animateDir(vec3(-0.9, 0.3, -0.4), 1.7);
  float fd = max(dot(rd, fillDir), 0.0);
  col += vec3(0.65, 0.78, 1.0) * (pow(fd, 4.0) * ENV_FILL_SOFT_GAIN + pow(fd, 120.0) * ENV_FILL_HARD_GAIN);

  vec3 rimDir = animateDir(vec3(-0.3, -0.7, -0.9), 3.2);
  float rmd = max(dot(rd, rimDir), 0.0);
  col += vec3(0.55, 0.72, 1.0) * (pow(rmd, 7.0) * ENV_RIM_SOFT_GAIN + pow(rmd, 280.0) * ENV_RIM_HARD_GAIN);

  float topDot = max(rd.y, 0.0);
  col += vec3(0.1, 0.1, 0.12) * pow(topDot, 3.0) * ENV_TOP_LIGHT_GAIN;
  col += vec3(0.02, 0.025, 0.04) * pow(max(-rd.y, 0.0), 2.0) * ENV_BOTTOM_LIGHT_GAIN;

  float bandShiftA = sin(t * ENV_BAND_A_SPEED) * ENV_BAND_A_AMPLITUDE;
  float bandShiftB = cos(t * ENV_BAND_B_SPEED + ENV_BAND_B_PHASE_OFFSET) * ENV_BAND_B_AMPLITUDE;
  float driftX = sin(t * ENV_SWEEP_A_SPEED) * ENV_SWEEP_A_AMPLITUDE;
  float driftX2 = cos(t * ENV_SWEEP_B_SPEED + ENV_SWEEP_B_PHASE_OFFSET) * ENV_SWEEP_B_AMPLITUDE;

  col += vec3(0.95, 0.95, 0.97) * exp(-pow((rd.y-0.15-bandShiftA)*5.0, 2.0)) * ENV_BAND_A_INTENSITY;
  #ifndef QUALITY_LOW
  col += vec3(0.55, 0.65, 0.85) * exp(-pow((rd.y+0.3-bandShiftB)*4.0, 2.0)) * ENV_BAND_B_INTENSITY;
  #endif
  #ifdef QUALITY_HIGH
  col += vec3(0.9, 0.91, 0.93) * exp(-pow((rd.y-0.6+bandShiftA*0.6)*6.0, 2.0)) * 0.09;
  col += vec3(0.88, 0.9, 0.95) * exp(-pow((rd.x-0.1+bandShiftB*0.5)*8.0, 2.0)) * 0.06;
  #endif

  col += vec3(0.72, 0.82, 1.0) * exp(-pow((rd.x - ENV_SWEEP_A_CENTER_X - driftX) * 6.0, 2.0) - pow((rd.y - ENV_SWEEP_A_CENTER_Y) * 3.2, 2.0)) * ENV_SWEEP_A_INTENSITY;
  #ifndef QUALITY_LOW
  col += vec3(0.46, 0.6, 0.88) * exp(-pow((rd.x - ENV_SWEEP_B_CENTER_X + driftX2) * 5.2, 2.0) - pow((rd.y - ENV_SWEEP_B_CENTER_Y) * 2.8, 2.0)) * ENV_SWEEP_B_INTENSITY;
  #endif

  return col;
}

vec3 backgroundGlow(vec3 rd) {
  float focusAngle = uTime * BG_FOCUS_SPEED * PI * 2.0 + BG_FOCUS_PHASE_OFFSET * PI * 2.0;
  vec2 focusCenter = vec2(
    (BG_FOCUS_X_MIN + BG_FOCUS_X_MAX) * 0.5,
    (BG_FOCUS_Y_MIN + BG_FOCUS_Y_MAX) * 0.5
  );
  vec2 focusAmp = vec2(
    abs(BG_FOCUS_X_MAX - BG_FOCUS_X_MIN) * 0.5,
    abs(BG_FOCUS_Y_MAX - BG_FOCUS_Y_MIN) * 0.5
  );
  float focusXPhase = focusAngle
    + sin(focusAngle * 0.37 + 0.8) * 0.32
    + cos(focusAngle * 0.11 + 1.7) * 0.14;
  float focusYPhase = focusAngle * 0.81 + 1.3
    + cos(focusAngle * 0.29 + 2.1) * 0.26;
  float focusX = focusCenter.x + cos(focusXPhase) * focusAmp.x;
  float focusY = focusCenter.y + sin(focusYPhase) * focusAmp.y;
  float focusGainWave = 0.5 + 0.5 * sin(
    focusAngle * 0.92 + 0.4 + sin(focusAngle * 0.18 + 2.6) * 0.35
  );
  float focusGain = mix(BG_FOCUS_GAIN_MIN, BG_FOCUS_GAIN_MAX, focusGainWave);

  float sweepAngle = uTime * BG_SWEEP_SPEED * PI * 2.0 + BG_SWEEP_PHASE_OFFSET * PI * 2.0;
  float sweepCenterX = (BG_SWEEP_X_MIN + BG_SWEEP_X_MAX) * 0.5;
  float sweepAmpX = abs(BG_SWEEP_X_MAX - BG_SWEEP_X_MIN) * 0.5;
  float sweepAmpY = sweepAmpX * 0.16;
  float sweepXPhase = sweepAngle
    + sin(sweepAngle * 0.41 + 2.4) * 0.24
    + cos(sweepAngle * 0.17 + 0.5) * 0.10;
  float sweepYPhase = sweepAngle * 0.63 + 0.9
    + sin(sweepAngle * 0.21 + 1.8) * 0.22;
  float sweepX = sweepCenterX + cos(sweepXPhase) * sweepAmpX;
  float sweepY = BG_SWEEP_Y + sin(sweepYPhase) * sweepAmpY;
  float sweepGainWave = 0.5 + 0.5 * sin(
    sweepAngle * 0.73 + 1.2 + cos(sweepAngle * 0.16 + 0.9) * 0.28
  );
  float sweepGain = mix(BG_SWEEP_GAIN_MIN, BG_SWEEP_GAIN_MAX, sweepGainWave);
  vec3 col = vec3(0.0);
  col += BG_FOCUS_COLOR * exp(-pow((rd.x - focusX) * BG_FOCUS_SCALE_X, 2.0) - pow((rd.y - focusY) * BG_FOCUS_SCALE_Y, 2.0)) * focusGain;
  col += BG_SWEEP_COLOR * exp(-pow((rd.x - sweepX) * BG_SWEEP_SCALE_X, 2.0) - pow((rd.y - sweepY) * BG_SWEEP_SCALE_Y, 2.0)) * sweepGain;
  return col;
}

/* ════════════════════════════════════════════════════
   视频纹理采样工具
   ════════════════════════════════════════════════════ */

vec2 screenToCameraUV(vec2 screenUV) {
  float viewAspect = uResolution.x / uResolution.y;
  vec2 camUV = screenUV;
  camUV.x = 1.0 - camUV.x;
  if (uCameraAspect > viewAspect) {
    float ratio = viewAspect / uCameraAspect;
    camUV.x = camUV.x * ratio + (1.0 - ratio) * 0.5;
  } else {
    float ratio = uCameraAspect / viewAspect;
    camUV.y = camUV.y * ratio + (1.0 - ratio) * 0.5;
  }
  return camUV;
}

vec3 sampleCamera(vec2 screenUV, vec2 offset) {
  vec2 uv = screenToCameraUV(screenUV + offset);
  uv = clamp(uv, 0.0, 1.0);
  return texture2D(uCameraTex, uv).rgb;
}

vec3 sampleCameraReflection(vec2 screenUV, vec3 reflDir) {
  vec2 offset = reflDir.xy * 0.3;
  return sampleCamera(screenUV, offset);
}

/* ── Shading ── */
float specularLobe(vec3 n, vec3 v, vec3 l, float alphaSq) {
  vec3 h = normalize(l + v);
  float NdH = max(dot(n, h), 0.0);
  float NdL = max(dot(n, l), 0.0);
  float denom = PI * pow(NdH*NdH*(alphaSq-1.0)+1.0, 2.0);
  return (alphaSq / max(denom, 0.0001)) * NdL;
}

vec3 shadeDrops(vec3 n, vec3 v, vec3 reflected, float cosTheta) {
  vec3 F0 = vec3(0.972, 0.960, 0.915);
  vec3 fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  vec3 color = reflected * fresnel;

  #ifndef QUALITY_LOW
  vec3 keyL = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
  #ifdef QUALITY_HIGH
  float alphaSq = 0.000004;
  #else
  float alphaSq = 0.00004;
  #endif
  color += vec3(1.0, 0.99, 0.96) * specularLobe(n, v, keyL, alphaSq) * fresnel * 0.5;
  #endif

  color *= mix(0.4, 1.0, smoothstep(0.0, 0.2, cosTheta));
  return color;
}

vec3 shadeMetalSpike(vec3 n, vec3 v, vec3 reflected, float cosTheta) {
  vec3 F0 = vec3(0.982, 0.982, 0.975);
  vec3 fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  vec3 color = reflected * fresnel * SPIKE_METAL_REFLECT_BOOST;

  #ifndef QUALITY_LOW
  vec3 keyL = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
  #ifdef QUALITY_HIGH
  float alphaSq = 0.000002;
  #else
  float alphaSq = 0.00001;
  #endif
  color += vec3(1.0, 0.99, 0.96) * specularLobe(n, v, keyL, alphaSq) * fresnel * SPIKE_METAL_SPEC_BOOST;
  #endif

  color *= mix(SPIKE_METAL_LIFT_MIN, SPIKE_METAL_LIFT_MAX, smoothstep(0.0, 0.2, cosTheta));
  return color;
}

vec3 shadeCrystalSpike(vec3 rd, vec3 n, vec3 v, vec3 reflected, float cosTheta) {
  vec3 refracted = envMap(refract(rd, n, 1.0 / SPIKE_CRYSTAL_IOR));
  vec3 F0 = vec3(0.028, 0.03, 0.034);
  vec3 fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  float thickness = mix(SPIKE_CRYSTAL_THICKNESS_MIN, SPIKE_CRYSTAL_THICKNESS_MAX, 1.0 - cosTheta);
  vec3 absorption = exp(-SPIKE_CRYSTAL_ABSORPTION * thickness);
  vec3 transmission = refracted * absorption * SPIKE_CRYSTAL_TRANSMISSION_BOOST;
  vec3 color = mix(transmission, reflected * SPIKE_CRYSTAL_REFLECT_BOOST, fresnel);
  color += SPIKE_CRYSTAL_EDGE_TINT * pow(1.0 - cosTheta, 3.0) * SPIKE_CRYSTAL_EDGE_TINT_BOOST;
  #ifndef QUALITY_LOW
  vec3 keyL = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
  #ifdef QUALITY_HIGH
  float alphaSq = 0.000003;
  #else
  float alphaSq = 0.000015;
  #endif
  color += vec3(1.0, 1.0, 0.99) * specularLobe(n, v, keyL, alphaSq) * SPIKE_CRYSTAL_SPEC_BOOST;
  #endif
  color *= mix(SPIKE_CRYSTAL_LIFT_MIN, SPIKE_CRYSTAL_LIFT_MAX, smoothstep(0.0, 0.22, cosTheta));
  return color;
}

vec3 shadeIridescentSpike(vec3 n, vec3 v, vec3 reflected, float cosTheta) {
  float edge = pow(1.0 - cosTheta, 1.35);
  float sweep = dot(n, normalize(vec3(0.58, 0.72, -0.37))) * SPIKE_IRIDESCENT_SWEEP_SCALE
    + dot(reflected, normalize(vec3(-0.44, 0.22, 0.87))) * (SPIKE_IRIDESCENT_SWEEP_SCALE * 0.72);
  float band = 0.5 + 0.5 * sin((1.0 - cosTheta) * SPIKE_IRIDESCENT_BAND_SCALE + sweep);
  vec3 filmTint = mix(SPIKE_IRIDESCENT_FILM_A, SPIKE_IRIDESCENT_FILM_B, band);
  vec3 base = reflected * SPIKE_IRIDESCENT_BASE_TINT;
  vec3 color = base * mix(SPIKE_IRIDESCENT_CORE_LIFT, SPIKE_IRIDESCENT_EDGE_LIFT, edge);
  color += reflected * filmTint * (0.16 + edge * SPIKE_IRIDESCENT_FILM_STRENGTH);
  color += filmTint * edge * 0.08;
  #ifndef QUALITY_LOW
  vec3 keyL = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
  #ifdef QUALITY_HIGH
  float alphaSq = 0.000004;
  #else
  float alphaSq = 0.00002;
  #endif
  vec3 specTint = mix(vec3(1.0, 0.99, 0.98), filmTint, 0.35);
  color += specTint * specularLobe(n, v, keyL, alphaSq) * SPIKE_IRIDESCENT_SPEC_BOOST;
  #endif
  return color;
}

vec3 shadePearlSpike(vec3 n, vec3 v, vec3 reflected, float cosTheta) {
  float edge = pow(1.0 - cosTheta, 1.8);
  float facing = smoothstep(0.0, 0.85, cosTheta);
  float sheenBand = 0.5 + 0.5 * dot(n, normalize(vec3(-0.28, 0.9, 0.34)));
  vec3 base = mix(SPIKE_PEARL_SHADOW_TINT, SPIKE_PEARL_BASE_COLOR, facing);
  vec3 color = base * mix(SPIKE_PEARL_CORE_LIFT, SPIKE_PEARL_EDGE_LIFT, edge);
  color += reflected * SPIKE_PEARL_REFLECT_MIX;
  color += SPIKE_PEARL_SHEEN_COLOR * pow(sheenBand, 2.8) * (SPIKE_PEARL_SHEEN_BOOST + edge * 0.08);
  #ifndef QUALITY_LOW
  vec3 keyL = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
  vec3 fillL = animateDir(vec3(-0.9, 0.3, -0.4), 1.7);
  #ifdef QUALITY_HIGH
  float glossAlphaSq = 0.006;
  float softAlphaSq = 0.04;
  #else
  float glossAlphaSq = 0.012;
  float softAlphaSq = 0.055;
  #endif
  color += vec3(1.0, 0.985, 0.965) * specularLobe(n, v, keyL, glossAlphaSq) * SPIKE_PEARL_SPEC_BOOST;
  color += SPIKE_PEARL_SHEEN_COLOR * specularLobe(n, v, fillL, softAlphaSq) * (SPIKE_PEARL_SPEC_BOOST * 0.34);
  #endif
  return color;
}

vec3 shade(vec3 p, vec3 rd, vec3 n) {
  vec3 v = -rd;
  vec3 r = reflect(rd, n);
  float cosTheta = max(dot(n, v), 0.0);
  vec3 reflected = envMap(r);

  #ifdef SPIKE_MATERIAL_GLASS
  return shadeDrops(n, v, reflected, cosTheta);
  #else
  float dropD;
  float spikeD;
  getSceneDistances(p, dropD, spikeD);
  float spikeMask = smoothstep(0.02, -0.02, spikeD - dropD);
  vec3 dropColor = shadeDrops(n, v, reflected, cosTheta);
  vec3 spikeColor;
  #ifdef SPIKE_MATERIAL_CRYSTAL
  spikeColor = shadeCrystalSpike(rd, n, v, reflected, cosTheta);
  #elif defined(SPIKE_MATERIAL_PEARL)
  spikeColor = shadePearlSpike(n, v, reflected, cosTheta);
  #elif defined(SPIKE_MATERIAL_IRIDESCENT)
  spikeColor = shadeIridescentSpike(n, v, reflected, cosTheta);
  #else
  spikeColor = shadeMetalSpike(n, v, reflected, cosTheta);
  #endif
  return mix(dropColor, spikeColor, spikeMask);
  #endif
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5*uResolution) / min(uResolution.x, uResolution.y);
  uv.x -= 0.22;
  uv.y += 0.02;

  // 屏幕归一化坐标用于视频采样
  vec2 screenUV = gl_FragCoord.xy / uResolution;
  bool camOn = uCameraActive > 0.5 && uVideoMix > 0.01;

  gDropA = uDropA;
  gDropB = uDropB;
  gDropC = uDropC;
  gVelA = uDropVelA;
  gVelB = uDropVelB;
  gVelC = uDropVelC;

  #ifdef SPIKE_ENABLED
  gSpikePos = uSpikePos;
  gSpikeRot = uSpikeRot;
  gSpikeActive = 1.0;
  gCubeScale = uCubeScale;
  #endif

  vec3 ro = vec3(0.0, 0.0, CAM_Z);
  vec3 rd = normalize(vec3(uv, CAM_FOV));

  vec3 color;

  #ifdef SPIKE_MATERIAL_GLASS
  /* ── Glass cube: true see-through refraction with video support ── */
  float dSpike = (gSpikeActive > 0.5) ? rayMarchSpike(ro, rd) : MAX_DIST + 1.0;
  float dScene = rayMarch(ro, rd);

  if (dSpike < dScene && dSpike < MAX_DIST) {
    vec3 hitFront = ro + rd * dSpike;
    vec3 nFront = calcSpikeNormal(hitFront);
    vec3 v = -rd;
    float cosTheta = max(dot(nFront, v), 0.0);

    float F0val = pow((1.0 - GLASS_IOR) / (1.0 + GLASS_IOR), 2.0);
    float fresnel = F0val + (1.0 - F0val) * pow(1.0 - cosTheta, 5.0);

    // Reflection
    vec3 reflDir = reflect(rd, nFront);
    vec3 reflProcedural = envMap(reflDir) * GLASS_REFLECT_MIX;
    vec3 reflColor;
    if (camOn) {
      vec3 reflCamera = sampleCameraReflection(screenUV, reflDir);
      reflColor = mix(reflProcedural, reflCamera * GLASS_REFLECT_MIX, CAMERA_REFLECT_MIX * uVideoMix);
    } else {
      reflColor = reflProcedural;
    }

    // Refraction
    vec3 refractDir = refract(rd, nFront, 1.0 / GLASS_IOR);
    if (length(refractDir) < 0.001) refractDir = reflDir;

    vec3 interiorStart = hitFront + refractDir * SURF_DIST * 3.0;
    float dBack = rayMarchInsideSpike(interiorStart, refractDir);
    vec3 hitBack = interiorStart + refractDir * dBack;
    vec3 nBack = -calcSpikeNormal(hitBack);

    vec3 exitDir = refract(refractDir, nBack, GLASS_IOR);
    if (length(exitDir) < 0.001) exitDir = reflect(refractDir, nBack);

    // Transmission
    vec3 transmitted;
    if (camOn) {
      // 视频透射效果 — 基于 uVideoMix 渐显
      vec2 refractOffset = (exitDir.xy - rd.xy) * CAMERA_REFRACT_SCALE;
      vec3 videoTrans = sampleCamera(screenUV, refractOffset) * CAMERA_TRANSMIT_DIM;
      videoTrans += (envMap(exitDir) * BG_ENV_BASE_MIX) * 0.12;

      // 程序化透射（无视频时的）
      vec3 exitStart = hitBack + exitDir * SURF_DIST * 3.0;
      float dAfter = rayMarch(exitStart, exitDir);
      vec3 procTrans;
      if (dAfter < MAX_DIST) {
        vec3 pAfter = exitStart + exitDir * dAfter;
        procTrans = shade(pAfter, exitDir, calcNormal(pAfter));
      } else {
        procTrans = envMap(exitDir) * BG_ENV_BASE_MIX + backgroundGlow(exitDir);
      }

      transmitted = mix(procTrans, videoTrans, uVideoMix);
    } else {
      vec3 exitStart = hitBack + exitDir * SURF_DIST * 3.0;
      float dAfter = rayMarch(exitStart, exitDir);
      if (dAfter < MAX_DIST) {
        vec3 pAfter = exitStart + exitDir * dAfter;
        transmitted = shade(pAfter, exitDir, calcNormal(pAfter));
      } else {
        transmitted = envMap(exitDir) * BG_ENV_BASE_MIX + backgroundGlow(exitDir);
      }
    }

    // Beer's law absorption
    float pathLen = dBack;
    vec3 absorption = exp(-GLASS_ABSORPTION * pathLen);
    transmitted *= absorption;

    // Specular
    vec3 keyL = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
    float spec = specularLobe(nFront, v, keyL, 0.000006) * GLASS_SPEC_BOOST;
    vec3 specColor = vec3(1.0, 1.0, 0.98) * spec;

    // Edge glow
    vec3 edgeGlow = GLASS_EDGE_GLOW * pow(1.0 - cosTheta, 3.0) * GLASS_EDGE_GLOW_BOOST;

    color = mix(transmitted, reflColor, fresnel) + specColor + edgeGlow;

  } else if (dScene < MAX_DIST) {
    vec3 p = ro + rd * dScene;
    color = shade(p, rd, calcNormal(p));
  } else {
    color = envMap(rd) * BG_ENV_BASE_MIX + backgroundGlow(rd);
  }

  // 立方体淡出：当 cubeFade < 1 时，将立方体区域混合向背景
  // 对于玻璃材质路径，整个输出已包含立方体和背景的融合
  if (uCubeFade < 0.999) {
    vec3 bgColor = envMap(rd) * BG_ENV_BASE_MIX + backgroundGlow(rd);
    color = mix(bgColor, color, uCubeFade);
  }

  #else
  /* ── Standard path (non-glass materials) ── */
  float d = rayMarch(ro, rd);
  if (d < MAX_DIST) {
    vec3 p = ro + rd * d;
    color = shade(p, rd, calcNormal(p));
  } else {
    color = envMap(rd) * BG_ENV_BASE_MIX + backgroundGlow(rd);
  }

  // 立方体淡出（非玻璃路径）
  if (uCubeFade < 0.999) {
    vec3 bgColor = envMap(rd) * BG_ENV_BASE_MIX + backgroundGlow(rd);
    color = mix(bgColor, color, uCubeFade);
  }
  #endif

  // ACES filmic
  color = clamp((color*(2.51*color+0.03))/(color*(2.43*color+0.59)+0.14), 0.0, 1.0);
  color = pow(color, vec3(1.0/2.2));

  vec2 vig = vUv - 0.5;
  color *= 1.0 - dot(vig, vig) * 0.35;

  gl_FragColor = vec4(color, 1.0);
}
`;
