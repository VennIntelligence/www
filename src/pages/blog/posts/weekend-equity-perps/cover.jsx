/**
 * weekend-equity-perps 封面 —— 活体版："开市一致，休市分家"：
 * 一条持续向左滚动的周线，开市时段四家价格完全重合；进入休市带（阴影）后
 * 分成四条——HL 放开走、Gate 紧跟、OKX 以滤波速度爬行、冻结 index 一动不动，
 * 周一开盘再收敛回一条。
 *
 * 四条曲线都是索引 i 的确定性函数：休市带内"交易时钟"暂停（价格发现停止），
 * 分歧包络在带首带尾均为 0，所以无限滚动无跳变、任意帧可恢复。
 * viewBox 800×500，slice 裁切适配任意卡片比例。
 */

import CoverGrid from '../../components/CoverGrid';
import useCoverLoop from '../../components/useCoverLoop';

/* ── 滚动与周期参数 ── */
const STEP = 4; // 曲线采样间距(px)。调小更平滑
const SPEED = 20; // 滚动速度(px/s)
const WEEK = 75; // 一周占多少个采样点（75×4 = 300px）
const OPEN = 48; // 其中开市时段占多少个采样点（48×4 = 192px）
const X0 = 40; // 图表左缘
const X1 = 760; // 图表右缘
const MID_Y = 258; // 价格中轴
const SWING = 46; // 开市时段的漫游幅度(px)
const GAP = 62; // 周末最大分歧幅度(px)。调大四条线分得更开

const C_HL = '#7fd8c8'; // HL：放开走
const C_GATE = '#9fc7e8'; // Gate：现货腿活着，紧跟
const C_OKX = '#c9a76a'; // OKX：滤波爬行
const C_FROZ = 'rgba(226, 236, 245, 0.42)'; // 冻结 index：不动
const DIM = 'rgba(180, 214, 226, 0.45)';

const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** 确定性伪随机（周序号 → [0,1)），保证同一周永远是同一次重定价 */
const hash = (n) => {
  const s = Math.sin(n * 91.7) * 43758.545;
  return s - Math.floor(s);
};

/** 交易时钟：休市带内暂停累计 —— 不交易就没有价格发现 */
const activeClock = (i) => {
  const wk = Math.floor(i / WEEK);
  const p = i - wk * WEEK;
  return wk * OPEN + Math.min(p, OPEN);
};

/** 开市时段的漫游轨迹（多个不可公度正弦，有界不重复） */
const wander = (a) =>
  MID_Y - SWING * (0.62 * Math.sin(a * 0.055) + 0.26 * Math.sin(a * 0.017 + 2.1) + 0.12 * Math.sin(a * 0.13 + 0.7));

/** 休市分歧包络：带首为 0，中段抬起，周一开盘前收回 0（四条线重新合一） */
const envelope = (w) => smooth(w / 0.34) * (1 - smooth((w - 0.88) / 0.12));

/** 四条价格在索引 i 上的取值 */
function prices(i) {
  const wk = Math.floor(i / WEEK);
  const p = i - wk * WEEK;
  const base = wander(activeClock(i));
  if (p <= OPEN) return { hl: base, gate: base, okx: base, froz: base, closed: false };

  const w = (p - OPEN) / (WEEK - OPEN); // 休市带内进度 0→1
  const e = envelope(w);
  const d = GAP * (hash(wk) - 0.5) * 2 * e; // 本周重定价方向与幅度
  return {
    hl: base - d,
    gate: base - d * 0.9 * (1 - Math.exp(-6 * w)),
    okx: base - d * (1 - Math.exp(-2.1 * w)),
    froz: base,
    closed: true,
  };
}

export default function WeekendEquityPerpsCover() {
  const [loopRef, t] = useCoverLoop();
  const offset = t * SPEED;

  /* 可见窗口内的采样点（左右各多取一个，进出场不突兀，由 clipPath 裁切） */
  const i0 = Math.floor(offset / STEP) - 1;
  const count = Math.ceil((X1 - X0) / STEP) + 3;
  const pts = [];
  for (let k = 0; k < count; k += 1) {
    const i = i0 + k;
    pts.push({ i, x: X0 + i * STEP - offset, ...prices(i) });
  }
  const line = (key) => pts.map((pt) => `${pt.x},${pt[key]}`).join(' ');

  /* 休市带（阴影矩形），每周一条 */
  const bands = [];
  for (let wk = Math.floor(i0 / WEEK) - 1; wk <= Math.floor((i0 + count) / WEEK) + 1; wk += 1) {
    const bx = X0 + (wk * WEEK + OPEN) * STEP - offset;
    const bw = (WEEK - OPEN) * STEP;
    if (bx + bw > X0 - 40 && bx < X1 + 40) bands.push({ wk, bx, bw });
  }

  return (
    <div ref={loopRef} className="blog-cover-live">
      <svg className="blog-cover-art" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="wep-bg" cx="46%" cy="38%" r="86%">
            <stop offset="0%" stopColor="#0d1c1f" />
            <stop offset="100%" stopColor="#04080a" />
          </radialGradient>
          <clipPath id="wep-clip">
            <rect x="32" y="70" width="736" height="380" />
          </clipPath>
        </defs>

        <rect width="800" height="500" fill="url(#wep-bg)" />
        <CoverGrid stroke="rgba(120, 200, 190, 0.05)" />

        <text x="44" y="56" fill={DIM} fontSize="13" letterSpacing="4">
          168H / WEEK · 32.5H OPEN
        </text>

        <g clipPath="url(#wep-clip)">
          {/* 休市带 */}
          {bands.map(({ wk, bx, bw }) => (
            <g key={wk}>
              <rect x={bx} y="70" width={bw} height="380" fill="rgba(226, 236, 245, 0.045)" />
              <line x1={bx} y1="70" x2={bx} y2="450" stroke="rgba(226, 236, 245, 0.2)" strokeWidth="1" strokeDasharray="5 6" />
              <text x={bx + bw / 2} y="94" fill={DIM} fontSize="12" letterSpacing="2.4" textAnchor="middle">
                MARKET CLOSED
              </text>
            </g>
          ))}

          {/* 四条价格：开市重合，休市分家，周一收敛 */}
          <polyline points={line('froz')} fill="none" stroke={C_FROZ} strokeWidth="1.6" strokeDasharray="7 6" />
          <polyline points={line('okx')} fill="none" stroke={C_OKX} strokeWidth="2" opacity="0.85" />
          <polyline points={line('gate')} fill="none" stroke={C_GATE} strokeWidth="2.2" opacity="0.9" />
          <polyline points={line('hl')} fill="none" stroke={C_HL} strokeWidth="2.8" />
        </g>

        {/* 图例 */}
        {[
          ['HL', C_HL],
          ['Gate', C_GATE],
          ['OKX', C_OKX],
          ['frozen', C_FROZ],
        ].map(([label, color], k) => (
          <g key={label} transform={`translate(${44 + k * 108}, 476)`}>
            <line x1="0" y1="-4" x2="22" y2="-4" stroke={color} strokeWidth="2.6" />
            <text x="30" y="0" fill={DIM} fontSize="13">
              {label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
