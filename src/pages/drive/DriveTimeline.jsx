import { useMemo } from 'react';

/**
 * DriveTimeline — 赛程时间线
 *
 * 桌面横向轨道、手机纵向列表（见 drive-page.css）。
 * 已过的节点实心，下一个节点呼吸高亮，未来节点空心；
 * 轨道的进度填充按 now 在首尾里程碑之间的位置计算。
 *
 * props:
 *   milestones — ISO 日期数组（config/driveClips.js）
 *   labels     — 与里程碑一一对应的 i18n 文案
 *   lang       — 当前语言，决定日期格式
 *   now        — 页面加载时刻的时间戳（由页面用 useState 惰性初始化一次，保持渲染纯净）
 */
export default function DriveTimeline({ milestones, labels, lang, now }) {
  const start = Date.parse(milestones[0]);
  const end = Date.parse(milestones[milestones.length - 1]);
  const progress = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const nextIndex = milestones.findIndex((date) => Date.parse(date) > now);
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    [lang],
  );

  return (
    <ol className="drive-timeline" style={{ '--timeline-progress': progress }}>
      {milestones.map((date, i) => {
        const state = Date.parse(date) <= now ? 'past' : i === nextIndex ? 'next' : 'future';
        return (
          <li key={date} className={`drive-timeline__item drive-timeline__item--${state}`}>
            <span className="drive-timeline__dot" />
            <time className="drive-timeline__date" dateTime={date}>
              {formatter.format(new Date(date))}
            </time>
            <span className="drive-timeline__label">{labels[i]}</span>
          </li>
        );
      })}
    </ol>
  );
}
