import { Fragment, useCallback, useRef } from 'react';
import { motion as Motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import MagnetText from '../../components/MagnetText';
import PillarCard from '../../components/common/PillarCard';
import { IconArrowRight } from '../../components/common/SocialIcons';
import useCharMagnet from '../../hooks/useCharMagnet';
import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import useBreakpoint, { resolveHeadingLines } from '../../hooks/useBreakpoint';
import '../../styles/components/glass-button.css';
import '../../styles/sections/omega.css';

/**
 * OmegaSection — Project Ω
 *
 * 布局：
 * - Ω 标签行
 * - 大标题（磁吸字符）
 * - 副标题（结束语提升到此位置，黄金色，视觉分量仅次于标题）
 * - 单 CTA 按钮
 * - 右侧宣言（磨砂玻璃底板）
 * - 底部四支柱卡片
 */
export default function OmegaSection() {
  const { lang } = useLanguage();
  const copy = COPY.omega[lang];
  const bp = useBreakpoint();
  const lines = resolveHeadingLines(copy.headingLines, bp);

  const sectionRef = useRef(null);
  const headingH2Ref = useRef(null);

  const headingRevealRef = useRef(null);
  const headingInView = useInView(headingRevealRef, { once: true, margin: '-80px' });

  const magnetMouseRef = useCharMagnet(headingH2Ref, {
    radius: 160,
    maxY: -10,
    maxScale: 0.12,
    maxRotate: 3,
    damping: 0.10,
    sectionRef: sectionRef,
  });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const yHeading = useTransform(scrollYProgress, [0, 0.5], [120, 0]);
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
      id="omega"
      className="omega-section relative min-h-screen overflow-hidden border-t border-white/10"
      style={{ position: 'relative' }}
    >
      <div className="omega-vignette absolute inset-0 z-1 pointer-events-none" />

      <div
        className="omega-content"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* ═══ 第一屏：标签 + 标题 + 副标题 + 宣言 ═══ */}
        <div className="omega-screen-1" ref={headingRevealRef}>
          {/* Project [Ω] 标签行 */}
          <div className={`omega-subheading omega-blur-reveal ${headingInView ? 'is-revealed' : ''}`}>
            <div className="omega-subheading__line" />
            <span>{copy.subheading}</span>
            <span className="omega-badge">Ω</span>
          </div>

          {/* 两栏：左侧标题区 + 右侧宣言 */}
          <div className="omega-columns">
            {/* 左侧：大标题 + 副标题 + CTA */}
            <Motion.div
              className={`omega-heading omega-blur-reveal ${headingInView ? 'is-revealed' : ''}`}
              style={{ y: yHeading, transitionDelay: '0.15s' }}
            >
              <h2 className="omega-heading__h2" ref={headingH2Ref}>
                {lines.map((line, i) => {
                  const isLast = i === lines.length - 1;
                  return (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      <MagnetText
                        key={`${lang}-${bp}-${i}`}
                        tag="span"
                        className={isLast ? 'omega-heading__display' : 'omega-heading__light'}
                      >
                        {line}
                      </MagnetText>
                    </Fragment>
                  );
                })}
              </h2>

              {/* 副标题 — 结束语升至此位置，金色大字 */}
              <p className={`omega-subline omega-blur-reveal ${headingInView ? 'is-revealed' : ''}`}
                style={{ transitionDelay: '0.22s' }}>
                {copy.subtitle}
              </p>

              {/* 单 CTA 按钮 */}
              <div className="omega-cta-inline">
                <Link to="/blog/five-backtest-traps" className="glass-btn glass-btn--gold">
                  {copy.cta}
                  <IconArrowRight className="glass-btn__arrow" />
                </Link>
              </div>
            </Motion.div>

            {/* 右侧：宣言 */}
            <Motion.div
              className={`omega-manifesto omega-blur-reveal ${headingInView ? 'is-revealed' : ''}`}
              style={{ y: yBody, opacity: opBody, transitionDelay: '0.3s' }}
            >
              <p className="omega-manifesto__text">{copy.manifesto}</p>
              <p className="omega-manifesto__highlight">{copy.manifestoHighlight}</p>
            </Motion.div>
          </div>
        </div>

        {/* ═══ 第二屏：四大支柱卡片 ═══ */}
        <div className="omega-screen-2">
          <div className="omega-pillars">
            <span className="omega-pillars__label">{copy.pillarTitle}</span>
            <div className="omega-pillars__grid">
              {copy.pillars.map((pillar, i) => (
                <PillarCard key={pillar.icon} pillar={pillar} index={i} prefix="omega" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
