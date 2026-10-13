import { useEffect, useRef } from 'react';
import { DRIVE_CLIP_BASE } from '../config/driveClips';
import '../styles/components/rollout-wall.css';

/**
 * RolloutWall — 闭环回放片段墙
 *
 * 每格是一段静音循环的 mp4（由 jev-drive 的 GIF 转码而来），封面为同名 webp。
 * 加载约定（非首屏视频）：
 *   - preload="none"，封面 poster 与 src 都直到瓦片首次进入视口才设置（首屏零请求）
 *   - 离开视口即 pause()，回到视口再 play()
 *   - 页面切到后台时全部 pause()，切回时只恢复仍在视口内的
 *   - display:none 的瓦片（马赛克在小屏隐藏的格子）永远不会相交，也就不会加载
 *
 * props:
 *   clips    — [{ id, sim, w, h }]，见 config/driveClips.js
 *   captions — { [id]: 文案 }；传 null 则不渲染标签与说明（纯背景）
 *   variant  — 'wall'（瀑布流，默认）| 'mosaic'（首页区块全幅背景，无交互）
 */
export default function RolloutWall({ clips, captions = null, variant = 'wall' }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const videos = Array.from(root.querySelectorAll('video'));
    const visible = new Set();

    const play = (video) => {
      if (!video.getAttribute('src')) {
        video.poster = video.dataset.poster;
        video.src = video.dataset.src;
        video.load();
      }
      video.play().catch(() => {});
    };

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const video = entry.target;
        if (entry.isIntersecting) {
          visible.add(video);
          if (document.visibilityState === 'visible') play(video);
        } else {
          visible.delete(video);
          video.pause();
        }
      }
    }, { threshold: 0.2, rootMargin: '160px 0px' });
    videos.forEach((video) => observer.observe(video));

    const onVisibility = () => {
      if (document.visibilityState === 'visible') visible.forEach(play);
      else videos.forEach((video) => video.pause());
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      videos.forEach((video) => video.pause());
    };
  }, [clips]);

  return (
    <div ref={rootRef} className={`rollout-wall rollout-wall--${variant}`}>
      {clips.map((clip) => (
        <figure
          key={clip.id}
          className={`rollout-tile ${clip.w / clip.h > 2.1 ? 'rollout-tile--wide' : ''}`.trim()}
          style={{ '--tile-ratio': `${clip.w} / ${clip.h}` }}
        >
          <video
            muted
            loop
            playsInline
            preload="none"
            data-poster={`${DRIVE_CLIP_BASE}${clip.id}.webp`}
            data-src={`${DRIVE_CLIP_BASE}${clip.id}.mp4`}
          />
          {captions && (
            <>
              <span className="rollout-tile__sim">{clip.sim}</span>
              <figcaption className="rollout-tile__caption">{captions[clip.id]}</figcaption>
            </>
          )}
        </figure>
      ))}
    </div>
  );
}
