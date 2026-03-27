import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  motion as Motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';

import MagnetText from '../../components/MagnetText';
import useCharMagnet from '../../hooks/useCharMagnet';
import { IconX, IconGitHub, IconEmail } from '../../components/common/SocialIcons';
import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import '../../styles/sections/hero.css';

function HeroSubtitleLine({ line, index, total, scrollYProgress, pointerXSpring, pointerYSpring }) {
  const lineDepth = index + 1;
  const lineX = useTransform(pointerXSpring, [-1, 1], [-4 * lineDepth, 4 * lineDepth]);
  const lineYParallax = useTransform(pointerYSpring, [-1, 1], [-2.5 * lineDepth, 2.5 * lineDepth]);
  const lineBaseY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, -18 - (total - index - 1) * 8]
  );
  const lineY = useTransform(() => lineBaseY.get() + lineYParallax.get());
  const lineScale = useTransform(scrollYProgress, [0, 1], [1, 0.985 - index * 0.004]);
  const lineOpacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 0.92, 0.7]);

  return (
    <Motion.span
      className="hero__subtitle-line"
      style={{
        x: lineX,
        y: lineY,
        opacity: lineOpacity,
        scale: lineScale,
      }}
    >
      {line}
    </Motion.span>
  );
}

/**
 * HeroSection — 纯视觉英雄区
 * 全屏背景 + 左对齐标题 + Hero 内信息带
 * 主标题支持逐字符磁吸交互（通过 useCharMagnet hook）
 */
export default function HeroSection() {
  const { lang } = useLanguage();
  const copy = COPY.hero[lang];
  const isChinese = lang === 'zh';
  const sectionRef = useRef(null);
  const titleAreaRef = useRef(null);
  const dividerSourceRef = useRef(null);
  const [dividerWidth, setDividerWidth] = useState(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const pointerXSpring = useSpring(pointerX, { stiffness: 140, damping: 22, mass: 0.5 });
  const pointerYSpring = useSpring(pointerY, { stiffness: 140, damping: 22, mass: 0.5 });
  const subtitleLines = copy.subtitleLines ?? (copy.subtitle ? [copy.subtitle] : []);

  /* 逐字符磁吸交互 — 共享 hook */
  const magnetMouseRef = useCharMagnet(titleAreaRef);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const shellBaseY = useTransform(scrollYProgress, [0, 1], [0, -56]);
  const dividerBaseY = useTransform(scrollYProgress, [0, 1], [0, -72]);
  const dividerBaseOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 0.92, 0.62]);

  const shellX = useTransform(pointerXSpring, [-1, 1], [-10, 10]);
  const shellYParallax = useTransform(pointerYSpring, [-1, 1], [-8, 8]);
  const shellRotateX = useTransform(pointerYSpring, [-1, 1], [1.4, -1.4]);
  const shellRotateY = useTransform(pointerXSpring, [-1, 1], [-1.8, 1.8]);

  const shellY = useTransform(() => shellBaseY.get() + shellYParallax.get());
  const dividerX = useTransform(pointerXSpring, [-1, 1], [-12, 12]);
  const dividerYParallax = useTransform(pointerYSpring, [-1, 1], [-6, 6]);
  const dividerY = useTransform(() => dividerBaseY.get() + dividerYParallax.get());
  const dividerScaleX = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  useLayoutEffect(() => {
    const target = dividerSourceRef.current;
    if (!target) {
      return;
    }

    const updateDividerWidth = () => {
      setDividerWidth(target.getBoundingClientRect().width);
    };

    updateDividerWidth();

    const observer = new ResizeObserver(() => {
      updateDividerWidth();
    });

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [lang, copy.titleLines.length]);

  const handlePointerMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nextX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const nextY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    pointerX.set(nextX);
    pointerY.set(nextY);

    /* 同步更新磁吸鼠标坐标 */
    magnetMouseRef.current.x = e.clientX;
    magnetMouseRef.current.y = e.clientY;
    magnetMouseRef.current.active = true;
  }, [pointerX, pointerY, magnetMouseRef]);

  const handlePointerLeave = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
    magnetMouseRef.current.active = false;
  }, [pointerX, pointerY, magnetMouseRef]);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="hero-section"
    >

      {/* Content overlay — 从底部向上堆叠：标题 → 分隔线 → 玻璃面板 */}
      <div
        className="hero__content"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* 标题区 */}
        <div className="hero__title-area" ref={titleAreaRef}>
          <div className="hero__title-backdrop">
            <h1 className={`hero__title ${isChinese ? 'hero__title--compact' : ''}`}>
              {copy.titleLines.map((line, index) => (
                <MagnetText
                  key={`${lang}-${index}`}
                  tag="span"
                  ref={index === copy.titleLines.length - 1 ? dividerSourceRef : undefined}
                  className={`hero__title-line ${index > 0 ? 'hero__title-line--secondary' : ''}`}
                >
                  {line}
                </MagnetText>
              ))}
            </h1>
          </div>
        </div>

        {/* 分隔线 — 在标题与玻璃面板之间 */}
        <Motion.div
          className="hero__divider"
          style={{
            width: dividerWidth ? `${dividerWidth}px` : undefined,
            x: dividerX,
            y: dividerY,
            opacity: dividerBaseOpacity,
            scaleX: dividerScaleX,
          }}
        />

        {/* 玻璃面板 — 底部锚定，1/6vh 高度 */}
        <Motion.div
          className="hero__subtitle-area"
          style={{
            x: shellX,
            y: shellY,
            rotateX: shellRotateX,
            rotateY: shellRotateY,
            transformPerspective: 1400,
          }}
        >
          <div className="hero__subtitle-shell">
            <Motion.p className={`hero__subtitle ${isChinese ? 'hero__subtitle--compact' : ''}`}>
              {subtitleLines.map((line, index) => (
                <HeroSubtitleLine
                  key={`${lang}-${line}`}
                  line={line}
                  index={index}
                  total={subtitleLines.length}
                  scrollYProgress={scrollYProgress}
                  pointerXSpring={pointerXSpring}
                  pointerYSpring={pointerYSpring}
                />
              ))}
            </Motion.p>

            {/* 社交链接条 */}
            <div className="hero__social-bar">
              <a
                href="https://x.com/venn_foundation"
                target="_blank"
                rel="noopener noreferrer"
                className="hero__social-link"
                title={copy.socialTwitter}
              >
                <IconX className="hero__social-icon" />
                <span>{copy.socialTwitter}</span>
              </a>
              <a
                href="https://github.com/VennIntelligence/"
                target="_blank"
                rel="noopener noreferrer"
                className="hero__social-link"
                title={copy.socialGithub}
              >
                <IconGitHub className="hero__social-icon" />
                <span>{copy.socialGithub}</span>
              </a>
              <a
                href="mailto:contact@vennai.org"
                className="hero__social-link"
                title={copy.socialEmail}
              >
                <IconEmail className="hero__social-icon" />
                <span>{copy.socialEmail}</span>
              </a>
            </div>
          </div>
        </Motion.div>
      </div>
    </section>
  );
}
