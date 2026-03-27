import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import useSectionFreeze from '../hooks/useSectionFreeze';

/* ================================================================
   LaserSphereBackground — 进化版：沉重、巨型、随机网格星球
   - Desktop: 更大的球体 + 更亮的发光
   - Mobile: 球体固定在页面中下部，不跟随面板滚动（差动效果）
   ================================================================ */

const CONFIG = {
  // 尺寸：桌面端更大，移动端保持小巧
  desktopRadius: 16,        // 桌面端放大（之前 12，现 16）
  mobileRadius: 3,          // 移动端保持不变
  detail: 8,               // 减小细分数，让边更长、网格更粗

  // 相机距离：桌面端拉远以容纳更大球体
  desktopCameraZ: 30,       // 桌面端相机 Z（之前 24）
  mobileCameraZ: 14,        // 移动端相机 Z

  // 物理交互
  baseRotationSpeed: 0.0008, // 极其缓慢的基础旋转
  sensitivity: 0.0005,       // 大幅降低灵敏度，模拟沉重感
  friction: 0.98,            // 极大的惯性，转动后会滑行很久

  // 颜色 — 提亮
  meshColor: '#22ffbb',      // 更亮的绿色（之前 #00ffaa）
  glowColor: '#44ffdd',      // 更亮的辉光色

  // 移动端差动系数 — 球体滚动速度为面板的 N 倍（< 1 表示更慢）
  mobileParallaxFactor: 0.35,
};

/* ---- 顶点着色器 ---- */
const vertexShader = `
  varying vec3 vPosition;
  varying float vNoise;
  varying vec3 vNormal;
  uniform float uTime;

  float snoise(vec3 v) {
    return sin(v.x * 0.3 + uTime * 0.1) * cos(v.y * 0.4 - uTime * 0.15) * 0.5;
  }

  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    float noise = snoise(position);
    vNoise = noise;
    vec3 newPosition = position + normal * noise * 1.5;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

/* ---- 片段着色器 — 更亮的发光 + 边缘辉光 ---- */
const fragmentShader = `
  varying vec3 vPosition;
  varying float vNoise;
  varying vec3 vNormal;
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uGlowColor;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    float seed = floor(vPosition.x * 2.5 + vPosition.y * 2.5);
    float randVal = random(vec2(seed, 1.0));

    // 随机剔除部分线条，形成不规则图样
    if (randVal < 0.3) discard;

    float pulse = sin(uTime * (1.2 + randVal * 2.0) + seed * 5.0) * 0.5 + 0.5;
    float intensity = mix(0.25, 1.4, vNoise * 0.5 + 0.5) * (pulse * 0.6 + 0.4);

    // Fresnel 边缘辉光：视线越平行于表面越亮
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
    vec3 baseColor = mix(uColor, uGlowColor, fresnel * 0.6);

    // 整体亮度提升
    float finalAlpha = clamp(intensity * 0.7 + fresnel * 0.35, 0.0, 1.0);

    gl_FragColor = vec4(baseColor * (1.0 + fresnel * 0.5), finalAlpha);
  }
`;

export default function LaserSphereBackground({ sectionRef, isMobileProp }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const meshRef = useRef(null);
  const animIdRef = useRef(null);
  const startTimeRef = useRef(performance.now());

  const [isMobile, setIsMobile] = useState(() =>
    isMobileProp ?? (typeof window !== 'undefined' && window.innerWidth <= 768)
  );

  // 惯性交互状态
  const rotationVel = useRef({ x: 0, y: 0 });
  const isPointerDown = useRef(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });

  const { shouldAnimate } = useSectionFreeze(containerRef, { activeThreshold: 0 });

  // 移动端差动：监听滚动，让球体以更慢的速度跟随
  const scrollOffsetRef = useRef(0);

  const handleResize = useCallback(() => {
    const container = containerRef.current;
    if (!container || !rendererRef.current || !cameraRef.current) return;
    const rect = container.getBoundingClientRect();
    const mobile = rect.width <= 768;
    setIsMobile(mobile);
    rendererRef.current.setSize(rect.width, rect.height);
    cameraRef.current.aspect = rect.width / rect.height;
    cameraRef.current.updateProjectionMatrix();
  }, []);

  // 初始化 Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mobile = isMobileProp ?? rect.width <= 768;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const cameraZ = mobile ? CONFIG.mobileCameraZ : CONFIG.desktopCameraZ;
    const camera = new THREE.PerspectiveCamera(55, rect.width / rect.height, 0.1, 2000);
    camera.position.z = cameraZ;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const radius = mobile ? CONFIG.mobileRadius : CONFIG.desktopRadius;
    const geometry = new THREE.IcosahedronGeometry(radius, CONFIG.detail);
    const edges = new THREE.EdgesGeometry(geometry, 2);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(CONFIG.meshColor) },
        uGlowColor: { value: new THREE.Color(CONFIG.glowColor) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.LineSegments(edges, material);
    // 球体偏下，只露出上半球
    mesh.position.y = -radius * 0.7;
    scene.add(mesh);
    meshRef.current = mesh;

    // ---- 指针交互 ----
    const onDown = (e) => {
      isPointerDown.current = true;
      lastPointerPos.current = {
        x: e.clientX || e.touches?.[0].clientX,
        y: e.clientY || e.touches?.[0].clientY,
      };
    };
    const onMove = (e) => {
      if (!isPointerDown.current) return;
      const x = e.clientX || e.touches?.[0].clientX;
      const y = e.clientY || e.touches?.[0].clientY;
      const dx = x - lastPointerPos.current.x;
      const dy = y - lastPointerPos.current.y;
      rotationVel.current.y += dx * CONFIG.sensitivity;
      rotationVel.current.x += dy * CONFIG.sensitivity;
      lastPointerPos.current = { x, y };
    };
    const onUp = () => { isPointerDown.current = false; };

    window.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animIdRef.current);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [handleResize, isMobileProp]);

  // 移动端差动滚动效果
  useEffect(() => {
    if (!isMobile || !sectionRef?.current) return;

    const onScroll = () => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      // 计算 section 顶部距离视口中心的偏移
      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const offset = (sectionCenter - viewportCenter) * CONFIG.mobileParallaxFactor;
      scrollOffsetRef.current = offset;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // 初始化
    return () => window.removeEventListener('scroll', onScroll);
  }, [isMobile, sectionRef]);

  // 渲染循环
  useEffect(() => {
    if (!shouldAnimate) return;
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      const time = (performance.now() - startTimeRef.current) / 1000;
      if (meshRef.current) {
        meshRef.current.material.uniforms.uTime.value = time;
        meshRef.current.rotation.y += rotationVel.current.y + CONFIG.baseRotationSpeed;
        meshRef.current.rotation.x += rotationVel.current.x;
        rotationVel.current.x *= CONFIG.friction;
        rotationVel.current.y *= CONFIG.friction;
      }
      // 移动端：用CSS transform做差动，不改mesh position（避免重建矩阵）
      if (isMobile && containerRef.current) {
        containerRef.current.style.transform = `translateY(${scrollOffsetRef.current}px)`;
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();
    return () => cancelAnimationFrame(animIdRef.current);
  }, [shouldAnimate, isMobile]);

  /* 容器样式：
     - Desktop: absolute 定位覆盖整个 section
     - Mobile: fixed-like 行为通过 sticky 实现，停留在 section 中下部 */
  const containerClass = isMobile
    ? 'absolute inset-x-0 bottom-0 h-[60vh] z-0 pointer-events-none overflow-hidden will-change-transform'
    : 'absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden';

  return <div ref={containerRef} className={containerClass} />;
}
