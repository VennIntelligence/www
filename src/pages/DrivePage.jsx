import { useState } from 'react';
import Footer from '../components/Footer';
import ClosedLoopStage from '../components/ClosedLoopStage';
import RolloutWall from '../components/RolloutWall';
import PillarCard from '../components/common/PillarCard';
import { IconArrowRight } from '../components/common/SocialIcons';
import DriveTimeline from './drive/DriveTimeline';
import { COPY } from '../config/i18n';
import { CHALLENGE_URL, CHALLENGE_MILESTONES, DRIVE_WALL_CLIPS, challengePhase } from '../config/driveClips';
import { useLanguage } from '../context/useLanguage';
import '../styles/sections/drive.css';
import '../styles/pages/drive-page.css';

/**
 * DrivePage — 自动驾驶项目页（/drive）
 *
 * 赛后长期保留的页面：赛事介绍与身份、时间线、方法、闭环回放照片墙、结果。
 * 结果区块的文案全部在 i18n drive.page.results 里，出结果后只改文案即可。
 */
export default function DrivePage() {
  const { lang } = useLanguage();
  const copy = COPY.drive[lang];
  const page = copy.page;
  // 页面加载时刻取一次，时间线与状态胶囊共用，渲染保持纯净
  const [now] = useState(() => Date.now());
  const phase = challengePhase(CHALLENGE_MILESTONES, now);

  return (
    <main className="drive-page">
      <div className="drive-page__inner">
        {/* ═══ 头部：身份 + 标题 + 导语 + 事实表 ═══ */}
        <header className="drive-hero">
          <div className="drive-hero__text">
            <p className="drive-hero__eyebrow">{page.eyebrow}</p>
            <h1 className="drive-hero__title">{page.title}</h1>
            <p className="drive-hero__lead">{page.lead}</p>

            <dl className="drive-facts">
              {page.facts.map((fact) => (
                <div key={fact.label} className="drive-facts__row">
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
              <div className="drive-facts__row">
                <dt>{page.status.label}</dt>
                <dd>
                  <span className={`drive-status drive-status--${phase}`}>{page.status[phase]}</span>
                </dd>
              </div>
            </dl>

            <a href={CHALLENGE_URL} target="_blank" rel="noopener noreferrer" className="drive-cta">
              {page.challengeLink}
              <IconArrowRight className="drive-cta__arrow" />
            </a>
          </div>

          <div className="drive-hero__stage">
            <ClosedLoopStage hud={copy.hud} />
          </div>
        </header>

        {/* ═══ 时间线 ═══ */}
        <section className="drive-block">
          <h2 className="drive-block__title">{page.timelineTitle}</h2>
          <DriveTimeline milestones={CHALLENGE_MILESTONES} labels={page.timeline} lang={lang} now={now} />
        </section>

        {/* ═══ 方法 ═══ */}
        <section className="drive-block">
          <h2 className="drive-block__title">{page.approachTitle}</h2>
          <div className="drive-pillars">
            {copy.pillars.map((pillar, i) => (
              <PillarCard key={pillar.icon} pillar={pillar} index={i} prefix="drive" />
            ))}
          </div>
        </section>

        {/* ═══ 闭环回放照片墙 ═══ */}
        <section className="drive-block" id="rollouts">
          <h2 className="drive-block__title">{page.wallTitle}</h2>
          <p className="drive-block__intro">{page.wallIntro}</p>
          <RolloutWall clips={DRIVE_WALL_CLIPS} captions={page.clips} variant="wall" />
          <p className="drive-block__note">{page.disclosure}</p>
        </section>

        {/* ═══ 结果 ═══ */}
        <section className="drive-block">
          <h2 className="drive-block__title">{page.resultsTitle}</h2>
          <div className="drive-results">
            <p className="drive-results__lead">{page.resultsPending}</p>
            <dl className="drive-facts drive-facts--results">
              {page.results.map((row) => (
                <div key={row.label} className="drive-facts__row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
