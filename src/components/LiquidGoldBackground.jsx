import { useEffect, useRef, useCallback } from 'react';
import '../styles/components/liquid-gold-bg.css';
import useSectionFreeze from '../hooks/useSectionFreeze';
import useAdaptiveQuality from '../hooks/useAdaptiveQuality';
import { createFrameThrottle } from '../utils/frameThrottle';

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

  // 金色调色盘 — 中间值：暗处留黑，亮处比原始更纯
  vec3 goldBase   = vec3(0.87, 0.65, 0.20);   // 主体金，比原始(0.83)稍亮但不过分
  vec3 goldBright = vec3(1.00, 0.88, 0.50);   // 高光区，两次调参中间值
  vec3 goldDeep   = vec3(0.58, 0.38, 0.06);   // 过渡区，接近原始
  vec3 goldShadow = vec3(0.16, 0.09, 0.01);   // 最暗处保持接近黑色
  vec3 whiteHot   = vec3(1.00, 0.97, 0.88);   // 极亮高光点（恢复原始）

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

  vec3 col = diffuse*0.50 + specular*fres + env*fres*0.55;
  col += base * 0.16;  // ambient 微提，不过亮

  // 细纹细部
  float ripple = noise(uv*u_rippleScale + t*2.);
  ripple = ripple*ripple;
  col += whiteHot * smoothstep(.6,.9,ripple) * 0.08 * fres;

  // 暗角：0.50 基础保留主体明暗对比，不全压暗也不全铺亮
  float dist    = length(uv);
  float vignette = 1. - smoothstep(.35, 1.25, dist);
  col *= 0.50 + vignette * 0.50;
  col += goldBright * smoothstep(.85, .0, dist) * 0.18;

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
  const mouseRef     = useRef({ x: -1, y: -1 });

  const { shouldAnimate } = useSectionFreeze(containerRef, { activeThreshold: 0 });
  const qualityRef = useAdaptiveQuality({ 
    bootTier: 'low', 
    bootScale: IS_ANDROID ? 0.38 : 0.54 
  });

  // 把 shouldAnimate 存入 ref，动画循环闭包内读取
  const shouldAnimateRef = useRef(shouldAnimate);
  shouldAnimateRef.current = shouldAnimate;

  /* ── 鼠标轨迹同步 ── */
  const onMouseMove = useCallback((e) => {
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
  }, [qualityRef]);

  /* ══════════════════════════════════════════════════════════════
     单一 effect：WebGL 初始化 + ResizeObserver + 动画循环
     ──────────────────────────────────────────────────────────────
     关键设计：
     1. waitForLayout() 等非零尺寸后再初始化 WebGL
     2. 初始化后立即绘制一帧静态画面（不依赖 shouldAnimate）
     3. 动画循环用 shouldAnimate 控制"是否持续动画"
     这样 canvas 永远不会出现空白——初始化即有画面。
     ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── 状态容器 ──
    let animId = null;
    let gl = null;
    let uniforms = null;
    let initialized = false;
    let waitId = null;
    let disposed = false;
    let startTime = performance.now();
    let freezeStart = 0;
    let wasFrozen = false;
    let lastCssW = 0;
    let lastCssH = 0;

    function applySize(scale) {
      const dpr = (window.devicePixelRatio || 1) * scale;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw === 0 || ch === 0) return false;
      const w = Math.round(cw * dpr);
      const h = Math.round(ch * dpr);
      /* 只有尺寸真正变化时才重设 canvas.width/height（会清空 buffer）。
       * 但 gl.viewport 和 u_res uniform 必须 ALWAYS 设置 ——
       * 因为 React StrictMode 会拆建 effect，新 program 的 uniform
       * 默认值是 0；如果跳过设置，shader 除以 0 → 全黑。 */
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      if (uniforms?.uRes) gl.uniform2f(uniforms.uRes, w, h);
      lastCssW = cw;
      lastCssH = ch;
      return true;
    }

    /* 绘制一帧（提取为函数，初始化和动画循环都调用） */
    function drawFrame(time) {
      const db = window.__GPU_DEBUG__;
      const p = db ? db.getActiveTierParams() : null;

      gl.uniform1f(uniforms.uTime, prefersReduced ? 0 : time);
      gl.uniform2f(uniforms.uMouse, mouseRef.current.x, mouseRef.current.y);
      gl.uniform1f(uniforms.uFlowSpeed,   p?.goldFlowSpeed   ?? CFG.flowSpeed);
      gl.uniform1f(uniforms.uViscosity,   p?.goldViscosity   ?? CFG.viscosity);
      gl.uniform1f(uniforms.uUvScale,     p?.goldUvScale     ?? CFG.uvScale);
      gl.uniform1f(uniforms.uRippleScale, p?.goldRippleScale ?? CFG.rippleScale);
      gl.uniform1f(uniforms.uSpecPower,   p?.goldSpecPower   ?? CFG.specPower);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (db) {
        db.reportFrame();
        db.reportMetrics('liquid-gold', qualityRef.current.scale);
      }
    }

    function initWebGL() {
      /* preserveDrawingBuffer: true — 关键修复！
       * 默认 false 时，浏览器在每次合成后可能清空 buffer。
       * 如果动画冻结（shouldAnimate=false）不重画，canvas 就变空白。
       * 设为 true 保证已画内容持久存在，直到下一次 drawArrays。 */
      gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: true,
      });
      if (!gl) { console.warn('[LiquidGold] WebGL context creation failed'); return false; }

      function compile(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.warn('Shader error:', gl.getShaderInfoLog(s));
        }
        return s;
      }

      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT_SRC));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
      gl.linkProgram(prog);

      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn('Program link error:', gl.getProgramInfoLog(prog));
        return false;
      }

      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      uniforms = {
        uTime:        gl.getUniformLocation(prog, 'u_time'),
        uRes:         gl.getUniformLocation(prog, 'u_res'),
        uMouse:       gl.getUniformLocation(prog, 'u_mouse'),
        uFlowSpeed:   gl.getUniformLocation(prog, 'u_flowSpeed'),
        uViscosity:   gl.getUniformLocation(prog, 'u_viscosity'),
        uUvScale:     gl.getUniformLocation(prog, 'u_uvScale'),
        uRippleScale: gl.getUniformLocation(prog, 'u_rippleScale'),
        uSpecPower:   gl.getUniformLocation(prog, 'u_specPower'),
        prog,
        buf,
      };

      // 画质变更回调 — 升级后 canvas 尺寸会变，buffer 被清空，需要重画
      qualityRef.current.onQualityChange = ({ scale }) => {
        if (gl && !disposed) {
          console.log('[LiquidGold] quality change → scale:', scale);
          applySize(scale);
          drawFrame((performance.now() - startTime) * 0.001);
        }
      };
      qualityRef.current.start();

      // 设置尺寸
      applySize(qualityRef.current.scale);

      /* ★ 立即绘制第一帧 ★
       * 不等 shouldAnimate — canvas 永远不应空白。
       * useSectionFreeze 的 IO 可能延迟数秒才触发，等它则用户看到空白。 */
      drawFrame(0);

      return true;
    }

    /* ── 等待 canvas 有非零 CSS 尺寸后再初始化 ── */
    let retries = 0;
    const MAX_RETRIES = 180;

    function waitForLayout() {
      if (disposed) return;
      if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
        if (initWebGL()) {
          initialized = true;
          startAnimLoop();
        }
        return;
      }
      retries++;
      if (retries < MAX_RETRIES) {
        waitId = requestAnimationFrame(waitForLayout);
      }
    }

    function startAnimLoop() {
      const frameThrottle = createFrameThrottle();

      function tick() {
        if (disposed) return;
        animId = requestAnimationFrame(tick);

        // ── 冻结 ↔ 解冻（必须在限流之前，确保冻结状态始终被正确标记）──
        const animate = shouldAnimateRef.current;
        if (!animate) {
          if (!wasFrozen) {
            freezeStart = performance.now();
            wasFrozen = true;
          }
          return;
        }
        if (wasFrozen) {
          if (freezeStart > 0) {
            startTime += performance.now() - freezeStart;
            freezeStart = 0;
          }
          wasFrozen = false;
          frameThrottle.reset(); // 解冻后重置限流器，避免突发连续渲染
        }

        // 帧率限流
        if (frameThrottle.skip()) return;

        // ── 每帧脏检查尺寸 ──
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        if (cw !== lastCssW || ch !== lastCssH) {
          applySize(qualityRef.current.scale);
        }

        // 画质自适应采样
        qualityRef.current.adaptFrame();

        // 绘制当前帧
        drawFrame((performance.now() - startTime) * 0.001);
      }

      animId = requestAnimationFrame(tick);
    }

    // ── ResizeObserver ──
    const ro = new ResizeObserver(() => {
      if (!initialized || !gl || disposed) return;
      if (applySize(qualityRef.current.scale)) {
        // 尺寸变更后立刻补画一帧，避免 resize 后瞬间空白
        // （因为 shouldAnimate 可能是 false，动画循环不会画）
        drawFrame((performance.now() - startTime) * 0.001);
      }
    });
    ro.observe(container);

    // ── 鼠标事件 ──
    window.addEventListener('mousemove', onMouseMove);

    // ── 启动 ──
    waitForLayout();

    // ── 清理 ──
    return () => {
      disposed = true;
      if (waitId != null) cancelAnimationFrame(waitId);
      if (animId != null) cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      qualityRef.current.dispose();
      if (gl && uniforms) {
        gl.deleteProgram(uniforms.prog);
        gl.deleteBuffer(uniforms.buf);
      }
    };
  }, [onMouseMove, qualityRef]);

  return (
    <div ref={containerRef} className="liquid-gold-bg">
      <div className="liquid-gold-bg__fallback" />
      <div className="liquid-gold-bg__overlay" />
      <canvas ref={canvasRef} className="liquid-gold-bg__canvas" />
    </div>
  );
}
