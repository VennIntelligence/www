import { Fragment, useCallback, useRef } from 'react';
import { motion as Motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import MagnetText from '../../components/MagnetText';
import ClosedLoopStage from '../../components/ClosedLoopStage';
import RolloutWall from '../../components/RolloutWall';
import { IconArrowRight, IconLoop } from '../../components/common/SocialIcons';
import useCharMagnet from '../../hooks/useCharMagnet';
import { COPY } from '../../config/i18n';
import { DRIVE_MOSAIC_CLIPS } from '../../config/driveClips';
import { useLanguage } from '../../context/useLanguage';
import useBreakpoint, { resolveHeadingLines } from '../../hooks/useBreakpoint';
import '../../styles/sections/drive.css';

/**
 * DriveSection — 自动驾驶项目（NVIDIA AlpaSim E2E 闭环挑战赛 2026），Hero 之后第一个区块
 *
 * 层次（自下而上）：回放马赛克（CARLA 真实场景 mp4）→ 遮罩 → 文字与闭环示意卡片。
 * 区块背景不透明：UnifiedStage 的液滴在其下方变成立方体，滚到 Σ 时立方体已就位。
 *
 * 布局与 Σ / Ω 同一套节奏：标签行 + 大标题（磁吸字符）+ 副标题 + 两个 CTA，
 * 右侧放大号的闭环重规划示意（ClosedLoopStage）卡片。
 */
export default function DriveSection() {
  const { lang } = useLanguage();
  const copy = COPY.drive[lang];
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
    sectionRef,
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
    <section ref={sectionRef} id="drive" className="drive-section">
      <div className="drive-mosaic" aria-hidden="true">
        <RolloutWall clips={DRIVE_MOSAIC_CLIPS} variant="mosaic" />
      </div>
      <div className="drive-vignette" />

      <div
        className="drive-content"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div className="drive-screen-1" ref={headingRevealRef}>
          <div className={`drive-subheading drive-reveal ${headingInView ? 'is-revealed' : ''}`}>
            <div className="drive-subheading__line" />
            <span>{copy.subheading}</span>
            <span className="drive-badge">
              <IconLoop className="drive-badge__icon" />
            </span>
          </div>

          <div className="drive-columns">
            <Motion.div
              className={`drive-heading drive-reveal ${headingInView ? 'is-revealed' : ''}`}
              style={{ y: yHeading, transitionDelay: '0.15s' }}
            >
              <h2 className="drive-heading__h2" ref={headingH2Ref}>
                {lines.map((line, i) => {
                  const isLast = i === lines.length - 1;
                  return (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      <MagnetText
                        key={`${lang}-${bp}-${i}`}
                        tag="span"
                        className={isLast ? 'drive-heading__display' : 'drive-heading__light'}
                      >
                        {line}
                      </MagnetText>
                    </Fragment>
                  );
                })}
              </h2>

              <p
                className={`drive-subline drive-reveal ${headingInView ? 'is-revealed' : ''}`}
                style={{ transitionDelay: '0.22s' }}
              >
                {copy.subtitle}
              </p>

              <div className="drive-cta-inline">
                <Link to="/drive" className="drive-cta">
                  {copy.cta}
                  <IconArrowRight className="drive-cta__arrow" />
                </Link>
                <Link to="/drive#rollouts" className="drive-cta drive-cta--ghost">
                  {copy.wallMore}
                  <IconArrowRight className="drive-cta__arrow" />
                </Link>
              </div>
            </Motion.div>

            {/* 右侧：闭环重规划示意卡片 */}
            <Motion.div
              className={`drive-instrument drive-reveal ${headingInView ? 'is-revealed' : ''}`}
              style={{ y: yBody, opacity: opBody, transitionDelay: '0.3s' }}
            >
              <span className="drive-instrument__label">{copy.instrumentLabel}</span>
              <div className="drive-instrument__stage">
                <ClosedLoopStage hud={copy.hud} />
              </div>
            </Motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
