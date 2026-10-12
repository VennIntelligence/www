/**
 * time-manager-part-2 封面 — 亮色极简沙漏。
 * 纸面底 + 墨线玻璃 + 一色细沙，再无其他。
 *
 * 循环剧本（7s，所有状态是 t 的闭式函数，任意帧可恢复）：
 *   0–0.35s   落定：翻转后沙块从上盖滑到颈口
 *   0.35–6.3s 流沙：上腔见底、细流不断、下腔堆出沙丘
 *   6.3–7s    翻转：整只沙漏绕中心转 180°（玻璃对称，转完即下一轮）
 *
 * viewBox 800×500，slice 裁切适配任意卡片比例。
 */

import CoverGrid from '../../components/CoverGrid';
import useCoverLoop from '../../components/useCoverLoop';

/* ── 剧本参数 ── */
const CYCLE = 7; // 循环时长（秒）。调大流沙更舒缓
const SETTLE = 0.35; // 落定时长（秒）
const FLIP_AT = 6.3; // 开始翻转的时刻（秒）；FLIP_AT − SETTLE 即流沙时长

/* ── 几何（视口 800×500，沙漏居中）── */
const CX = 400;
const CY = 250;
const NECK = 4; // 颈口半宽（px）
const BULB_W = 78; // 腔体最大半宽（px）
const BULB_TOP = 112; // 上腔顶部 y；下腔关于 CY 镜像
const SAND_H = 90; // 满腔沙高（px）
const MOUND_H = 95; // 下腔沙丘满高（px）
const MOUND_PEAK = 16; // 沙丘尖顶相对平面的抬高（px）

/* ── 色板（与文章图表同源：墨线 + 虚拟时间蓝）── */
const INK = '#16181d';
const SAND = '#1f4e9c';
const GRID = 'rgba(22, 24, 29, 0.05)';

const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

/** 剧本状态：p = 流沙进度 0→1，settle = 落定进度 0→1，angle = 翻转角 */
function stateAt(t) {
  const tau = ((t % CYCLE) + CYCLE) % CYCLE;
  if (tau < SETTLE) return { p: 0, settle: tau / SETTLE, angle: 0 };
  if (tau < FLIP_AT) return { p: (tau - SETTLE) / (FLIP_AT - SETTLE), settle: 1, angle: 0 };
  return { p: 1, settle: 1, angle: 180 * easeInOut((tau - FLIP_AT) / (CYCLE - FLIP_AT)) };
}

/** 上腔轮廓（下腔用 scale(1,-1) 镜像） */
const BULB_PATH = [
  `M ${CX - BULB_W} ${BULB_TOP}`,
  `C ${CX - BULB_W} ${BULB_TOP + 92}, ${CX - NECK - 6} ${CY - 18}, ${CX - NECK} ${CY}`,
  `L ${CX + NECK} ${CY}`,
  `C ${CX + NECK + 6} ${CY - 18}, ${CX + BULB_W} ${BULB_TOP + 92}, ${CX + BULB_W} ${BULB_TOP}`,
  'Z',
].join(' ');

export default function TimeManagerCover() {
  // freezeAt=3：reduced-motion 代表帧停在流沙中段
  const [loopRef, t] = useCoverLoop({ freezeAt: 3 });
  const { p, settle, angle } = stateAt(t);

  /* 上腔沙：从颈口向上堆到 topLevel；落定阶段整块从上盖滑下 */
  const topLevel = CY - SAND_H * (1 - p);
  const settleShift = -(CY - SAND_H - BULB_TOP) * (1 - easeInOut(settle));
  /* 下腔沙丘：从下盖（上腔顶的镜像）向上堆，平面 + 尖顶 */
  const moundFloor = 2 * CY - BULB_TOP;
  const moundY = moundFloor - MOUND_H * p;
  const streamOn = settle >= 1 && p > 0 && p < 1;

  return (
    <div ref={loopRef} className="blog-cover-live">
      <svg className="blog-cover-art" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="tm-bg" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#efeee8" />
          </radialGradient>
          <clipPath id="tm-top">
            <path d={BULB_PATH} />
          </clipPath>
          <clipPath id="tm-bottom">
            <path d={BULB_PATH} transform={`translate(0 ${2 * CY}) scale(1 -1)`} />
          </clipPath>
        </defs>

        <rect width="800" height="500" fill="url(#tm-bg)" />
        <CoverGrid stroke={GRID} />

        <g transform={`rotate(${angle} ${CX} ${CY})`}>
          {/* 上腔沙 */}
          <g clipPath="url(#tm-top)">
            <rect x={CX - BULB_W} y={topLevel + settleShift} width={BULB_W * 2} height={CY - topLevel + 2} fill={SAND} />
          </g>
          {/* 下腔沙丘 */}
          <g clipPath="url(#tm-bottom)">
            <path
              d={`M ${CX - BULB_W} ${moundFloor} L ${CX - BULB_W} ${moundY} L ${CX} ${moundY - MOUND_PEAK * p} L ${CX + BULB_W} ${moundY} L ${CX + BULB_W} ${moundFloor} Z`}
              fill={SAND}
            />
          </g>
          {/* 细流 */}
          {streamOn && <line x1={CX} y1={CY} x2={CX} y2={moundY - MOUND_PEAK * p} stroke={SAND} strokeWidth="2" strokeLinecap="round" />}

          {/* 玻璃轮廓 */}
          <path d={BULB_PATH} fill="none" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <path d={BULB_PATH} transform={`translate(0 ${2 * CY}) scale(1 -1)`} fill="none" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />

          {/* 上下盖板 */}
          <rect x={CX - BULB_W - 22} y={BULB_TOP - 14} width={(BULB_W + 22) * 2} height="12" rx="2" fill={INK} />
          <rect x={CX - BULB_W - 22} y={500 - BULB_TOP + 2} width={(BULB_W + 22) * 2} height="12" rx="2" fill={INK} />
        </g>
      </svg>
    </div>
  );
}
