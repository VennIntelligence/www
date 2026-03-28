import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop - 监听路由变化并重置滚动位置到顶部
 * 解决移动端和桌面端在切换页面时记录滚动位置的问题
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 禁用浏览器的自动滚动恢复行为
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // 1. 立即强制重置（不带平滑动画）
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' // 强制立即跳转，跳过 CSS 的 scroll-behavior: smooth
      });
    } catch (e) {
      // 降级处理
      window.scrollTo(0, 0);
    }

    // 2. 兜底逻辑：渲染完成后再次确认
    // 使用 requestAnimationFrame 确保在下一帧（通常是渲染后）重置
    const rafId = requestAnimationFrame(() => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    // 3. 极端情况兜底：针对可能存在的异步内容加载导致的布局抖动
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 50);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
