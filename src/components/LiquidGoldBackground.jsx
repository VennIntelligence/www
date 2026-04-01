import { useEffect, useRef } from 'react';
import '../styles/components/liquid-gold-bg.css';
import useSectionFreeze from '../hooks/useSectionFreeze';
import useAdaptiveQuality from '../hooks/useAdaptiveQuality';

/* ================================================================
   ★ 可调参数 — 直接在这里改，无需动 shader 代码
   ──────────────────────────────────────────────────────────────
   每个参数都标注了：控制什么 / 默认值 / 往大往小的效果
   ================================================================ */
const CFG = {
  /* 流动速度 — 默认 0.08
   * 调大(→0.3)：金液流动更快；调小(→0.02)：接近静止 */
  flowSpeed: 0.03,

  /* 粘度 — 默认 0.6
   * 调大(→1.0)：金液更稠、细节更多；调小(→0.0)：更水、更流畅 */
  viscosity: 0.8,

  /* 纹路粗细（UV 缩放）— 默认 0.5
   * 调大(→2.0)：纹理更密；调小(→0.2)：纹理更疏、更大块 */
  uvScale: 0.8,

  /* 细纹频率 — 默认 5.0
   * 调大(→15)：表面细纹更多、更碎；调小(→1)：更平滑 */
  rippleScale: 8.0,

  /* 高光强度 — 默认 1.2
   * 调大(→3.0)：高光更刺眼；调小(→0)：消除高光 */
  specPower: 1.2,

  /* 液滴大小 — 默认 0.25
   * 调大(→0.6)：metaball 液滴更大；调小(→0.05)：液滴更小 */
  metaRadius: 0.25,
};

/* ================================================================
   LiquidGoldBackground — WebGL 液态金 shader 背景
   ──────────────────────────────────────────────────────────────
   移植自 web-blog / LiquidGoldCanvas.js
   集成 useSectionFreeze (视口停渲染) + useAdaptiveQuality (动态分辨率)
   ================================================================ */

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

uniform float u_time;
uniform vec2  u_res;
uniform vec2  u_mouse;

// 控制参数（从 GPUDebugBus 同步）
uniform float u_flowSpeed;
uniform float u_viscosity;
uniform float u_uvScale;
uniform float u_rippleScale;
uniform float u_specPower;
uniform float u_metaRadius;

// Noise / FBM
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float fbm(vec2 p, float t, float visc) {
  float val=0., amp=0.5, freq=1.;
  float decay = 0.45 + visc * 0.2;
  for (int i=0; i<5; i++) {
    val += amp * noise(p * freq + t);
    freq *= 1.8 + visc * 0.2;
    amp  *= decay;
    p    += vec2(1.7, 9.2);
  }
  return val;
}

float warpedField(vec2 p, float t, float visc) {
  vec2 q = vec2(fbm(p+vec2(0,0),t*.5,visc), fbm(p+vec2(5.2,1.3),t*.5,visc));
  vec2 r = vec2(fbm(p+3.*q+vec2(1.7,9.2),t*.7,visc), fbm(p+3.*q+vec2(8.3,2.8),t*.7,visc));
  float f = fbm(p + 2.5*r, t*.4, visc);
  return f + length(q)*0.4 + length(r)*0.3;
}

float metaballs(vec2 p, float t, float radius) {
  float val=0.;
  for (int i=0; i<5; i++) {
    float fi = float(i);
    vec2 center = vec2(
      sin(t*.3+fi*2.1)*.6 + cos(t*.2+fi*1.3)*.3,
      cos(t*.25+fi*1.7)*.6 + sin(t*.15+fi*2.5)*.3
    );
    float r = radius + 0.12*sin(t*.4+fi*3.);
    val += r / (length(p-center)+0.05);
  }
  return val;
}

vec3 getNormal(vec2 p, float t, float visc, float wC) {
  float eps=0.005;
  float hC = wC;
  float hR = warpedField(p+vec2(eps,0),t,visc);
  float hU = warpedField(p+vec2(0,eps),t,visc);
  return normalize(vec3((hC-hR)/eps, (hC-hU)/eps, 1.0));
}

float fresnel(float c, float f0) { return f0+(1.-f0)*pow(1.-c,5.); }

void main() {
  vec2 uv = (gl_FragCoord.xy - u_res*.5) / min(u_res.x, u_res.y);
  float t    = u_time * u_flowSpeed;
  float visc = u_viscosity;
  float sc   = u_uvScale;

  float field = warpedField(uv*sc, t, visc);
  float meta  = metaballs(uv, t, u_metaRadius);

  vec3 normal = getNormal(uv*sc, t, visc, field);

  vec3 viewDir  = normalize(vec3(0,0,1));
  vec3 light1   = normalize(vec3( 0.4, 0.5, 0.9));
  vec3 light2   = normalize(vec3(-0.6,-0.3, 0.7));
  vec3 light3   = normalize(vec3( 0.0, 0.8, 0.5));

  if (u_mouse.x > 0.0) {
    vec2 mUV    = (u_mouse - u_res*.5) / min(u_res.x, u_res.y);
    vec2 toM    = uv - mUV;
    float bump  = exp(-dot(toM,toM)*25.);
    normal      = normalize(normal + vec3(toM*bump*12., 0));
    field      += bump * 0.3;
  }

  // 金色调色盘
  vec3 goldBase   = vec3(0.83,0.61,0.22);
  vec3 goldBright = vec3(1.00,0.84,0.45);
  vec3 goldDeep   = vec3(0.55,0.35,0.08);
  vec3 goldShadow = vec3(0.18,0.10,0.02);
  vec3 whiteHot   = vec3(1.00,0.97,0.88);

  float NdotL1 = max(dot(normal,light1),0.);
  float NdotL2 = max(dot(normal,light2),0.);
  float NdotL3 = max(dot(normal,light3),0.);

  vec3 h1 = normalize(light1+viewDir);
  vec3 h2 = normalize(light2+viewDir);
  vec3 h3 = normalize(light3+viewDir);

  float spec1 = pow(max(dot(normal,h1),0.), 120.);
  float spec2 = pow(max(dot(normal,h2),0.),  80.);
  float spec3 = pow(max(dot(normal,h3),0.), 200.);

  float fres = fresnel(max(dot(normal,viewDir),0.), 0.8);

  float fn = smoothstep(0.3,1.8,field);
  vec3 base = mix(goldShadow, goldDeep,   smoothstep(0.,.3,fn));
  base      = mix(base,       goldBase,   smoothstep(.3,.6,fn));
  base      = mix(base,       goldBright, smoothstep(.6,.9,fn));

  vec3 diffuse  = base * (NdotL1*.5 + NdotL2*.3 + NdotL3*.2);
  vec3 specular = mix(goldBright,whiteHot,spec1)*spec1*u_specPower
                + mix(goldBright,whiteHot,spec2*.5)*spec2*0.6
                + mix(goldBright,whiteHot,spec3)*spec3*1.5;

  vec2 reflUv = normal.xy*.5+.5;
  vec3 env    = mix(vec3(.12,.07,.02), vec3(.45,.30,.12), reflUv.y);
  env         = mix(env, vec3(.7,.55,.25), smoothstep(.6,1.,reflUv.y));

  vec3 col = diffuse*.4 + specular*fres + env*fres*.5;
  col += base * 0.12;

  // Metaballs 辉光
  float metaGrad   = abs(meta - 3.5);
  col += goldBright * smoothstep(.5,.0,metaGrad) * 0.3;

  // 细纹细部
  float ripple = noise(uv*u_rippleScale + t*2.);
  ripple = ripple*ripple;
  col += whiteHot * smoothstep(.6,.9,ripple) * 0.08 * fres;

  // 晕影与暗角
  float dist    = length(uv);
  float vignette = 1. - smoothstep(.3,1.2,dist);
  col *= .35 + vignette*.65;
  col += goldBright * smoothstep(.8,.0,dist) * 0.15;

  // ACES Tone Mapping
  col = col*(2.51*col+0.03)/(col*(2.43*col+0.59)+0.14);
  col = pow(col, vec3(0.95,1.0,1.08));

  gl_FragColor = vec4(col, 1.0);
}
`;

const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

export default function LiquidGoldBackground() {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const glRef        = useRef(null);
  const uniformsRef  = useRef(null);
  const animIdRef    = useRef(null);
  const freezeStart  = useRef(0);
  const startTime    = useRef(performance.now());
  const mouseRef     = useRef({ x: -1, y: -1 });

  const { shouldAnimate } = useSectionFreeze(containerRef, { activeThreshold: 0 });
  const qualityRef = useAdaptiveQuality({ 
    bootTier: 'low', 
    bootScale: IS_ANDROID ? 0.38 : 0.54 
  });

  /* ── 核心 WebGL 初始化 ── */
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

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('Shader error:', gl.getShaderInfoLog(s));
      return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    uniformsRef.current = {
      uTime:        gl.getUniformLocation(prog, 'u_time'),
      uRes:         gl.getUniformLocation(prog, 'u_res'),
      uMouse:       gl.getUniformLocation(prog, 'u_mouse'),
      uFlowSpeed:   gl.getUniformLocation(prog, 'u_flowSpeed'),
      uViscosity:   gl.getUniformLocation(prog, 'u_viscosity'),
      uUvScale:     gl.getUniformLocation(prog, 'u_uvScale'),
      uRippleScale: gl.getUniformLocation(prog, 'u_rippleScale'),
      uSpecPower:   gl.getUniformLocation(prog, 'u_specPower'),
      uMetaRadius:  gl.getUniformLocation(prog, 'u_metaRadius'),
      prefersReduced,
    };

    /* 画质变更回调 */
    qualityRef.current.onQualityChange = ({ scale }) => {
      handleResize(canvas, gl, uniformsRef.current.uRes, scale);
    };
    qualityRef.current.start();

    /* 初始 Resize */
    handleResize(canvas, gl, uniformsRef.current.uRes, qualityRef.current.scale);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      qualityRef.current.dispose();
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
      glRef.current = null;
    };
  }, []);

  /* ── ResizeObserver 处理 ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      if (glRef.current && canvasRef.current && uniformsRef.current) {
        handleResize(canvasRef.current, glRef.current, uniformsRef.current.uRes, qualityRef.current.scale);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  /* ── 鼠标轨迹同步 ── */
  useEffect(() => {
    const onMove = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      const isOver = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      
      if (isOver) {
        const dpr = (window.devicePixelRatio || 1) * qualityRef.current.scale;
        mouseRef.current = {
          x: (e.clientX - r.left) * dpr,
          y: (r.height - (e.clientY - r.top)) * dpr
        };
      } else {
        mouseRef.current = { x: -1, y: -1 };
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  /* ── 动画主循环 ── */
  useEffect(() => {
    const gl = glRef.current;
    const u  = uniformsRef.current;
    if (!gl || !u) return;

    if (!shouldAnimate) {
      freezeStart.current = performance.now();
      cancelAnimationFrame(animIdRef.current);
      return;
    }

    if (freezeStart.current > 0) {
      startTime.current += performance.now() - freezeStart.current;
      freezeStart.current = 0;
    }

    const db = window.__GPU_DEBUG__;

    const tick = (now) => {
      animIdRef.current = requestAnimationFrame(tick);
      
      // 动态分辨率调节采样
      qualityRef.current.adaptFrame();

      // 获取动态参数（优先 GPU Debug Panel，其次默认值）
      const p = db ? db.getActiveTierParams() : null;
      
      gl.uniform1f(u.uTime, u.prefersReduced ? 0 : (performance.now() - startTime.current) * 0.001);
      gl.uniform2f(u.uMouse, mouseRef.current.x, mouseRef.current.y);
      
      gl.uniform1f(u.uFlowSpeed,   p?.goldFlowSpeed   ?? CFG.flowSpeed);
      gl.uniform1f(u.uViscosity,   p?.goldViscosity   ?? CFG.viscosity);
      gl.uniform1f(u.uUvScale,     p?.goldUvScale     ?? CFG.uvScale);
      gl.uniform1f(u.uRippleScale, p?.goldRippleScale ?? CFG.rippleScale);
      gl.uniform1f(u.uSpecPower,   p?.goldSpecPower   ?? CFG.specPower);
      gl.uniform1f(u.uMetaRadius,  p?.goldMetaRadius  ?? CFG.metaRadius);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (db) {
        db.reportFrame();
        db.reportMetrics('liquid-gold', qualityRef.current.scale);
      }
    };

    animIdRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animIdRef.current);
  }, [shouldAnimate]);

  return (
    <div ref={containerRef} className="liquid-gold-bg">
      <div className="liquid-gold-bg__fallback" />
      <div className="liquid-gold-bg__overlay" />
      <canvas ref={canvasRef} className="liquid-gold-bg__canvas" />
    </div>
  );
}

function handleResize(canvas, gl, uRes, scale) {
  const dpr = (window.devicePixelRatio || 1) * scale;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    if (uRes) gl.uniform2f(uRes, w, h);
  }
}
