import { Fragment, useCallback, useRef } from 'react';
import { motion as Motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import MagnetText from '../../components/MagnetText';
import SceneReplayStage from '../../components/SceneReplayStage';
import RolloutWall from '../../components/RolloutWall';
import { IconArrowRight, IconLoop } from '../../components/common/SocialIcons';
import useCharMagnet from '../../hooks/useCharMagnet';
import { COPY } from '../../config/i18n';
import { DRIVE_MOSAIC_CLIPS, DRIVE_REPLAY_SCENES } from '../../config/driveClips';
import { useLanguage } from '../../context/useLanguage';
import useBreakpoint, { resolveHeadingLines } from '../../hooks/useBreakpoint';
import '../../styles/sections/drive.css';

/**
 * DriveSection — 自动驾驶项目（NVIDIA AlpaSim E2E 闭环挑战赛 2026），Hero 之后第一个区块
 *
 * 层次（自下而上）：回放马赛克（CARLA 真实场景 mp4）→ 遮罩 → 居中放大的真实场景回放画布
 * （nuPlan / NAVSIM 日志俯视回放，透明背景，暗化与羽化由 .drive-stage 提供）→ 文字。
 * 区块背景不透明：UnifiedStage 的液滴在其下方变成立方体，滚到 Σ 时立方体已就位。
 *
 * 布局与 Σ / Ω 同一套节奏：标签行 + 大标题（磁吸字符）+ 副标题 + 一个 CTA。
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
      <div className="drive-stage" aria-hidden="true">
        <SceneReplayStage scenes={DRIVE_REPLAY_SCENES} />
      </div>

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
            </div>
          </Motion.div>
        </div>
      </div>
    </section>
  );
}
