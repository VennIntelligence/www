/**
 * driveClips — 自动驾驶项目（/drive 与首页 Drive 区块）的静态配置
 *
 * - 赛事常量：官网地址、赛程里程碑、阶段判断
 * - 闭环回放片段库：视频在 public/video/drive/<id>.mp4，封面为同名 .webp（由 scripts/drive-clips.sh 生成）
 *   页面照片墙的片段文案在 i18n.js → drive.page.clips 里按 id 查找；首页马赛克背景不配文案
 */

/* 赛事官网 */
export const CHALLENGE_URL = 'https://nvidia-alpasime2eclosedloopchallenge2026.hf.space/';

/* 赛程里程碑（ISO 日期），顺序与 i18n drive.page.timeline 一一对应。
   倒数第二项是提交截止，最后一项是公布结果：状态胶囊按这两个日期判断阶段。 */
export const CHALLENGE_MILESTONES = [
  '2026-06-15',
  '2026-09-09',
  '2026-09-15',
  '2026-10-18',
  '2026-10-31',
  '2026-11-15',
];

/**
 * challengePhase — 根据里程碑判断赛事阶段
 * @param {string[]} milestones  ISO 日期数组（倒数第二项提交截止，最后一项公布结果）
 * @param {number} now           时间戳
 * @returns {'live' | 'judging' | 'final'}
 */
export function challengePhase(milestones, now) {
  const close = Date.parse(milestones[milestones.length - 2]);
  const final = Date.parse(milestones[milestones.length - 1]);
  if (now < close) return 'live';
  if (now < final) return 'judging';
  return 'final';
}

/* 视频 / 封面所在目录（public 下，不经打包） */
export const DRIVE_CLIP_BASE = '/video/drive/';

/* 片段库：id 对应文件名与文案 key；sim 是仿真器标签（专有名词，不翻译）；
   w / h 是视频像素尺寸，用来给瓦片设置 aspect-ratio，避免加载时跳动。 */
const LIBRARY = [
  // CARLA（Bench2Drive）：第三人称视角 + 模型自己的 road / wide 输入，暗色真实场景
  { id: 'carla-night-blocked', sim: 'CARLA', w: 560, h: 224 },
  { id: 'carla-blocked-drive', sim: 'CARLA', w: 560, h: 224 },
  { id: 'carla-blocked-merge', sim: 'CARLA', w: 560, h: 224 },
  { id: 'carla-bypass', sim: 'CARLA', w: 600, h: 240 },
  { id: 'carla-bypass-b', sim: 'CARLA', w: 560, h: 224 },
  { id: 'carla-bypass-merge', sim: 'CARLA', w: 600, h: 240 },
  { id: 'carla-collision', sim: 'CARLA', w: 600, h: 240 },
  { id: 'carla-collision-merge', sim: 'CARLA', w: 600, h: 240 },
  { id: 'carla-red-light', sim: 'CARLA', w: 360, h: 318 },
  { id: 'carla-red-light-b', sim: 'CARLA', w: 600, h: 240 },
  { id: 'carla-red-light-c', sim: 'CARLA', w: 408, h: 360 },
  { id: 'carla-red-light-d', sim: 'CARLA', w: 336, h: 296 },
  { id: 'carla-stop-merge', sim: 'CARLA', w: 640, h: 256 },
  { id: 'carla-tight-curve', sim: 'CARLA', w: 504, h: 180 },
  { id: 'carla-sharp-turn', sim: 'CARLA', w: 592, h: 216 },
  // nuPlan 真实相机场景（navhard stage two），一个象限是反应式 BEV
  { id: 'navhard-collision', sim: 'nuPlan', w: 640, h: 428 },
  { id: 'navhard-road-edge', sim: 'nuPlan', w: 640, h: 428 },
  { id: 'navhard-stopped-slow', sim: 'nuPlan', w: 640, h: 428 },
  { id: 'navhard-wrong-direction', sim: 'nuPlan', w: 640, h: 428 },
  // 两段白底取证仪表板，只进页面照片墙
  { id: 'nuplan-turn-neighbour', sim: 'nuPlan', w: 640, h: 400 },
  { id: 'pai-pedestrian', sim: 'PAI', w: 640, h: 396 },
];

const byId = (ids) => ids.map((id) => LIBRARY.find((clip) => clip.id === id)).filter(Boolean);

/* /drive 页面照片墙：以真实场景为主，白底仪表板最多两段 */
export const DRIVE_WALL_CLIPS = byId([
  'carla-night-blocked',
  'navhard-collision',
  'carla-bypass',
  'carla-tight-curve',
  'navhard-road-edge',
  'carla-red-light',
  'nuplan-turn-neighbour',
  'carla-collision',
  'navhard-stopped-slow',
  'carla-stop-merge',
  'carla-sharp-turn',
  'pai-pedestrian',
  'navhard-wrong-direction',
  'carla-blocked-merge',
  'carla-bypass-merge',
]);

/* 首页 Drive 区块的马赛克背景：12 段宽幅 CARLA 暗色场景，无文案；
   桌面 3 列 × 4 行铺满区块，平板 2 列 × 5 行、手机 1 列 × 6 行只播前几格（见 rollout-wall.css） */
export const DRIVE_MOSAIC_CLIPS = byId([
  'carla-night-blocked',
  'carla-bypass',
  'carla-red-light-b',
  'carla-blocked-drive',
  'carla-tight-curve',
  'carla-collision',
  'carla-bypass-b',
  'carla-stop-merge',
  'carla-blocked-merge',
  'carla-sharp-turn',
  'carla-collision-merge',
  'carla-bypass-merge',
]);
