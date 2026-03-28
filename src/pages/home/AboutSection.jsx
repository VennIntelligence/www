import { useCallback, useRef } from 'react';
import { motion as Motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';

import MagnetText from '../../components/MagnetText';
import useCharMagnet from '../../hooks/useCharMagnet';
import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import '../../styles/sections/about.css';

/**
 * ArrowRight — 内联 SVG 箭头图标
 */
function ArrowRight({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="8,5 19,12 8,19" />
    </svg>
  );
}

/**
 * PillarCard — Project Σ 四大支柱卡片
 * 序号与标题同行显示，节省移动端垂直空间
 */
function PillarCard({ pillar, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <Motion.div
      ref={ref}
      className="about-pillar"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {/* 序号 + 标题同一行 */}
      <div className="about-pillar__header">
        <span className="about-pillar__icon">{pillar.icon}</span>
        <h3 className="about-pillar__title">{pillar.title}</h3>
      </div>
      <p className="about-pillar__desc">{pillar.desc}</p>
    </Motion.div>
  );
}

/**
 * AboutSection — Project Σ 介绍
 *
 * 布局策略：
 * - Desktop (>767px)：单屏，内容底部对齐，方块居中
 * - Mobile (≤767px)：分两屏
 *   · 第一屏：Project Σ 标签 + 标题 + CTA + manifesto（上半留空给方块）
 *   · 第二屏：四大支柱卡片
 *
 * 标题支持模糊→清晰出场 + 逐字符磁吸交互
 */
export default function AboutSection() {
  const { lang } = useLanguage();
  const copy = COPY.about[lang];
  const sectionRef = useRef(null);
  const headingH2Ref = useRef(null);

  /* 模糊→清晰出场：检测 heading 区域进入视口 */
  const headingRevealRef = useRef(null);
  const headingInView = useInView(headingRevealRef, { once: true, margin: '-80px' });

  /* 逐字符磁吸交互 — 参数比 Hero 柔和，匹配较小字号 */
  const magnetMouseRef = useCharMagnet(headingH2Ref, {
    radius: 160,    /* 影响半径（px）；默认标准值：160。About 字号较小用更小半径。 */
    maxY: -10,      /* Y 位移（px）；默认标准值：-10。 */
    maxScale: 0.12, /* 缩放增益；默认标准值：0.12。 */
    maxRotate: 3,   /* 旋转角度（deg）；默认标准值：3。 */
    damping: 0.10,  /* 弹簧阻尼；默认标准值：0.10。 */
  });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // 视差 — heading
  const yHeading = useTransform(scrollYProgress, [0, 0.5], [120, 0]);

  // 视差 — manifesto + pillars
  const yBody = useTransform(scrollYProgress, [0, 0.55], [160, 0]);
  const opBody = useTransform(scrollYProgress, [0.08, 0.35], [0, 1]);

  const handlePointerMove = useCallback((e) => {
    magnetMouseRef.current.x = e.clientX;
    magnetMouseRef.current.y = e.clientY;
    magnetMouseRef.current.active = true;
  }, [magnetMouseRef]);

  const handlePointerLeave = useCallback(() => {
    magnetMouseRef.current.active = false;
  }, [magnetMouseRef]);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="about-section"
      style={{ position: 'relative' }}
    >

      {/* 主内容 */}
      <div
        className="about-content"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* ═══ 第一屏（移动端）：标签 + 标题 + CTA + manifesto ═══ */}
        <div className="about-screen-1" ref={headingRevealRef}>
          {/* Project [Σ] 大标签 — 发光竖线 + 文字 + 白框Σ徽章 */}
          <div
            className={`about-subheading about-blur-reveal ${headingInView ? 'is-revealed' : ''}`}
          >
            <div className="about-subheading__line" />
            <span>{copy.subheading}</span>
            <span className="about-sigma-badge">Σ</span>
          </div>

          {/* 标题 + CTA + 宣言 */}
          <div className="about-columns">
            {/* 左侧：标题 + CTA 按钮 */}
            <Motion.div
              className={`about-heading about-blur-reveal ${headingInView ? 'is-revealed' : ''}`}
              style={{ y: yHeading, transitionDelay: '0.15s' }}
            >
              <h2 className="about-heading__h2" ref={headingH2Ref}>
                <MagnetText key={`${lang}-0`} tag="span" className="about-heading__light">
                  {copy.headingLines[0]}
                </MagnetText>
                <br />
                <MagnetText key={`${lang}-1`} tag="span" className="about-heading__light">
                  {copy.headingLines[1]}
                </MagnetText>
                <br />
                <MagnetText key={`${lang}-2`} tag="span" className="about-heading__display">
                  {copy.headingLines[2]}
                </MagnetText>
              </h2>

              {/* CTA 按钮紧跟标题下方 */}
              <div className="about-cta-inline">
                <Link to="/blog/project-sigma-manifesto" className="about-cta-inline__btn">
                  {copy.ctaReadMore}
                  <ArrowRight className="about-cta-inline__arrow" />
                </Link>
              </div>
            </Motion.div>

            {/* 右侧：宣言摘要 */}
            <Motion.div
              className={`about-manifesto about-blur-reveal ${headingInView ? 'is-revealed' : ''}`}
              style={{ y: yBody, opacity: opBody, transitionDelay: '0.3s' }}
            >
              <p className="about-manifesto__text">{copy.manifesto}</p>
              <p className="about-manifesto__highlight">{copy.manifestoHighlight}</p>
            </Motion.div>
          </div>
        </div>

        {/* ═══ 第二屏（移动端）：四大支柱 ═══ */}
        <div className="about-screen-2">
          <div className="about-pillars">
            <span className="about-pillars__label">{copy.pillarTitle}</span>
            <div className="about-pillars__grid">
              {copy.pillars.map((pillar, i) => (
                <PillarCard key={pillar.icon} pillar={pillar} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

