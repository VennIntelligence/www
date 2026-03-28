import { useEffect, useRef } from 'react';

/* ─────────── 逐字符磁吸交互 Hook ───────────
 *
 * 用途：让容器内带有 .magnet-char 类名的字符元素根据鼠标距离产生
 *       波浪式位移、缩放和旋转。
 *
 * 参数：
 *   containerRef — 包含 .magnet-char 元素的容器 React ref
 *   options      — 可选调节参数（见下方 DEFAULT_OPTIONS）
 *
 * 返回：
 *   mouseRef — mutable ref，消费方在 pointerMove/pointerLeave 中更新
 *              { x: clientX, y: clientY, active: boolean }
 *
 * 示例用法：
 *   const containerRef = useRef(null);
 *   const mouseRef = useCharMagnet(containerRef, { radius: 200 });
 *
 *   const onPointerMove = (e) => {
 *     mouseRef.current.x = e.clientX;
 *     mouseRef.current.y = e.clientY;
 *     mouseRef.current.active = true;
 *   };
 *
 * 性能说明：
 *   使用单个 RAF 循环 + 直接 DOM 操作，不触发 React 渲染。
 *   弹簧插值 + 死区优化，空闲时跳过 DOM 写入。
 *   MutationObserver 监听容器子节点变化：语言切换后 DOM 重建时
 *   自动重新扫描 .magnet-char 并重启循环，磁吸效果不会丢失。
 * ─────────────────────────────────────────── */

const DEFAULT_OPTIONS = {
  /* 选择器；默认标准值：'.magnet-char'。用于在容器内查找目标字符元素。 */
  selector: '.magnet-char',
  /* 影响半径（px）；默认标准值：220。越大则影响范围越广。 */
  radius: 220,
  /* Y 位移最大值（px）；默认标准值：-14。负值向上推，正值向下推。 */
  maxY: -14,
  /* 缩放增益；默认标准值：0.18。数值越大字符放大越多。 */
  maxScale: 0.18,
  /* 旋转角度（deg）；默认标准值：4。越大旋转越明显。 */
  maxRotate: 4,
  /* 弹簧阻尼（0-1）；默认标准值：0.12。越小回弹越慢越柔和。 */
  damping: 0.12,
};

export default function useCharMagnet(containerRef, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  /* 存储 opts 到 ref 以避免 effect 依赖频繁变化 */
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId = 0;
    let charEls = [];
    let springs = [];

    /* ── 初始化/重新初始化字符集 ── */
    const init = () => {
      /* 先停掉旧循环，重置旧元素 transform */
      cancelAnimationFrame(animId);
      charEls.forEach((el) => { el.style.transform = ''; });

      charEls = Array.from(container.querySelectorAll(optsRef.current.selector));
      if (!charEls.length) return;

      springs = Array.from({ length: charEls.length }, () => ({
        y: 0, scale: 0, rotate: 0,
        targetY: 0, targetScale: 0, targetRotate: 0,
      }));

      animId = requestAnimationFrame(tick);
    };

    /* ── 动画主循环 ── */
    const tick = () => {
      const o = optsRef.current;
      const mouse = mouseRef.current;
      const radiusSq = o.radius * o.radius;

      for (let i = 0; i < charEls.length; i++) {
        const el = charEls[i];
        const s = springs[i];

        if (mouse.active) {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = mouse.x - cx;
          const dy = mouse.y - cy;
          const distSq = dx * dx + dy * dy;

          if (distSq < radiusSq) {
            const dist = Math.sqrt(distSq);
            const t = 1 - dist / o.radius;
            const ease = t * t; /* 二次衰减，中心强边缘柔和 */
            const sign = dx > 0 ? 1 : -1;

            s.targetY = o.maxY * ease;
            s.targetScale = o.maxScale * ease;
            s.targetRotate = o.maxRotate * ease * sign;
          } else {
            s.targetY = 0;
            s.targetScale = 0;
            s.targetRotate = 0;
          }
        } else {
          s.targetY = 0;
          s.targetScale = 0;
          s.targetRotate = 0;
        }

        /* 弹簧插值 */
        s.y += (s.targetY - s.y) * o.damping;
        s.scale += (s.targetScale - s.scale) * o.damping;
        s.rotate += (s.targetRotate - s.rotate) * o.damping;

        /* 死区优化 */
        if (Math.abs(s.y) < 0.01 && Math.abs(s.scale) < 0.001 && Math.abs(s.rotate) < 0.01
            && s.targetY === 0 && s.targetScale === 0 && s.targetRotate === 0) {
          if (el.style.transform !== '') {
            el.style.transform = '';
          }
          s.y = 0;
          s.scale = 0;
          s.rotate = 0;
        } else {
          el.style.transform =
            `translateY(${s.y.toFixed(2)}px) scale(${(1 + s.scale).toFixed(4)}) rotate(${s.rotate.toFixed(2)}deg)`;
        }
      }

      animId = requestAnimationFrame(tick);
    };

    /* ── MutationObserver：子树变化时重新初始化 ──
     * 语言切换会导致 MagnetText 的 key 变化，React 会重新挂载，
     * 原有的 .magnet-char 被替换为新节点。Observer 捕获到后重新 init()。
     * subtree: true 捕获所有后代节点的增删。
     */
    const mo = new MutationObserver(() => {
      init();
    });

    mo.observe(container, { childList: true, subtree: true });

    /* 首次初始化 */
    init();

    return () => {
      mo.disconnect();
      cancelAnimationFrame(animId);
      charEls.forEach((el) => { el.style.transform = ''; });
    };
  /* containerRef 挂载后不会变，effect 只需运行一次 */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);

  return mouseRef;
}
