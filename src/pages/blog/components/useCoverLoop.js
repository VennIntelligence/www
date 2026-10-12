import { useEffect, useRef, useState } from 'react';
import useSectionFreeze from '../../../hooks/useSectionFreeze';

/**
 * useCoverLoop — 博客卡片动态封面的共用主时钟。
 *
 * 单个 RAF 循环推进显示时钟 t(秒)。容器离开视口或页面转后台时由
 * useSectionFreeze 完全停止(冻结 ≠ 卸载:恢复时从冻结帧继续,无跳变);
 * prefers-reduced-motion 时不启动循环,封面停在 freezeAt 代表帧。
 *
 * @param {number} freezeAt 初始帧 / reduced-motion 代表帧时刻(秒),默认 0
 * @returns {[import('react').RefObject, number]} [挂到封面容器的 ref, 当前 t]
 */
export default function useCoverLoop({ freezeAt = 0 } = {}) {
  const ref = useRef(null);
  const { shouldAnimate } = useSectionFreeze(ref, { activeThreshold: 0.02 });
  const [t, setT] = useState(freezeAt);

  useEffect(() => {
    if (!shouldAnimate) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let id;
    let last = performance.now();
    const step = (now) => {
      // 单帧步长封顶 50ms:解冻/切回前台时不发生时间跳变
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setT((prev) => prev + dt);
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [shouldAnimate]);

  return [ref, t];
}
