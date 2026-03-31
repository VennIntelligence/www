import { useEffect, useRef } from 'react';
import '../styles/components/fluid-amber-bg.css';
import useSectionFreeze from '../hooks/useSectionFreeze';

/* ================================================================
   FluidAmberBackground — 可调参数总控台
   ──────────────────────────────────────────────────────────────
   修改这里的值即可实时改变动画行为，无需动 shader 代码。
   ================================================================ */
const CFG = {
  /* ── 整体流速 ──────────────────────────────────────────────── */
  // 时间缩放。默认 0.15。调大 → 流动变快；调小 → 流动变慢/近乎静止
  timeScale: 0.08,

  /* ── fbm（分形布朗运动）质感 ────────────────────────────────── */
  // 每一层 octave 的振幅衰减系数。默认 0.48。
  // 调大(→0.6)：细节更丰富、更"毛糙"；调小(→0.3)：更平滑、大块状
  ampDecay: 0.6,

  /* ── 二阶 domain warp 强度 ──────────────────────────────────── */
  // 第一层 warp 系数（乘以 q）。默认 4.0。越大扭曲越剧烈
  warpQ: 4.0,
  // 第二层 warp 系数（乘以 r）。默认 3.5。越大最终形变越大
  warpR: 3.5,

  /* ── 鼠标漩涡扰动 ───────────────────────────────────────────── */
  // 漩涡影响范围（高斯衰减 e^(-dist² * falloff)）。默认 8.0。
  // 调大 → 漩涡更集中/半径更小；调小(→3) → 影响范围更大更扩散
  swirlFalloff: 8.0,
  // 漩涡最大旋转角度（弧度）。默认 0.28（约 16°，非常轻微）。
  // 原始值 2.4（约 137°），太强。建议范围 0.1 ～ 0.6
  swirlAngle: 0.28,

  /* ── FBM 内部时间变速 ────────────────────────────────────────── */
  // r 层（第二 warp）的时间系数。默认 1.2。越大 r 层流动比 q 层快
  rTimeScale: 1.2,
  // f 层（最终采样）的时间系数。默认 0.8。越小最终纹理流动越慢
  fTimeScale: 0.8,
};

/* ── Shader 源码 ── */
const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG_SRC = `
precision mediump float;
uniform float u_time;
uniform vec2  u_res;
uniform float u_timeScale;    /* CFG.timeScale  — 整体流速 */
uniform float u_ampDecay;     /* CFG.ampDecay   — fbm 振幅衰减 */
uniform float u_swirlFalloff; /* CFG.swirlFalloff — 漩涡高斯半径 */
uniform float u_swirlAngle;   /* CFG.swirlAngle   — 漩涡最大旋转角（弧度）*/
uniform float u_warpQ;        /* CFG.warpQ  — 第一层 warp 系数 */
uniform float u_warpR;        /* CFG.warpR  — 第二层 warp 系数 */
uniform float u_rTimeScale;   /* CFG.rTimeScale — r 层时间系数 */
uniform float u_fTimeScale;   /* CFG.fTimeScale — f 层时间系数 */
uniform vec2  u_mouse;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v2(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x  = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x   + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p, float t) {
  float val = 0.0;
  float amp  = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 5; i++) {
    val  += amp * snoise(p * freq + t * 0.3);
    freq *= 2.1;
    amp  *= u_ampDecay;
    p    += vec2(1.7, 9.2);
  }
  return val;
}

void main() {
  vec2 p = (gl_FragCoord.xy - u_res * 0.5) / min(u_res.x, u_res.y);
  float t = u_time * u_timeScale;

  /* 鼠标漩涡扰动 */
  if (u_mouse.x > 0.0) {
    vec2 mNorm = (u_mouse - u_res * 0.5) / min(u_res.x, u_res.y);
    vec2 diff  = p - mNorm;
    float dist = length(diff);
    float angle = exp(-dist * dist * u_swirlFalloff) * u_swirlAngle;
    float ca = cos(angle), sa = sin(angle);
    p = mNorm + mat2(ca, -sa, sa, ca) * diff;
  }

  /* 二阶 domain warp */
  vec2 q = vec2(fbm(p + vec2(0.0, 0.0), t),
                fbm(p + vec2(5.2, 1.3), t));
  vec2 r = vec2(fbm(p + u_warpQ*q + vec2(1.7, 9.2), t * u_rTimeScale),
                fbm(p + u_warpQ*q + vec2(8.3, 2.8), t * u_rTimeScale));
  float f = fbm(p + u_warpR*r, t * u_fTimeScale);

  /* 琥珀暖金调色 */
  vec3 col = mix(vec3(0.075, 0.065, 0.055), vec3(0.20, 0.14, 0.07),
                 clamp(f * f * 2.0, 0.0, 1.0));
  col = mix(col, vec3(0.78, 0.58, 0.24), clamp(length(q) * 0.5, 0.0, 1.0));
  col = mix(col, vec3(0.95, 0.75, 0.35), clamp(length(r.x) * 0.6, 0.0, 1.0));
  col += vec3(0.18, 0.12, 0.04) * smoothstep(0.5, 1.2, f*f*3.0 + length(r)*0.5);
  col  = pow(col, vec3(1.1));

  gl_FragColor = vec4(col, 1.0);
}
`;

/* ── WebGL 工具 ── */
function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

function buildProgram(gl) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT_SRC));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
  gl.linkProgram(prog);
  return prog;
}

/* ── React 组件 ── */
export default function FluidAmberBackground() {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const glRef        = useRef(null);
  const uniformsRef  = useRef(null);
  const animIdRef    = useRef(null);
  const freezeStart  = useRef(0);
  const startTime    = useRef(performance.now());
  const mouseRef     = useRef({ x: -1, y: -1 });

  const { shouldAnimate } = useSectionFreeze(containerRef, { activeThreshold: 0 });

  /* ── WebGL 初始化（仅一次）── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;
    glRef.current = gl;

    const prog = buildProgram(gl);
    gl.useProgram(prog);

    /* 全屏三角形 */
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    uniformsRef.current = {
      uTime:         gl.getUniformLocation(prog, 'u_time'),
      uRes:          gl.getUniformLocation(prog, 'u_res'),
      uTimeScale:    gl.getUniformLocation(prog, 'u_timeScale'),
      uAmpDecay:     gl.getUniformLocation(prog, 'u_ampDecay'),
      uSwirlFalloff: gl.getUniformLocation(prog, 'u_swirlFalloff'),
      uSwirlAngle:   gl.getUniformLocation(prog, 'u_swirlAngle'),
      uWarpQ:        gl.getUniformLocation(prog, 'u_warpQ'),
      uWarpR:        gl.getUniformLocation(prog, 'u_warpR'),
      uRTimeScale:   gl.getUniformLocation(prog, 'u_rTimeScale'),
      uFTimeScale:   gl.getUniformLocation(prog, 'u_fTimeScale'),
      uMouse:        gl.getUniformLocation(prog, 'u_mouse'),
      prefersReduced,
    };

    /* 从 CFG 写入所有静态 uniform */
    const u = uniformsRef.current;
    gl.uniform1f(u.uTimeScale,    CFG.timeScale);
    gl.uniform1f(u.uAmpDecay,     CFG.ampDecay);
    gl.uniform1f(u.uSwirlFalloff, CFG.swirlFalloff);
    gl.uniform1f(u.uSwirlAngle,   CFG.swirlAngle);
    gl.uniform1f(u.uWarpQ,        CFG.warpQ);
    gl.uniform1f(u.uWarpR,        CFG.warpR);
    gl.uniform1f(u.uRTimeScale,   CFG.rTimeScale);
    gl.uniform1f(u.uFTimeScale,   CFG.fTimeScale);

    /* 初始 resize */
    handleResize(canvas, gl, uniformsRef.current.uRes);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
      glRef.current = null;
    };
  }, []);

  /* ── resize 处理（ResizeObserver 确保首次布局就拿到正确尺寸）── */
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const gl = glRef.current;
    if (!container || !canvas || !gl) return;

    const doResize = () => handleResize(canvas, gl, uniformsRef.current?.uRes);

    /* ResizeObserver 在首次 observe 时就会触发一次回调，
     * 完美解决 useEffect 时布局还没完成导致 clientWidth=0 的竞态 */
    const ro = new ResizeObserver(doResize);
    ro.observe(container);

    return () => ro.disconnect();
  }, []);

  /* ── 鼠标/触控（监听 window，canvas pointer-events: none 不拦截内容层）── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const getRelY = (clientY) => {
      const rect = canvas.getBoundingClientRect();
      return (rect.height - (clientY - rect.top)) * dpr;
    };
    const getRelX = (clientX) => clientX * dpr;

    const isOver = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      return (
        clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top  && clientY <= rect.bottom
      );
    };

    const onMove = (e) => {
      if (isOver(e.clientX, e.clientY)) {
        mouseRef.current = { x: getRelX(e.clientX), y: getRelY(e.clientY) };
      } else {
        mouseRef.current = { x: -1, y: -1 };
      }
    };

    const onTouchMove = (e) => {
      const t = e.touches[0];
      if (isOver(t.clientX, t.clientY)) {
        mouseRef.current = { x: getRelX(t.clientX), y: getRelY(t.clientY) };
      }
    };
    const onTouchEnd = () => { mouseRef.current = { x: -1, y: -1 }; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  /* ── RAF 动画循环（受 shouldAnimate 控制）── */
  useEffect(() => {
    const gl = glRef.current;
    const u  = uniformsRef.current;
    if (!gl || !u) return;

    if (!shouldAnimate) {
      freezeStart.current = performance.now();
      cancelAnimationFrame(animIdRef.current);
      return;
    }

    /* 时间补偿，避免 uTime 跳变 */
    if (freezeStart.current > 0) {
      startTime.current += performance.now() - freezeStart.current;
      freezeStart.current = 0;
    }

    const canvas = canvasRef.current;

    const tick = () => {
      animIdRef.current = requestAnimationFrame(tick);

      /* 每帧检查尺寸——兜底首屏竞态和动态布局变化（开销极低） */
      handleResize(canvas, gl, u.uRes);

      const now = u.prefersReduced ? 0 : (performance.now() - startTime.current) * 0.001;
      gl.uniform1f(u.uTime, now);
      gl.uniform2f(u.uMouse, mouseRef.current.x, mouseRef.current.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      /* GPU Debug Panel 上报 */
      const db = window.__GPU_DEBUG__;
      if (db) { db.reportFrame(); db.reportMetrics('fluid-amber', 1); }
    };

    tick();
    return () => cancelAnimationFrame(animIdRef.current);
  }, [shouldAnimate]);

  return (
    <div ref={containerRef} className="fluid-amber-bg">
      <canvas ref={canvasRef} className="fluid-amber-bg__canvas" />
    </div>
  );
}

/* ── resize 工具函数 ── */
function handleResize(canvas, gl, uRes) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w   = Math.round(canvas.clientWidth  * dpr);
  const h   = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width  = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    if (uRes) gl.uniform2f(uRes, w, h);
  }
}
