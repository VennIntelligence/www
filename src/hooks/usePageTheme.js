import { useEffect } from 'react';

/**
 * usePageTheme — 让某个路由页把整站（含路由外层的 Navbar / Footer）切到指定主题。
 *
 * 做法：在 <html> 上写 data-theme="<theme>"，各组件 CSS 用
 * html[data-theme="<theme>"] 选择器覆盖自己的颜色 token。
 * 页面卸载时恢复原值，其它路由完全不受影响。
 *
 * @param {string | undefined} theme  主题名；传 undefined 时不做任何事（默认全站暗色）
 */
export default function usePageTheme(theme) {
  useEffect(() => {
    if (!theme) return undefined;
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = theme;
    return () => {
      if (previous === undefined) delete root.dataset.theme;
      else root.dataset.theme = previous;
    };
  }, [theme]);
}
