import { useCallback, useRef } from 'react';
import { motion as Motion, useScroll, useTransform, useInView } from 'framer-motion';
import MagnetText from '../../components/MagnetText';
import useCharMagnet from '../../hooks/useCharMagnet';
import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import '../../styles/sections/product-preview.css';

/**
 * PillarCard — Project Ω 四大支柱卡片
 */
function PillarCard({ pillar, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <Motion.div
      ref={ref}
      className="product-pillar"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div className="product-pillar__header">
        <span className="product-pillar__icon">{pillar.icon}</span>
        <h3 className="product-pillar__title">{pillar.title}</h3>
      </div>
      <p className="product-pillar__desc">{pillar.desc}</p>
    </Motion.div>
  );
}

/**
 * ProductSection — Project Ω
 *
 * 布局：
 * - Ω 标签行
 * - 大标题（磁吸字符）
 * - 副标题（结束语提升到此位置，黄金色，视觉分量仅次于标题）
 * - 单 CTA 按钮
 * - 右侧宣言（磨砂玻璃底板）
 * - 底部四支柱卡片
 */
export default function ProductSection() {
  const { lang } = useLanguage();
  const copy = COPY.product[lang];

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
      id="product"
      className="product-section relative min-h-screen overflow-hidden border-t border-white/10"
      style={{ position: 'relative' }}
    >
      <div className="product-vignette absolute inset-0 z-1 pointer-events-none" />

      <div
        className="product-content"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* ═══ 第一屏：标签 + 标题 + 副标题 + 宣言 ═══ */}
        <div className="product-screen-1" ref={headingRevealRef}>
          {/* Project [Ω] 标签行 */}
          <div className={`product-subheading product-blur-reveal ${headingInView ? 'is-revealed' : ''}`}>
            <div className="product-subheading__line" />
            <span>{copy.subheading}</span>
            <span className="product-omega-badge">Ω</span>
          </div>

          {/* 两栏：左侧标题区 + 右侧宣言 */}
          <div className="product-columns">
            {/* 左侧：大标题 + 副标题 + CTA */}
            <Motion.div
              className={`product-heading product-blur-reveal ${headingInView ? 'is-revealed' : ''}`}
              style={{ y: yHeading, transitionDelay: '0.15s' }}
            >
              <h2 className="product-heading__h2" ref={headingH2Ref}>
                <MagnetText key={`${lang}-0`} tag="span" className="product-heading__light">
                  {copy.headingLines[0]}
                </MagnetText>
                <br />
                <MagnetText key={`${lang}-1`} tag="span" className="product-heading__light">
                  {copy.headingLines[1]}
                </MagnetText>
                <br />
                <MagnetText key={`${lang}-2`} tag="span" className="product-heading__display">
                  {copy.headingLines[2]}
                </MagnetText>
              </h2>

              {/* 副标题 — 结束语升至此位置，金色大字 */}
              <p className={`product-subline product-blur-reveal ${headingInView ? 'is-revealed' : ''}`}
                style={{ transitionDelay: '0.22s' }}>
                {copy.subtitle}
              </p>

              {/* 单 CTA 按钮 */}
              <div className="product-cta-inline">
                <button className="product-cta product-cta--ghost">
                  {copy.cta}
                </button>
              </div>
            </Motion.div>

            {/* 右侧：宣言 */}
            <Motion.div
              className={`product-manifesto product-blur-reveal ${headingInView ? 'is-revealed' : ''}`}
              style={{ y: yBody, opacity: opBody, transitionDelay: '0.3s' }}
            >
              <p className="product-manifesto__text">{copy.manifesto}</p>
              <p className="product-manifesto__highlight">{copy.manifestoHighlight}</p>
            </Motion.div>
          </div>
        </div>

        {/* ═══ 第二屏：四大支柱卡片 ═══ */}
        <div className="product-screen-2">
          <div className="product-pillars">
            <span className="product-pillars__label">{copy.pillarTitle}</span>
            <div className="product-pillars__grid">
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
