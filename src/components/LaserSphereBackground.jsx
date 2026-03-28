import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import useSectionFreeze from '../hooks/useSectionFreeze';

/* ================================================================
   LaserSphereBackground — Three.js 原生光照版绿光地球
   - 不使用 CSS 打光蒙层，球体发光来自原生灯光 + 受光材质
   - Desktop: 更大体量；Mobile: 适配中下部差动
   ================================================================ */

const CONFIG = {
  // 尺寸：相对旧版本放大
  desktopRadius: 30,
  mobileRadius: 8,
  detail: 5,

  // 相机距离
  desktopCameraZ: 48,
  mobileCameraZ: 20,

  // 物理交互
  baseRotationSpeed: 0.00065,
  sensitivity: 0.00045,
  friction: 0.977,

  // 颜色
  meshColor: '#38ffba',
  coreColor: '#0a2b1a',
  glowColor: '#98ffe9',
  keyLightIntensity: 2.6,

  // 移动端差动系数（<1 表示慢于滚动）
  mobileParallaxFactor: 0.28,
};

export default function LaserSphereBackground({ sectionRef, isMobileProp }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const globeGroupRef = useRef(null);
  const coreMeshRef = useRef(null);
  const auraMeshRef = useRef(null);
  const keyLightRef = useRef(null);
  const animIdRef = useRef(null);
  const startTimeRef = useRef(0);

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
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;
    const mobile = width <= 768;
    setIsMobile(mobile);
    rendererRef.current.setSize(width, height);
    cameraRef.current.aspect = width / height;
    cameraRef.current.position.z = mobile ? CONFIG.mobileCameraZ : CONFIG.desktopCameraZ;
    cameraRef.current.updateProjectionMatrix();
  }, []);

  // 初始化 Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    startTimeRef.current = performance.now();

    const rect = container.getBoundingClientRect();
    // 防止容器尚未布局时尺寸为 0 —— 用 window 尺寸兜底
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    const mobile = isMobileProp ?? isMobile;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const cameraZ = mobile ? CONFIG.mobileCameraZ : CONFIG.desktopCameraZ;
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 2000);
    camera.position.z = cameraZ;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const radius = mobile ? CONFIG.mobileRadius : CONFIG.desktopRadius;
    const globeGroup = new THREE.Group();
    globeGroup.position.set(mobile ? 0 : -radius * 0.2, -radius * 0.24, 0);
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    const coreGeometry = new THREE.IcosahedronGeometry(radius * 0.86, 5);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(CONFIG.coreColor),
      roughness: 0.3,
      metalness: 0.06,
      clearcoat: 0.42,
      clearcoatRoughness: 0.34,
      transmission: 0.08,
      thickness: radius * 0.2,
      transparent: true,
      opacity: 0.55,
      emissive: new THREE.Color(CONFIG.meshColor),
      emissiveIntensity: 0.08,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    globeGroup.add(coreMesh);
    coreMeshRef.current = coreMesh;

    const wireGeometry = new THREE.IcosahedronGeometry(radius, CONFIG.detail);
    const wireMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(CONFIG.meshColor),
      emissive: new THREE.Color(CONFIG.glowColor),
      emissiveIntensity: 0.58,
      roughness: 0.38,
      metalness: 0.21,
      wireframe: true,
      transparent: true,
      opacity: 0.82,
    });
    const wireMesh = new THREE.Mesh(wireGeometry, wireMaterial);
    globeGroup.add(wireMesh);

    const auraGeometry = new THREE.IcosahedronGeometry(radius * 1.08, 3);
    const auraMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(CONFIG.glowColor),
      transparent: true,
      opacity: 0.13,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const auraMesh = new THREE.Mesh(auraGeometry, auraMaterial);
    globeGroup.add(auraMesh);
    auraMeshRef.current = auraMesh;

    // ---- Three.js 原生灯光 ----
    const ambientLight = new THREE.AmbientLight(0x8fffe7, 0.28);
    const hemisphereLight = new THREE.HemisphereLight(0x7effe3, 0x04130d, 0.62);
    const keyLight = new THREE.PointLight(0x4fffd2, CONFIG.keyLightIntensity, radius * 14);
    keyLight.position.set(radius * 1.3, radius * 0.55, radius * 1.35);
    const fillLight = new THREE.PointLight(0x10ff96, 1.5, radius * 14);
    fillLight.position.set(-radius * 1.8, -radius * 0.65, radius * 0.45);
    const rimLight = new THREE.PointLight(0xb6fff2, 1.2, radius * 14);
    rimLight.position.set(0, radius * 0.3, -radius * 2.0);
    scene.add(ambientLight, hemisphereLight, keyLight, fillLight, rimLight);
    keyLightRef.current = keyLight;

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
      scene.remove(ambientLight, hemisphereLight, keyLight, fillLight, rimLight);
      scene.remove(globeGroup);
      [coreMesh, wireMesh, auraMesh].forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [handleResize, isMobile, isMobileProp]);

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

      if (globeGroupRef.current) {
        globeGroupRef.current.rotation.y += rotationVel.current.y + CONFIG.baseRotationSpeed;
        globeGroupRef.current.rotation.x += rotationVel.current.x * 0.8;
        globeGroupRef.current.rotation.z += CONFIG.baseRotationSpeed * 0.35;

        if (coreMeshRef.current) {
          const breathe = 1 + Math.sin(time * 0.95) * 0.015;
          coreMeshRef.current.scale.setScalar(breathe);
        }

        if (auraMeshRef.current) {
          const auraPulse = 1 + Math.sin(time * 1.2) * 0.025;
          auraMeshRef.current.scale.setScalar(auraPulse);
        }

        if (keyLightRef.current) {
          keyLightRef.current.intensity = CONFIG.keyLightIntensity + Math.sin(time * 1.4) * 0.35;
        }

        rotationVel.current.x *= CONFIG.friction;
        rotationVel.current.y *= CONFIG.friction;
      }

      // 移动端：用容器 transform 做差动，不改球体矩阵
      if (isMobile && containerRef.current) {
        containerRef.current.style.transform = `translateY(${scrollOffsetRef.current}px)`;
      } else if (containerRef.current) {
        containerRef.current.style.transform = 'translateY(0px)';
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();
    return () => cancelAnimationFrame(animIdRef.current);
  }, [shouldAnimate, isMobile]);

  /* 容器样式：
     - Desktop: absolute 定位覆盖整个 section
     - Mobile: fixed-like 行为通过 sticky 实现，停留在 section 中下部 */
  const containerClass = isMobile
    ? 'absolute inset-x-0 bottom-[-8vh] h-[74vh] z-0 pointer-events-none overflow-hidden will-change-transform'
    : 'absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden';

  return <div ref={containerRef} className={containerClass} />;
}
