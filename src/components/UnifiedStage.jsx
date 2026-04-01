import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { vertexShader } from '../shaders/waveVertex';
import { buildUnifiedShader, getRenderScale } from '../utils/unifiedShaderBuilder';
import { createFrameThrottle } from '../utils/frameThrottle';
import {
  clamp,
  smoothstep,
  DROP_ORBITS,
  applyPairRepulsion,
  clientToWorld,
  worldToLocalScreen,
  getSpikeHandleSize,
  createSpikeState,
  createDropStates,
  tickSpikeBounce,
  releaseSpikeDrag,
  computeTransition,
  applySpikeTransition,
  smoothFollowSpike,
  tickAboutRotation,
  getSpikeRotationMatrix3,
  onAboutArcballDown,
  onAboutArcballMove,
  onAboutArcballUp,
} from '../utils/unifiedPhysics';
import {
  RENDER_SCALE,
  DROP_RETURN_STIFFNESS,
  DROP_DAMPING,
  DROP_DRAG_CATCH_MULT,
  DROP_DRAG_STIFFNESS,
  DROP_DRAG_RELEASE_BOOST,
  DROP_SCROLL_GRAVITY,
  DROP_CUBE_SWAT_GAIN,
  DROP_MAX_OFFSET,
  DROP_BOUNDARY_CUSHION,
  DROP_BOUNDARY_STIFFNESS,
  DROP_BOUNDARY_DAMPING,
  SPIKE_FREE_DAMPING,
  SPIKE_THROW_GAIN,
  SPIKE_MOUSE_PICK_PADDING,
  SPIKE_SIZE,
  SPIKE_BOUNDS,
  DEMO_VIDEO_PATH,
  ABOUT_CUBE_SIZE_GLSL,
  LIQUID_BG_FLOW_SPEED,
  LIQUID_BG_VISCOSITY,
  LIQUID_BG_UV_SCALE,
  LIQUID_BG_RIPPLE_SCALE,
  LIQUID_BG_SPEC_POWER,
} from '../config/waveLook';

/**
 * UnifiedStage — 统一渲染层
 *
 * 跨越 Hero + About 两个 section 的全屏 WebGL 渲染层。
 * position:fixed 固定在视口，z-index 低于内容层。
 *
 * 特性：
 *   - 液滴 + 弹球立方体（Hero 阶段）
 *   - 立方体放大/移动过渡 + 视频渐显（过渡阶段）
 *   - 固定立方体 + arcball 旋转交互（About 阶段）
 *   - GPU 自适应画质
 *   - 离屏冻结（需要在 Hero 或 About 任一可见时保持渲染）
 */
export default function UnifiedStage() {
  const containerRef = useRef(null);
  const dragHandleRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const dragHandle = dragHandleRef.current;
    if (!container || !dragHandle) return;

    const w = () => container.clientWidth;
    const h = () => container.clientHeight;

    // ── 渲染画质 ──
    const baseDPR = window.devicePixelRatio || 1;
    let scale = RENDER_SCALE;

    // ── Three.js 初始化 ──
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    renderer.setPixelRatio(baseDPR * scale);
    renderer.setSize(w(), h());
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // 占位空纹理（视频未加载前使用）
    const placeholderTex = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat,
    );
    placeholderTex.needsUpdate = true;

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(w() * baseDPR * scale, h() * baseDPR * scale) },
      uPointerEnergy: { value: 0 },
      uScrollEnergy: { value: 0 },
      uDropA: { value: new THREE.Vector3() },
      uDropB: { value: new THREE.Vector3() },
      uDropC: { value: new THREE.Vector3() },
      uDropVelA: { value: new THREE.Vector3() },
      uDropVelB: { value: new THREE.Vector3() },
      uDropVelC: { value: new THREE.Vector3() },
      uSpikePos: { value: new THREE.Vector3(0, 0, 0.38) },
      uSpikeRot: { value: new THREE.Matrix3() },
      // ── 统一过渡 ──
      uPhase: { value: 0 },
      uCubeScale: { value: SPIKE_SIZE },
      uVideoMix: { value: 0 },
      uCubeFade: { value: 1.0 },
      uMorphFactor: { value: 0.0 },  // 形状变形进度（0=立方体, 1=正四面体）
      uBgAlpha: { value: 0.0 },      // 液态金背景不透明度
      // ── 视频纹理 ──
      uCameraTex: { value: placeholderTex },
      uCameraActive: { value: 0.0 },
      uCameraAspect: { value: 1.0 },
      // ── 液态背景参数（About 阶段原生渲染）──
      uGoldFlowSpeed:   { value: LIQUID_BG_FLOW_SPEED },
      uGoldViscosity:   { value: LIQUID_BG_VISCOSITY },
      uGoldUvScale:     { value: LIQUID_BG_UV_SCALE },
      uGoldRippleScale: { value: LIQUID_BG_RIPPLE_SCALE },
      uGoldSpecPower:   { value: LIQUID_BG_SPEC_POWER },
      /* (-1,-1) 表示"无鼠标"，shader 中 x >= 0 才触发扰动 */
      uGoldMouse:       { value: new THREE.Vector2(-1, -1) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: buildUnifiedShader(),
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    const geo = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geo, material));

    // ── 物理状态 ──
    const spike = createSpikeState();
    const drops = createDropStates();

    // ── 视频纹理 ──
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.loop = true;
    video.crossOrigin = 'anonymous';
    video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(video);

    let videoTex = null;
    let videoLoaded = false;

    function applyVideoTexture() {
      const aspect = video.videoWidth / Math.max(video.videoHeight, 1);
      if (aspect <= 0) return;
      videoTex = new THREE.VideoTexture(video);
      videoTex.minFilter = THREE.LinearFilter;
      videoTex.magFilter = THREE.LinearFilter;
      videoTex.colorSpace = THREE.SRGBColorSpace;
      videoTex.generateMipmaps = false;
      uniforms.uCameraTex.value = videoTex;
      uniforms.uCameraActive.value = 1.0;
      uniforms.uCameraAspect.value = aspect;
    }

    function loadDemoVideo() {
      if (videoLoaded) return;
      videoLoaded = true;
      video.src = DEMO_VIDEO_PATH;
      video.addEventListener('canplay', () => {
        video.play().then(applyVideoTexture).catch(() => {});
      }, { once: true });
      video.load();
    }

    // ── 交互状态 ──
    const interaction = {
      pointerActive: false,
      pointerWorld: new THREE.Vector3(),
      pointerEnergy: 0,
      scrollEnergy: 0,
      scrollGravity: 0,
      lastPointerAt: performance.now(),
      lastScrollY: window.scrollY,
      draggedDropIndex: -1,
      dragPointerId: null,
      dropDragTarget: new THREE.Vector3(),
      // 当前滚动过渡进度
      scrollProgress: 0,
      // About section 底部离开视口的进度（用于立方体淡出）
      aboutExitProgress: 0,
      // Hero section 底部 Y 位置（用于液滴边界推挤）
      heroBottomY: Infinity,
      // Product section 滚动进度（用于 Omega 四面体出现/消失）
      productScrollProgress: 0,
      productExitProgress: 0,
    };

    // ── 预分配临时向量 ──
    const pointerWorldScratch = new THREE.Vector3();
    const dragWorldScratch = new THREE.Vector3();
    const dropToBase = new THREE.Vector3();
    const dropLimitOffset = new THREE.Vector3();
    const spikeToDrop = new THREE.Vector3();
    const repulsionScratch = new THREE.Vector3();
    const handleScreen = new THREE.Vector2();
    const hitTestScreen = new THREE.Vector2();
    const dropToPointer = new THREE.Vector3();
    const spikeRotMat3 = new THREE.Matrix3();

    // Hero 旋转（弹球阶段用简单的时间旋转）
    const heroSpikeEuler = new THREE.Euler();
    const heroRotMat4 = new THREE.Matrix4();

    // ── 辅助函数 ──
    function updateDropUniforms() {
      uniforms.uDropA.value.copy(drops[0].position);
      uniforms.uDropB.value.copy(drops[1].position);
      uniforms.uDropC.value.copy(drops[2].position);
      uniforms.uDropVelA.value.copy(drops[0].renderVelocity);
      uniforms.uDropVelB.value.copy(drops[1].renderVelocity);
      uniforms.uDropVelC.value.copy(drops[2].renderVelocity);
    }

    function isPointerNearSpike(clientX, clientY, rect, extraPadding = 0) {
      worldToLocalScreen(spike.position, rect, hitTestScreen);
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const halfSize = getSpikeHandleSize(rect, spike.position.z) * 0.5 + extraPadding;
      return Math.abs(localX - hitTestScreen.x) <= halfSize && Math.abs(localY - hitTestScreen.y) <= halfSize;
    }

    function releaseDrag(pointerId) {
      // 释放弹球立方体
      if (spike.dragging && (pointerId == null || spike.pointerId === pointerId)) {
        releaseSpikeDrag(spike);
      }

      // 释放 arcball
      if (spike.arcballDragging && (pointerId == null || spike.arcballPointerId === pointerId)) {
        onAboutArcballUp(spike);
      }

      // 释放液滴
      if (interaction.draggedDropIndex >= 0 && (pointerId == null || interaction.dragPointerId === pointerId)) {
        if (container.hasPointerCapture?.(interaction.dragPointerId)) {
          container.releasePointerCapture(interaction.dragPointerId);
        }
        const drop = drops[interaction.draggedDropIndex];
        drop.velocity.multiplyScalar(DROP_DRAG_RELEASE_BOOST);
        interaction.draggedDropIndex = -1;
        interaction.dragPointerId = null;
      }

      container.style.cursor = '';
      dragHandle.style.cursor = spike.phase === 'hero' ? 'grab' : '';
    }

    // ── 计算滚动过渡进度 ──
    function updateScrollProgress() {
      const heroSection = document.getElementById('hero');
      const aboutSection = document.getElementById('about');
      if (!heroSection || !aboutSection) return;

      const heroRect = heroSection.getBoundingClientRect();
      const aboutRect = aboutSection.getBoundingClientRect();
      const viewH = window.innerHeight;

      // scrollProgress: 0 = Hero 完全在视口中, 1 = About 完全在视口中
      const heroBottom = heroRect.bottom;
      const progress = 1 - clamp(heroBottom / viewH, 0, 1);
      interaction.scrollProgress = progress;

      // aboutExitProgress: About 底部离开视口的进度
      // 0 = About 底部还在视口内（或更低）, 1 = About 底部完全离开视口顶部
      const aboutBottom = aboutRect.bottom;
      interaction.aboutExitProgress = 1 - clamp(aboutBottom / viewH, 0, 1);

      // 记录 Hero section 底部在视口中的 Y 位置（用于液滴边界推挤）
      interaction.heroBottomY = heroRect.bottom;

      // productScrollProgress / productExitProgress：追踪 Product section 进出视口
      const productSection = document.getElementById('product');
      if (productSection) {
        const productRect = productSection.getBoundingClientRect();
        // productScrollProgress: 0=product顶部在视口底部以下, 1=product顶部到达视口顶部
        interaction.productScrollProgress = clamp(1 - productRect.top / viewH, 0, 1);
        // productExitProgress: 0=product底部在视口内, 1=product底部完全离开视口顶部
        interaction.productExitProgress = 1 - clamp(productRect.bottom / viewH, 0, 1);
      }
    }

    // ── 事件处理 ──

    const onPointerDown = (event) => {
      if (event.button != null && event.button !== 0) return;
      if (spike.dragging || spike.arcballDragging || interaction.draggedDropIndex >= 0) return;

      const rect = container.getBoundingClientRect();
      const isMouse = event.pointerType === 'mouse';
      const spikePad = isMouse ? SPIKE_MOUSE_PICK_PADDING : 0;

      // About/Omega 阶段：arcball 旋转
      if (spike.phase === 'about' || spike.phase === 'omega') {
        if (isPointerNearSpike(event.clientX, event.clientY, rect, spikePad) ||
            event.currentTarget === dragHandle) {
          spike.arcballPointerId = event.pointerId;
          onAboutArcballDown(spike, rect, event.clientX, event.clientY);
          dragHandle.setPointerCapture?.(event.pointerId);
          container.style.cursor = 'grabbing';
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        return; // About 阶段不响应其他拖拽
      }

      // Hero 阶段：弹球拖拽
      if (spike.phase === 'hero') {
        if (event.currentTarget === dragHandle || isPointerNearSpike(event.clientX, event.clientY, rect, spikePad)) {
          clientToWorld(event.clientX, event.clientY, spike.position.z, rect, dragWorldScratch);
          spike.dragging = true;
          spike.pointerId = event.pointerId;
          spike.captureTarget = dragHandle;
          spike.dragOffset.subVectors(spike.position, dragWorldScratch);
          spike.dragVelocity.set(0, 0);
          spike.lastDragAt = performance.now();

          interaction.pointerActive = false;
          interaction.pointerEnergy = 0;

          dragHandle.setPointerCapture?.(event.pointerId);
          dragHandle.style.cursor = 'grabbing';

          event.preventDefault();
          event.stopPropagation();
          return;
        }

        // 液滴拖拽
        clientToWorld(event.clientX, event.clientY, 0, rect, pointerWorldScratch);
        let bestIdx = -1;
        let bestDist = Infinity;
        for (let i = 0; i < drops.length; i++) {
          const catchR = drops[i].radius * DROP_DRAG_CATCH_MULT;
          const dx = drops[i].position.x - pointerWorldScratch.x;
          const dy = drops[i].position.y - pointerWorldScratch.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < catchR && dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
        if (bestIdx >= 0) {
          interaction.draggedDropIndex = bestIdx;
          interaction.dragPointerId = event.pointerId;
          interaction.dropDragTarget.copy(pointerWorldScratch);
          interaction.pointerActive = true;
          interaction.pointerWorld.copy(pointerWorldScratch);
          interaction.lastPointerAt = performance.now();
          container.setPointerCapture?.(event.pointerId);
          container.style.cursor = 'grabbing';
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    const onPointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      const now = performance.now();

      // About arcball 拖拽
      if (spike.arcballDragging && spike.arcballPointerId === event.pointerId) {
        onAboutArcballMove(spike, rect, event.clientX, event.clientY);
        container.style.cursor = 'grabbing';
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Hero 弹球拖拽
      if (spike.dragging && spike.pointerId === event.pointerId) {
        const dt = Math.max((now - spike.lastDragAt) * 0.001, 1 / 240);
        clientToWorld(event.clientX, event.clientY, spike.position.z, rect, dragWorldScratch);
        dragWorldScratch.add(spike.dragOffset);
        dragWorldScratch.z = spike.position.z;

        // 限制在弹球边界内
        const [left, right, bottom, top] = SPIKE_BOUNDS;
        dragWorldScratch.x = clamp(dragWorldScratch.x, left, right);
        dragWorldScratch.y = clamp(dragWorldScratch.y, bottom, top);

        spike.dragVelocity.set(
          (dragWorldScratch.x - spike.position.x) / dt,
          (dragWorldScratch.y - spike.position.y) / dt,
        );
        spike.velocity.set(spike.dragVelocity.x, spike.dragVelocity.y, 0);
        spike.position.copy(dragWorldScratch);
        spike.lastDragAt = now;

        dragHandle.style.cursor = 'grabbing';
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // 液滴拖拽
      if (interaction.draggedDropIndex >= 0 && interaction.dragPointerId === event.pointerId) {
        clientToWorld(event.clientX, event.clientY, 0, rect, pointerWorldScratch);
        interaction.dropDragTarget.copy(pointerWorldScratch);
        interaction.pointerActive = true;
        interaction.pointerWorld.copy(pointerWorldScratch);
        interaction.lastPointerAt = now;
        container.style.cursor = 'grabbing';
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // 全局悬停
      if (event.target !== container && event.target !== dragHandle) return;

      clientToWorld(event.clientX, event.clientY, 0, rect, pointerWorldScratch);
      interaction.pointerActive = true;
      interaction.pointerWorld.copy(pointerWorldScratch);
      interaction.lastPointerAt = now;

      // 更新光标
      if (spike.phase === 'hero') {
        const isMouse = event.pointerType === 'mouse';
        const spikePad = isMouse ? SPIKE_MOUSE_PICK_PADDING : 0;
        if (isPointerNearSpike(event.clientX, event.clientY, rect, spikePad)) {
          container.style.cursor = 'grab';
        } else {
          let hovering = false;
          for (let i = 0; i < drops.length; i++) {
            const catchR = drops[i].radius * DROP_DRAG_CATCH_MULT;
            const dx = drops[i].position.x - pointerWorldScratch.x;
            const dy = drops[i].position.y - pointerWorldScratch.y;
            if (Math.sqrt(dx * dx + dy * dy) < catchR) {
              hovering = true;
              break;
            }
          }
          container.style.cursor = hovering ? 'grab' : '';
        }
      } else if (spike.phase === 'about') {
        if (isPointerNearSpike(event.clientX, event.clientY, rect, SPIKE_MOUSE_PICK_PADDING)) {
          container.style.cursor = 'grab';
        } else {
          container.style.cursor = '';
        }

        // About 阶段：更新液态背景鼠标位置（WebGL 坐标系：Y 轴朝上）
        const dpr = (window.devicePixelRatio || 1) * scale;
        uniforms.uGoldMouse.value.set(
          (event.clientX - rect.left) * dpr,
          (rect.height - (event.clientY - rect.top)) * dpr
        );
      }
    };

    const onPointerUp = (event) => {
      releaseDrag(event.pointerId);
    };

    const onPointerLeave = (event) => {
      if (event.pointerType === 'mouse' && !spike.dragging && !spike.arcballDragging && interaction.draggedDropIndex < 0) {
        interaction.pointerActive = false;
        container.style.cursor = '';
        // 鼠标离开时重置液态背景鼠标状态
        uniforms.uGoldMouse.value.set(-1, -1);
      }
    };

    /* ── 全局 mousemove：捕获文字层(pointer-events:auto)上方的鼠标移动 ──
     * About content 有 pointer-events:auto，事件不会到达 UnifiedStage 层。
     * 通过全局监听确保 About 阶段始终能跟踪鼠标。 */
    const onGlobalMouseMove = (ev) => {
      if (spike.phase !== 'about') return;
      const rect = container.getBoundingClientRect();
      // 确认鼠标在 About section 区域内
      if (ev.clientX < rect.left || ev.clientX > rect.right ||
          ev.clientY < rect.top  || ev.clientY > rect.bottom) {
        uniforms.uGoldMouse.value.set(-1, -1);
        return;
      }
      const dpr = (window.devicePixelRatio || 1) * scale;
      uniforms.uGoldMouse.value.set(
        (ev.clientX - rect.left) * dpr,
        (rect.height - (ev.clientY - rect.top)) * dpr
      );
    };
    window.addEventListener('mousemove', onGlobalMouseMove);

    const onScroll = () => {
      const nextScrollY = window.scrollY;
      const deltaY = nextScrollY - interaction.lastScrollY;
      interaction.lastScrollY = nextScrollY;

      const intensity = Math.min(Math.abs(deltaY), 120);
      interaction.scrollGravity = clamp(interaction.scrollGravity + intensity * 0.006, 0, 1.6);
      interaction.scrollEnergy = clamp(interaction.scrollEnergy + intensity * 0.008, 0, 1.25);

      updateScrollProgress();
    };

    // 移动端 touchstart 拦截
    const onTouchStart = (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const rect = container.getBoundingClientRect();

      // About 阶段：触摸立方体时阻止浏览器滚动，以允许 arcball 旋转
      if (spike.phase === 'about') {
        if (isPointerNearSpike(touch.clientX, touch.clientY, rect, 0)) {
          event.preventDefault();
          return;
        }
      }

      // Hero 阶段：触摸液滴时阻止滚动
      clientToWorld(touch.clientX, touch.clientY, 0, rect, pointerWorldScratch);
      for (let i = 0; i < drops.length; i++) {
        const catchR = drops[i].radius * DROP_DRAG_CATCH_MULT;
        const dx = drops[i].position.x - pointerWorldScratch.x;
        const dy = drops[i].position.y - pointerWorldScratch.y;
        if (Math.sqrt(dx * dx + dy * dy) < catchR) {
          event.preventDefault();
          break;
        }
      }

      // Hero 阶段：触摸立方体时阻止滚动
      if (spike.phase === 'hero') {
        if (isPointerNearSpike(touch.clientX, touch.clientY, rect, 0)) {
          event.preventDefault();
        }
      }
    };

    // ── 注册事件 ──
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    container.addEventListener('pointerleave', onPointerLeave);
    container.addEventListener('lostpointercapture', onPointerUp);
    container.addEventListener('touchstart', onTouchStart, { passive: false });

    window.addEventListener('scroll', onScroll, { passive: true });

    dragHandle.addEventListener('pointerdown', onPointerDown);
    dragHandle.addEventListener('pointermove', onPointerMove);
    dragHandle.addEventListener('pointerup', onPointerUp);
    dragHandle.addEventListener('pointercancel', onPointerUp);
    dragHandle.addEventListener('lostpointercapture', onPointerUp);
    dragHandle.addEventListener('touchstart', onTouchStart, { passive: false });

    // ── 自适应分辨率 ──
    const frameTimes = new Float32Array(30);
    let fIdx = 0, lastT = performance.now();

    function applyScale() {
      renderer.setPixelRatio(baseDPR * scale);
      renderer.setSize(w(), h());
      uniforms.uResolution.value.set(w() * baseDPR * scale, h() * baseDPR * scale);
    }

    function adaptQuality() {
      // GPU 调参面板激活时，由面板控制画质，跳过自动调节
      if (window.__GPU_DEBUG__?.enabled && window.__GPU_DEBUG__?.forcedTier) return;
      const now = performance.now();
      frameTimes[fIdx] = now - lastT;
      lastT = now;
      fIdx = (fIdx + 1) % 30;
      if (fIdx !== 0) return;
      let sum = 0;
      for (let i = 0; i < 30; i++) sum += frameTimes[i];
      const avg = sum / 30;
      if (avg > 40 && scale > 0.3) { scale = Math.max(scale - 0.05, 0.3); applyScale(); }
      else if (avg < 20 && scale < RENDER_SCALE) { scale = Math.min(scale + 0.02, RENDER_SCALE); applyScale(); }
    }

    // ── 渲染循环 ──
    const startTime = performance.now();
    let lastFrameAt = startTime;
    let animId;
    // 缓存容器尺寸，仅在 resize 时更新（避免每帧 getBoundingClientRect 引发 layout thrashing）
    let cachedRect = container.getBoundingClientRect();

    const frameThrottle = createFrameThrottle();

    function tick() {
      animId = requestAnimationFrame(tick);
      if (frameThrottle.skip()) return;
      const now = performance.now();
      const time = (now - startTime) * 0.001;
      const dt = clamp((now - lastFrameAt) * 0.001, 1 / 240, 1 / 24);
      lastFrameAt = now;

      uniforms.uTime.value = time;

      // ── 滚动过渡 ──
      const isMobile = window.innerWidth < 768;
      const transition = computeTransition(
        interaction.scrollProgress,
        isMobile,
        interaction.aboutExitProgress,
        interaction.productScrollProgress,
        interaction.productExitProgress,
      );

      // 更新过渡 uniform
      uniforms.uPhase.value = transition.t;
      uniforms.uCubeScale.value = transition.phase === 'hero' ? SPIKE_SIZE : SPIKE_SIZE * transition.cubeScale;
      uniforms.uVideoMix.value = transition.videoMix;
      uniforms.uCubeFade.value = transition.cubeFade;
      uniforms.uMorphFactor.value = transition.morphFactor;
      uniforms.uBgAlpha.value = transition.bgAlpha;

      // 过渡/About 阶段加载视频
      if (transition.phase !== 'hero' && transition.phase !== 'hidden' && !videoLoaded) {
        loadDemoVideo();
      }


      // 应用过渡（计算目标位置）
      applySpikeTransition(spike, transition);

      // 平滑追随目标位置 — 立方体以自己的节奏缓动到位
      smoothFollowSpike(spike, dt);

      // 衰减交互能量
      const pointerDecay = Math.exp(-dt * 5.2);
      const scrollDecay = Math.exp(-dt * 3.9);

      if (interaction.draggedDropIndex >= 0 && interaction.pointerActive) {
        interaction.pointerEnergy = clamp(interaction.pointerEnergy + dt * 2.0, 0, 0.8);
      } else {
        interaction.pointerEnergy *= pointerDecay;
      }
      interaction.scrollEnergy *= scrollDecay;
      // 回到 Hero 顶部时加速衰减 scrollGravity，避免残余引力引发弹簧共振
      if (interaction.scrollProgress < 0.05) {
        interaction.scrollGravity *= Math.exp(-dt * 12.0);
      } else {
        interaction.scrollGravity *= scrollDecay;
      }

      // ── Hero 阶段物理 ──
      if (spike.phase === 'hero') {
        tickSpikeBounce(spike, dt);

        // Hero 旋转（简单时间驱动）
        heroSpikeEuler.set(
          time * 0.28 + Math.sin(time * 0.21) * 0.18,
          time * 0.43,
          Math.cos(time * 0.17 + 0.8) * 0.14,
        );
        heroRotMat4.makeRotationFromEuler(heroSpikeEuler);
        uniforms.uSpikeRot.value.setFromMatrix4(heroRotMat4);
      }

      // ── About/过渡/Omega 阶段旋转 ──
      if (spike.phase === 'about' || spike.phase === 'transition'
          || spike.phase === 'omega' || spike.phase === 'omega-morph') {
        tickAboutRotation(spike, dt);
        getSpikeRotationMatrix3(spike, spikeRotMat3);
        uniforms.uSpikeRot.value.copy(spikeRotMat3);
      }

      // ── Hidden 阶段：跳过渲染 ──
      if (spike.phase === 'hidden') {
        // 隐藏拖拽手柄
        dragHandle.style.width = '0px';
        dragHandle.style.height = '0px';
        // 隐藏整个渲染层容器 — 解除对 Footer 的遮挡
        container.style.pointerEvents = 'none';
        container.style.visibility = 'hidden';
        renderer.render(scene, camera); // 最后一帧渲染
        adaptQuality();
        return; // 跳过后续渲染
      } else {
        // 非 hidden 阶段：确保容器可见
        container.style.pointerEvents = 'auto';
        container.style.visibility = 'visible';
      }

      // ── 液滴物理（仅 Hero 阶段） ──
      // 液滴始终只在 Hero section 内可见。当页面向下滚动时，
      // 液滴被 Hero section 的底部边界线向上推挤（而不是缩小或消失）。
      if (spike.phase === 'hero' || spike.phase === 'transition') {
        // 计算 Hero 底部对应的世界坐标 Y 值（用于推挤液滴）
        const heroBottomY = interaction.heroBottomY;
        // 将 Hero 底部屏幕 Y → 世界 Y
        const minDim = Math.min(cachedRect.width, cachedRect.height);
        const worldHeroBottomY = (cachedRect.height * 0.5 - heroBottomY) / minDim;
        // 给液滴一个安全边距（液滴半径 + 额外余量），确保液滴不会穿过边界
        const boundaryPushMargin = 0.15;

        for (let i = 0; i < drops.length; i++) {
          const drop = drops[i];
          drop.orbit(time, drop.base);

          if (i === interaction.draggedDropIndex && interaction.pointerActive) {
            dropToPointer.subVectors(interaction.dropDragTarget, drop.position);
            drop.velocity.addScaledVector(dropToPointer, DROP_DRAG_STIFFNESS * dt);
          } else {
            dropToBase.subVectors(drop.base, drop.position);
            drop.velocity.addScaledVector(dropToBase, DROP_RETURN_STIFFNESS * dt);
          }

          drop.velocity.y -= interaction.scrollGravity * DROP_SCROLL_GRAVITY * dt / drop.mass;

          spikeToDrop.subVectors(drop.position, spike.position);
          const spikeDistance = Math.max(spikeToDrop.length(), 0.001);
          const spikeInfluence = 1 - smoothstep(0.55, 1.9, spikeDistance);
          if (spikeInfluence > 0) {
            spikeToDrop.multiplyScalar(1 / spikeDistance);
            const spikeForce = clamp(spike.velocity.length() * 0.35, 0, 1.4) * spikeInfluence * DROP_CUBE_SWAT_GAIN * dt / drop.mass;
            drop.velocity.addScaledVector(spikeToDrop, spikeForce);
          }

          drop.velocity.multiplyScalar(Math.exp(-dt * DROP_DAMPING));

          // ── 限速（避免产生乒乓球式的硬弹跳或极快飞越） ──
          const maxDropSpeed = 3.5;
          if (drop.velocity.lengthSq() > maxDropSpeed * maxDropSpeed) {
            drop.velocity.setLength(maxDropSpeed);
          }

          drop.position.addScaledVector(drop.velocity, dt);

          // 偏移限制
          if (i !== interaction.draggedDropIndex) {
            dropLimitOffset.subVectors(drop.position, drop.base);
            if (dropLimitOffset.length() > DROP_MAX_OFFSET) {
              dropLimitOffset.setLength(DROP_MAX_OFFSET);
              drop.position.copy(drop.base).add(dropLimitOffset);
              drop.velocity.multiplyScalar(0.84);
            }
          }

          // ── 软缓冲区：液滴不能低于 Hero section 底部 ──
          // 用渐进式减速区替代硬弹跳，避免乒乓球式的连续弹跳
          const dropBottomBound = worldHeroBottomY + drop.radius + boundaryPushMargin;
          const cushionTop = dropBottomBound + DROP_BOUNDARY_CUSHION;
          if (drop.position.y < cushionTop) {
            // depth: 0 = 缓冲区外沿, 1 = 完全穿越边界
            const depth = clamp((cushionTop - drop.position.y) / DROP_BOUNDARY_CUSHION, 0, 1);
            // 渐进式推力（三次方 → 越深推力越强，但起步很柔和）
            const pushForce = depth * depth * depth * DROP_BOUNDARY_STIFFNESS;
            drop.velocity.y += pushForce * dt;
            // 方向性阻尼：只阻尼向下的速度分量（不影响离开边界的速度）
            if (drop.velocity.y < 0) {
              drop.velocity.y *= Math.exp(-dt * DROP_BOUNDARY_DAMPING * depth);
            }
            // 绝对不允许穿过硬边界
            if (drop.position.y < dropBottomBound) {
              drop.position.y = dropBottomBound;
              drop.velocity.y = Math.max(drop.velocity.y, 0);
            }
          }
          // 同样约束 base，使弹簧目标也不低于边界
          if (drop.base.y < dropBottomBound) {
            drop.base.y = dropBottomBound;
          }
        }

        // 液滴对排斥
        applyPairRepulsion(drops[0].position, drops[1].position, drops[0].radius, drops[1].radius, repulsionScratch);
        applyPairRepulsion(drops[0].position, drops[2].position, drops[0].radius, drops[2].radius, repulsionScratch);
        applyPairRepulsion(drops[1].position, drops[2].position, drops[1].radius, drops[2].radius, repulsionScratch);

        // 渲染速度
        for (const drop of drops) {
          drop.renderVelocity
            .subVectors(drop.position, drop.previousPosition)
            .multiplyScalar(1 / dt);
          drop.previousPosition.copy(drop.position);
        }
      }

      // 更新 uniforms
      uniforms.uPointerEnergy.value = Math.min(interaction.pointerEnergy, 1);
      uniforms.uScrollEnergy.value = Math.min(interaction.scrollEnergy, 1);
      uniforms.uSpikePos.value.copy(spike.position);
      updateDropUniforms();

      // 更新拖拽手柄位置
      if (spike.phase === 'hero' || spike.phase === 'about' || spike.phase === 'omega') {
        worldToLocalScreen(spike.position, cachedRect, handleScreen);
        const handleSize = getSpikeHandleSize(cachedRect, spike.position.z);
        dragHandle.style.left = `${handleScreen.x}px`;
        dragHandle.style.top = `${handleScreen.y}px`;
        dragHandle.style.width = `${handleSize}px`;
        dragHandle.style.height = `${handleSize}px`;
        dragHandle.style.cursor = spike.dragging || spike.arcballDragging ? 'grabbing' : 'grab';
        dragHandle.style.pointerEvents = 'auto';
      } else {
        // 过渡/隐藏阶段隐藏手柄
        dragHandle.style.width = '0px';
        dragHandle.style.height = '0px';
        dragHandle.style.pointerEvents = 'none';
      }

      renderer.render(scene, camera);
      adaptQuality();

      // ── GPU 调参面板集成：上报帧时间和状态 ──
      const debugBus = window.__GPU_DEBUG__;
      if (debugBus) {
        debugBus.reportFrame();
        debugBus.reportMetrics('high', scale);
      }
    }
    tick();

    // 初始滚动进度
    updateScrollProgress();

    const onResize = () => {
      cachedRect = container.getBoundingClientRect();
      applyScale();
    };
    window.addEventListener('resize', onResize);

    // ── GPU 调参面板：监听 shader 重建事件 ──
    const onDebugRebuild = (event) => {
      const { tier, params } = event.detail || {};
      if (!tier || !params) return;
      material.fragmentShader = buildUnifiedShader(tier, params);
      material.needsUpdate = true;
      scale = params.renderScale || scale;
      applyScale();
    };
    window.addEventListener('gpu-debug-rebuild', onDebugRebuild);

    // ── 清理 ──
    return () => {
      window.removeEventListener('gpu-debug-rebuild', onDebugRebuild);
      window.removeEventListener('mousemove', onGlobalMouseMove);
      cancelAnimationFrame(animId);
      releaseDrag();
      container.style.cursor = '';

      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('lostpointercapture', onPointerUp);
      container.removeEventListener('touchstart', onTouchStart);

      dragHandle.removeEventListener('pointerdown', onPointerDown);
      dragHandle.removeEventListener('pointermove', onPointerMove);
      dragHandle.removeEventListener('pointerup', onPointerUp);
      dragHandle.removeEventListener('pointercancel', onPointerUp);
      dragHandle.removeEventListener('lostpointercapture', onPointerUp);
      dragHandle.removeEventListener('touchstart', onTouchStart);

      // 视频清理
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (document.body.contains(video)) document.body.removeChild(video);
      if (videoTex) videoTex.dispose();
      placeholderTex.dispose();

      geo.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          pointerEvents: 'auto',
          touchAction: 'pan-y',
        }}
      />
      {/* dragHandle 独立于 container，z-index 高于 About 内容层（10）以接收触摸事件 */}
      <div
        ref={dragHandleRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          zIndex: 50,
          transform: 'translate(-50%, -50%)',
          touchAction: 'none',
          background: 'transparent',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
