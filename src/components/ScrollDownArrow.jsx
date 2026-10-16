import { useCallback, useEffect, useState } from 'react';
import '../styles/components/scroll-down-arrow.css';

/**
 * ScrollDownArrow — 全局滚动引导箭头
 *
 * 固定在视口底部，双层 V 形箭头微动闪烁，引导用户向下滚动。
 * 当页面滚动到最后一屏（距底部 < 1 屏高度）时自动隐藏。
 * 传入 ctaLabel + ctaTarget 时，首屏阶段箭头上方显示文字按钮，点击平滑滚动到目标区块。
 */
export default function ScrollDownArrow({ ctaLabel, ctaTarget }) {
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const checkScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;

      /* 当距离页面底部不到一屏高度时隐藏箭头 */
      const nearBottom = scrollTop + winHeight * 2 >= docHeight;
      setHidden(nearBottom);
      /* 首屏前半段才显示 CTA 文字 */
      setAtTop(scrollTop < winHeight * 0.5);
    };

    checkScroll();
    window.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const showCta = Boolean(ctaLabel && ctaTarget) && atTop;
  const Tag = showCta ? 'button' : 'div';

  const handleClick = useCallback(() => {
    document.getElementById(ctaTarget)?.scrollIntoView({ behavior: 'smooth' });
  }, [ctaTarget]);

  return (
    <Tag
      className={`scroll-arrow ${hidden ? 'scroll-arrow--hidden' : ''} ${showCta ? 'scroll-arrow--cta' : ''}`}
      {...(showCta ? { type: 'button', onClick: handleClick } : { 'aria-hidden': true })}
    >
      {showCta && <span className="scroll-arrow__label">{ctaLabel}</span>}
      {/* 双层 chevron：两个 V 形叠加，各自有不同的动画延迟 */}
      <svg
        className="scroll-arrow__chevron"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
      <svg
        className="scroll-arrow__chevron"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </Tag>
  );
}
