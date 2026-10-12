import { useEffect, useRef } from 'react';
import useSectionFreeze from '../../../hooks/useSectionFreeze';
import { cssColorToVec3 } from '../../../config/dropletLook';

const VERT_SRC = 'attribute vec2 a_pos; void main(){gl_Position=vec4(a_pos,0.0,1.0);}';

const FRAG_SRC = `
precision highp float;

uniform float u_time;
uniform vec2 u_res;
uniform float u_flowSpeed;
uniform float u_sheenIntensity;
uniform vec2 u_mouse;
uniform vec3 u_bgInner;
uniform vec3 u_bgOuter;
uniform vec3 u_glow;
uniform vec3 u_layerA;
uniform vec3 u_layerB;
uniform vec3 u_layerC;

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm3(vec2 p){
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

float fbm2(vec2 p){
  float v = 0.5 * vnoise(p);
  p = mat2(0.8, -0.6, 0.6, 0.8) * p * 2.0;
  v += 0.25 * vnoise(p);
  return v;
}

vec2 domainWarp(vec2 p, float t, float scale, float seed){
  return vec2(
    fbm3(p * scale + vec2(1.7 + seed, 9.2) + t * 0.15),
    fbm3(p * scale + vec2(8.3, 2.8 + seed) - t * 0.12)
  );
}

vec2 domainWarpLite(vec2 p, float t, float scale, float seed){
  return vec2(
    fbm2(p * scale + vec2(1.7 + seed, 9.2) + t * 0.15),
    fbm2(p * scale + vec2(8.3, 2.8 + seed) - t * 0.12)
  );
}

vec3 fabricFold(vec2 p, float t, float seed, float freq, float flow){
  float ts = t * flow;
  vec2 warp = domainWarp(p + seed * 3.7, ts, 1.2, seed);
  vec2 wp = p + warp * 0.55;
  float h = 0.0;
  vec2 g = vec2(0.0);

  float f1x = freq * 0.7;
  float f1y = freq * 0.4;
  float ph1 = wp.x * f1x + wp.y * f1y + ts * 0.3 + seed * 2.1;
  h += sin(ph1) * 0.35;
  g += cos(ph1) * 0.35 * vec2(f1x, f1y);

  float f2x = -freq * 0.3;
  float f2y = freq * 0.9;
  float ph2 = wp.x * f2x + wp.y * f2y + ts * 0.25 + seed * 1.3;
  h += sin(ph2) * 0.25;
  g += cos(ph2) * 0.25 * vec2(f2x, f2y);

  float f3 = freq * 0.6;
  float ph3 = (wp.x + wp.y) * f3 + ts * 0.2 + seed * 4.5;
  h += sin(ph3) * 0.18;
  g += cos(ph3) * 0.18 * vec2(f3, f3);

  float f4x = freq * 1.8;
  float f4y = freq * 1.2;
  float ph4 = wp.x * f4x + wp.y * f4y - ts * 0.35 + seed * 0.7;
  h += sin(ph4) * 0.08;
  g += cos(ph4) * 0.08 * vec2(f4x, f4y);

  h += vnoise(wp * freq * 0.9 + seed * 10.0 + ts * 0.04) * 0.12 - 0.06;
  return vec3(h, g);
}

vec3 fabricFoldLite(vec2 p, float t, float seed, float freq, float flow){
  float ts = t * flow;
  vec2 warp = domainWarpLite(p + seed * 3.7, ts, 1.2, seed);
  vec2 wp = p + warp * 0.55;
  float h = 0.0;
  vec2 g = vec2(0.0);

  float f1x = freq * 0.7;
  float f1y = freq * 0.4;
  float ph1 = wp.x * f1x + wp.y * f1y + ts * 0.3 + seed * 2.1;
  h += sin(ph1) * 0.35;
  g += cos(ph1) * 0.35 * vec2(f1x, f1y);

  float f2x = -freq * 0.3;
  float f2y = freq * 0.9;
  float ph2 = wp.x * f2x + wp.y * f2y + ts * 0.25 + seed * 1.3;
  h += sin(ph2) * 0.25;
  g += cos(ph2) * 0.25 * vec2(f2x, f2y);

  float f3 = freq * 0.6;
  float ph3 = (wp.x + wp.y) * f3 + ts * 0.2 + seed * 4.5;
  h += sin(ph3) * 0.18;
  g += cos(ph3) * 0.18 * vec2(f3, f3);

  float f4x = freq * 1.8;
  float f4y = freq * 1.2;
  float ph4 = wp.x * f4x + wp.y * f4y - ts * 0.35 + seed * 0.7;
  h += sin(ph4) * 0.08;
  g += cos(ph4) * 0.08 * vec2(f4x, f4y);

  return vec3(h, g);
}

float kajiyaSpec(vec2 grad, vec3 L, vec3 V, float shine){
  float gl2 = dot(grad, grad);
  if (gl2 < 0.0001) return 0.0;
  vec2 tg = vec2(-grad.y, grad.x) / sqrt(gl2);
  vec3 T = normalize(vec3(tg, 0.0));
  vec3 H = normalize(L + V);
  float TdH = dot(T, H);
  return pow(sqrt(max(1.0 - TdH * TdH, 0.0)), shine);
}

vec3 darkTone(vec3 baseCol){
  return mix(u_bgOuter, baseCol, 0.18);
}

vec3 midTone(vec3 baseCol){
  return mix(u_bgInner, baseCol, 0.62);
}

vec3 brightTone(vec3 baseCol){
  return mix(baseCol, vec3(1.0), 0.36);
}

vec3 specTone(vec3 baseCol){
  return mix(baseCol, vec3(1.0), 0.78);
}

vec4 shadeLayer(
  vec2 p,
  float t,
  float seed,
  float freq,
  float flow,
  vec3 baseCol,
  float opacity,
  float shine,
  vec3 L1,
  vec3 L2,
  vec3 V,
  float sheenMul
){
  vec3 fold = opacity < 0.35 ? fabricFoldLite(p, t, seed, freq, flow) : fabricFold(p, t, seed, freq, flow);
  float h = fold.x;
  vec2 grad = fold.yz;
  vec3 N = normalize(vec3(-grad * 1.8, 1.0));

  float NdL1 = max(dot(N, L1), 0.0);
  float NdL2 = max(dot(N, L2), 0.0);
  float lit = NdL1 * 0.75 + NdL2 * 0.12;
  float depth = smoothstep(-0.8, 0.4, h);

  vec3 darkCol = darkTone(baseCol);
  vec3 midCol = midTone(baseCol);
  vec3 brightCol = brightTone(baseCol);
  vec3 specCol = specTone(baseCol);

  float shade = lit * depth;
  float midBlend = smoothstep(0.0, 0.35, shade);
  float brightBlend = smoothstep(0.25, 0.7, shade);
  vec3 fabric = mix(darkCol, midCol, midBlend);
  fabric = mix(fabric, brightCol, brightBlend * 0.5);

  float sp = kajiyaSpec(grad, L1, V, shine) * 0.9;
  sp += kajiyaSpec(grad, L2, V, shine * 0.6) * 0.15;
  sp *= sheenMul;
  float specPow = sp * sp * sp;
  fabric += specCol * specPow * 0.9;

  float trans = smoothstep(0.3, 0.9, depth) * lit * 0.08;
  fabric += u_glow * trans * 0.35;

  float sparkle = hash12(floor(p * 500.0 + t * 0.7));
  sparkle = step(0.9992, sparkle) * specPow * 20.0 * sheenMul;
  fabric += specCol * min(sparkle, 2.0);

  float alpha = opacity * (0.65 + depth * 0.35);
  return vec4(fabric, alpha);
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * u_flowSpeed;

  vec3 L1 = normalize(vec3(
    0.4 + sin(t * 0.07) * 0.3,
    0.9 + cos(t * 0.09) * 0.15,
    0.8
  ));

  if (u_mouse.x > 0.0) {
    vec2 mUV = u_mouse / u_res - 0.5;
    L1 = normalize(vec3(mUV.x * 2.0, mUV.y * 2.0 + 0.5, 0.8));
  }

  vec3 L2 = normalize(vec3(
    -0.7 + cos(t * 0.06) * 0.2,
    -0.3 + sin(t * 0.08) * 0.15,
    0.6
  ));
  vec3 V = vec3(0.0, 0.0, 1.0);

  float bgD = length(p);
  vec3 bg = mix(u_bgInner, u_bgOuter, smoothstep(0.0, 1.0, bgD));
  bg += u_glow * exp(-bgD * bgD * 2.0) * 0.32;
  bg += mix(u_layerA, u_layerC, 0.5) * exp(-dot(p - vec2(0.16, -0.12), p - vec2(0.16, -0.12)) * 4.5) * 0.07;

  vec4 ly1 = shadeLayer(
    p * 0.8 + vec2(0.15, t * 0.015), t,
    0.0, 2.0, 0.5,
    u_layerA,
    0.30, 26.0,
    L1, L2, V,
    u_sheenIntensity * 0.7
  );

  vec4 ly2 = shadeLayer(
    p * 1.0 + vec2(t * 0.012, -0.1), t,
    1.0, 3.2, 0.75,
    u_layerB,
    0.38, 40.0,
    L1, L2, V,
    u_sheenIntensity * 0.9
  );

  vec4 ly3 = shadeLayer(
    p * 1.2 + vec2(-t * 0.008, t * 0.02), t,
    2.0, 4.5, 1.0,
    u_layerC,
    0.50, 55.0,
    L1, L2, V,
    u_sheenIntensity
  );

  vec3 col = bg;
  col = mix(col, ly1.rgb, ly1.a);
  col += u_glow * ly1.a * ly2.a * 0.05;
  col = mix(col, ly2.rgb, ly2.a);
  col += mix(u_layerB, u_layerC, 0.5) * ly2.a * ly3.a * 0.05;
  col += mix(u_layerA, u_glow, 0.55) * ly1.a * ly2.a * ly3.a * 0.03;
  col = mix(col, ly3.rgb, ly3.a);

  float cov = (ly1.a + ly2.a + ly3.a) * 0.333;
  col += u_glow * cov * 0.04;

  float vig = 1.0 - smoothstep(0.25, 1.15, length(p * vec2(0.85, 1.0)));
  col *= 0.6 + 0.4 * vig;

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.18);
  col = col * (2.51 * col + 0.03) / (col * (2.43 * col + 0.59) + 0.14);
  col = pow(max(col, 0.0), vec3(0.4545));

  float grain = hash12(gl_FragCoord.xy + fract(u_time * 7.13) * 100.0);
  col += (grain - 0.5) * 0.012;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

const FALLBACK_COVER = {
  bgInner: '#15111d',
  bgOuter: '#050409',
  glow: '#5a3a53',
  layers: ['#c79b80', '#c186aa', '#9a8bd8'],
  flowSpeed: 0.4,
  sheenIntensity: 1.0,
};

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || 'Shader compile failed');
  }
  return shader;
}

function linkProgram(gl) {
  const program = gl.createProgram();
  const vertexShader = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || 'Program link failed');
  }
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
}

function applyVec3(gl, location, cssColor) {
  const [r, g, b] = cssColorToVec3(cssColor);
  gl.uniform3f(location, r, g, b);
}

/**
 * BlogCover — 文章卡片封面分发器
 *
 * 文章在 registry 里注册了专属封面组件(posts/<slug>/cover.jsx,静态 SVG 蚀刻图)
 * 时优先渲染它;没有注册的文章回退到默认丝绸 shader(SilkCover)。
 */
export default function BlogCover({ cover, art: Art, featured }) {
  if (Art) {
    return (
      <div
        className={`blog-card__cover blog-card__cover--art${featured ? ' blog-card__cover--featured' : ''}`}
        aria-hidden="true"
      >
        <Art />
      </div>
    );
  }
  return <SilkCover cover={cover} featured={featured} />;
}

function SilkCover({ cover, featured }) {
  const cardRef = useRef(null);
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1, y: -1 });
  const runtimeRef = useRef(null);
  const { shouldAnimate } = useSectionFreeze(cardRef, { activeThreshold: 0.02 });

  useEffect(() => {
    const container = cardRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    const config = { ...FALLBACK_COVER, ...cover };
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
    });

    if (!gl) return undefined;

    let disposed = false;
    let frameId = null;
    let startTime = performance.now();
    let freezeStart = 0;
    let isFrozen = false;
    let width = 0;
    let height = 0;

    const program = linkProgram(gl);
    const buffer = gl.createBuffer();
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      time: gl.getUniformLocation(program, 'u_time'),
      resolution: gl.getUniformLocation(program, 'u_res'),
      flowSpeed: gl.getUniformLocation(program, 'u_flowSpeed'),
      sheenIntensity: gl.getUniformLocation(program, 'u_sheenIntensity'),
      mouse: gl.getUniformLocation(program, 'u_mouse'),
      bgInner: gl.getUniformLocation(program, 'u_bgInner'),
      bgOuter: gl.getUniformLocation(program, 'u_bgOuter'),
      glow: gl.getUniformLocation(program, 'u_glow'),
      layerA: gl.getUniformLocation(program, 'u_layerA'),
      layerB: gl.getUniformLocation(program, 'u_layerB'),
      layerC: gl.getUniformLocation(program, 'u_layerC'),
    };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const nextWidth = Math.max(1, Math.round(container.clientWidth * dpr));
      const nextHeight = Math.max(1, Math.round(container.clientHeight * dpr));
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uniforms.resolution, width, height);
    }

    function draw(nowMs) {
      if (disposed) return;
      resize();
      gl.useProgram(program);
      gl.uniform1f(uniforms.time, prefersReducedMotion ? 0 : (nowMs - startTime) * 0.001);
      gl.uniform1f(uniforms.flowSpeed, config.flowSpeed);
      gl.uniform1f(uniforms.sheenIntensity, config.sheenIntensity);
      gl.uniform2f(uniforms.mouse, mouseRef.current.x, mouseRef.current.y);
      applyVec3(gl, uniforms.bgInner, config.bgInner);
      applyVec3(gl, uniforms.bgOuter, config.bgOuter);
      applyVec3(gl, uniforms.glow, config.glow);
      applyVec3(gl, uniforms.layerA, config.layers[0]);
      applyVec3(gl, uniforms.layerB, config.layers[1]);
      applyVec3(gl, uniforms.layerC, config.layers[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const debugBus = window.__GPU_DEBUG__;
      if (debugBus) {
        debugBus.reportFrame();
        debugBus.reportMetrics('blog-silk', Math.min(window.devicePixelRatio || 1, 1.5));
      }
    }

    function stop() {
      if (frameId != null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    }

    function tick(nowMs) {
      frameId = null;
      draw(nowMs);
      if (!prefersReducedMotion && !disposed && !isFrozen) {
        frameId = requestAnimationFrame(tick);
      }
    }

    function start() {
      if (prefersReducedMotion || disposed || frameId != null) return;
      frameId = requestAnimationFrame(tick);
    }

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    resizeObserver.observe(container);

    runtimeRef.current = {
      freeze() {
        if (isFrozen) return;
        isFrozen = true;
        freezeStart = performance.now();
        stop();
      },
      thaw() {
        if (!isFrozen) return;
        isFrozen = false;
        startTime += performance.now() - freezeStart;
        draw(performance.now());
        start();
      },
      draw: () => draw(performance.now()),
    };

    draw(performance.now());
    if (shouldAnimate && !prefersReducedMotion) {
      start();
    } else {
      isFrozen = !shouldAnimate;
    }

    return () => {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      runtimeRef.current = null;
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [cover]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    if (shouldAnimate) runtime.thaw();
    else runtime.freeze();
  }, [shouldAnimate]);

  function handlePointerMove(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseRef.current = {
      x: (event.clientX - rect.left) * scaleX,
      y: (rect.height - (event.clientY - rect.top)) * scaleY,
    };
    runtimeRef.current?.draw();
  }

  function handlePointerLeave() {
    mouseRef.current = { x: -1, y: -1 };
    runtimeRef.current?.draw();
  }

  return (
    <div
      ref={cardRef}
      className={`blog-card__cover blog-card__cover--silk${featured ? ' blog-card__cover--featured' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <canvas ref={canvasRef} className="blog-card__cover-canvas" aria-hidden="true" />
      <div className="blog-card__cover-vignette" aria-hidden="true" />
    </div>
  );
}
