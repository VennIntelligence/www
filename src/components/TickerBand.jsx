import { useEffect, useRef, useState } from 'react';
import useSectionFreeze from '../hooks/useSectionFreeze';
import { T0, STEP, KLINES } from './tickerTapeData';
import '../styles/components/ticker-band.css';

/**
 * TickerBand — 全站公共「行情作战带」。
 *
 * 用法：文章 meta 里声明 `tickerBand: true`，BlogArticlePage 会在大标题
 * 上方渲染一条；也可在任意页面直接 <TickerBand />（自带全出血布局）。
 *
 * 内容：真实 BTC/USDT 15m 行情向左流动；固定「NOW 分界线」左侧为实色
 * 已发生行情，右侧为半透明未来区。触发点分两类 —— signal（闪电）与
 * timer（表盘），虚线连到 K 线；分界线扫到触发点时派发 agent 机器人
 * （偶发两个），原地完成真实系统主流程：
 *   trigger 触发 → run_code · get_kline() → 思考 → run_code · signal()
 *   → 决策 → 留下水滴钉消失。
 * 决策字母与配色对齐 trigger_trade/web 的真实标记体系：
 *   O 开仓 / A 加仓 / R 减仓 / X 平仓（EXIT）/ T trailing；H 观望不留标记。
 * 决策 = 真实后市走向 × 仓位状态机。按住左右拖动 = 逐帧回放。
 */

/* —— 磁带参数 ——
   BAND_H   带高（px）。桌面默认 380，手机默认 300。调大行情更舒展。
   SPACING  每根 K 线像素宽。默认 12。
   SPEED    自动流速（px/秒）。默认 34 ≈ 每根 0.35s。
   DIV_F    分界线位置（宽度比例）。默认 0.60。
   SKIT     机器人剧情总长（px，从触发到消失）。默认 250。
   剧情分段（px）：<60 查行情 · <115 思考 · <168 run_code · 其余 决策。 */
const BAND_H = 380;
const BAND_H_SM = 300;
const SPACING = 12;
const SPEED = 34;
const DIV_F = 0.6;
const SKIT = 250;
const STG = { query: 60, think: 115, code: 168 };
/* 决策落点：机器人从触发到下达指令，磁带已前进 PIN_DELAY 根 ——
   水滴钉落在「下单时刻」的当根 K 线上（果），不落回触发点（因）。 */
const PIN_DELAY = Math.round(STG.code / SPACING);
const N = KLINES.length;

/* 带内调色板：全部走 CSS 变量（默认值与 paper 主题的浅色版都定义在
   ticker-band.css），SVG 的 fill/stroke 直接引用 var()，整站换主题时随之切换。 */
const P = {
  paper: 'var(--tkb-paper)',
  inner: 'var(--tkb-inner)',
  ink: 'var(--tkb-ink)',
  soft: 'var(--tkb-soft)',
  faint: 'var(--tkb-faint)',
  line: 'var(--tkb-line)',
  blue: 'var(--tkb-blue)',
  red: 'var(--tkb-red)',
  green: 'var(--tkb-green)',
  gray: 'var(--tkb-gray)',
};

const C = KLINES.map(([o, h, l, c, v], i) => ({ o, h, l, c, v, up: c >= o, t: T0 + i * STEP }));

/* —— 触发点选择（基于真实数据）——
   两类触发：signal（大振幅 K 线，前 12%，闪电图标）与 timer（距上次
   触发 ≥26 根的定时边界，表盘图标）；最小间距 12 根；每第 4 个触发
   追加一个相邻 2 根的伴发触发（真实系统里同一边界可能派发多个）。
   决策由「真实后市走向 × 仓位状态机」给出：
   空仓遇信号 → B/S 开仓；持仓同向 → H 观望；持仓反向 → C 平仓。 */
/* 展示用杠杆与保证金（与真实系统一致：PnL% = pnl / margin × 100）。
   LEV 默认 5，MARGIN 默认 $2,000 → 名义仓位 $10,000。 */
const LEV = 5;
const MARGIN = 2000;
/* trailing 默认回调率（对齐 DEFAULT_TRAILING_CALLBACK_RATE = 0.03） */
const TRAIL_RATE = 0.03;

const { TRIGGERS, EPISODES } = (() => {
  const ranges = C.map((k) => (k.h - k.l) / k.c).sort((a, b) => a - b);
  const thr = ranges[Math.floor(ranges.length * 0.88)];
  const names = ['agent·α', 'agent·β', 'agent·γ', 'agent·δ'];
  const hiBound = N - PIN_DELAY - 4;

  /* 第一遍：触发点位置与类型 */
  const sites = [];
  let last = -99;
  for (let i = 6; i < hiBound; i += 1) {
    const big = (C[i].h - C[i].l) / C[i].c >= thr;
    if ((big && i - last >= 12) || i - last >= 26) {
      sites.push({ i, row: 0, type: big ? 'signal' : 'timer' });
      if (sites.length % 4 === 3 && i + 2 < hiBound) {
        sites.push({ i: i + 2, row: 1, type: 'signal' });
        last = i + 2;
      } else last = i;
    }
  }

  const dir3 = (j) => {
    const pct = (C[j + 3].c - C[j].c) / C[j].c;
    return pct > 0.0012 ? 1 : pct < -0.0012 ? -1 : 0;
  };
  const mkTpSl = (dir, pxv) =>
    dir > 0 ? { tp: pxv * 1.011, sl: pxv * 0.9935 } : { tp: pxv * 0.989, sl: pxv * 1.0065 };
  const pinOf = (site) => site.i + PIN_DELAY;
  const lastPin = pinOf(sites[sites.length - 1]);

  /* 逐根 K 线推进的持仓模拟：真实撮合语义 ——
     每根先处理落在该根上的触发决策（A/R/T 或反向信号平仓 X），
     再查 TP/SL 是否被该根高低点击中（命中即以触价收线：P 止盈 / L 止损）。 */
  const simulate = (k, dir) => {
    const openPin = pinOf(sites[k]);
    const entry = C[openPin].c;
    let { tp, sl } = mkTpSl(dir, entry);
    const segs = [{ fromPin: openPin, tp, sl }];
    const actions = [];
    let flip = 0;
    let m = k + 1;
    for (let idx = openPin + 1; idx <= lastPin; idx += 1) {
      while (m < sites.length && pinOf(sites[m]) === idx) {
        const d3s = dir3(idx);
        if (d3s === -dir) {
          return { dir, openPin, entry, closePin: idx, exit: C[idx].c, closeType: 'signal', segs, actions, lastSite: m };
        }
        flip += 1;
        const act = d3s === dir ? (flip % 2 ? 'A' : 'T') : flip % 2 ? 'T' : 'R';
        const a = { siteIdx: m, pinI: idx, act };
        if (act === 'T') {
          // 顺势上移（trailing）：SL 跟价收紧，TP 外推
          if (dir > 0) {
            sl = Math.max(sl, C[idx].c * 0.9945);
            tp = Math.max(tp, C[idx].c * 1.009);
          } else {
            sl = Math.min(sl, C[idx].c * 1.0055);
            tp = Math.min(tp, C[idx].c * 0.991);
          }
          a.tpsl = { tp, sl };
          segs.push({ fromPin: idx, tp, sl });
        }
        actions.push(a);
        m += 1;
      }
      const cd = C[idx];
      if (dir > 0 ? cd.h >= tp : cd.l <= tp) {
        return { dir, openPin, entry, closePin: idx, exit: tp, closeType: 'TP', segs, actions, lastSite: m - 1 };
      }
      if (dir > 0 ? cd.l <= sl : cd.h >= sl) {
        return { dir, openPin, entry, closePin: idx, exit: sl, closeType: 'SL', segs, actions, lastSite: m - 1 };
      }
    }
    return { dir, openPin, entry, closePin: lastPin, exit: C[lastPin].c, closeType: 'signal', segs, actions, lastSite: sites.length - 1 };
  };

  /* 第二遍：开仓方向按两个方向的完整模拟盈亏选边（agent 的 alpha）；
     每第 4 个 episode 用朴素 3 根方向，允许亏损保持真实感。 */
  const trigs = [];
  const eps = [];
  let epCount = 0;
  let k = 0;
  while (k < sites.length) {
    const site = sites[k];
    const pinI = pinOf(site);
    const d3 = dir3(pinI);
    if (d3 === 0) {
      trigs.push({ i: site.i, pinI, row: site.row, name: names[k % 4], type: site.type, act: 'H' });
      k += 1;
      continue;
    }
    epCount += 1;
    let chosen;
    if (epCount % 4 === 0) chosen = simulate(k, d3);
    else {
      const a = simulate(k, 1);
      const b = simulate(k, -1);
      chosen = (a.exit - a.entry) * a.dir >= (b.exit - b.entry) * b.dir ? a : b;
    }
    const pnlPct = ((chosen.exit - chosen.entry) / chosen.entry) * chosen.dir * LEV * 100;
    trigs.push({ i: site.i, pinI, row: site.row, name: names[k % 4], type: site.type, act: 'O', dir: chosen.dir });
    for (const a of chosen.actions) {
      const s2 = sites[a.siteIdx];
      trigs.push({ i: s2.i, pinI: a.pinI, row: s2.row, name: names[a.siteIdx % 4], type: s2.type, act: a.act, ...(a.tpsl && { tpsl: a.tpsl }) });
    }
    if (chosen.closeType === 'signal') {
      const s2 = sites[chosen.lastSite];
      if (s2 && pinOf(s2) === chosen.closePin) {
        trigs.push({ i: s2.i, pinI: chosen.closePin, row: s2.row, name: names[chosen.lastSite % 4], type: s2.type, act: 'X', pnlPct });
      } else {
        trigs.push({ i: null, pinI: chosen.closePin, row: 0, name: 'exit', type: 'timer', act: 'X', pnlPct, auto: true });
      }
    } else {
      // TP/SL 命中：自动订单成交，非 agent 决策 —— 不派机器人，只落 P/L 钉
      trigs.push({
        i: null, pinI: chosen.closePin, row: 0,
        name: chosen.closeType === 'TP' ? 'take_profit' : 'stop_loss',
        type: 'signal', act: chosen.closeType === 'TP' ? 'P' : 'L',
        pnlPct, px: chosen.exit, auto: true,
      });
    }
    eps.push({
      dir: chosen.dir, openPin: chosen.openPin, entry: chosen.entry,
      closePin: chosen.closePin, exit: chosen.exit, closeType: chosen.closeType,
      actions: chosen.actions.map((a) => ({ pinI: a.pinI, act: a.act })),
      segs: chosen.segs,
    });
    k = chosen.lastSite + 1;
    while (k < sites.length && pinOf(sites[k]) <= chosen.closePin) k += 1;
  }
  return { TRIGGERS: trigs, EPISODES: eps };
})();

/* 决策钉落点索引 → 触发记录；K 线索引 → 触发点（每帧 O(1) 查找） */
const PINS = new Map(TRIGGERS.map((tr) => [tr.pinI, tr]));
const TRIG_BY_I = new Map(TRIGGERS.filter((tr) => tr.i != null).map((tr) => [tr.i, tr]));

const fmtP = (v) => v.toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtK = (v) => `${(v / 1000).toFixed(1)}k`;
const fmtT = (t) => {
  const d = new Date(t * 1000);
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

/* 决策标记配色（与 P 同一套克制色板，不再引入第二组饱和色）：
   O 开仓 钢蓝 / A 加仓 浅钢蓝 / R 减仓 暗金 / T trailing 青玉（空心）/
   X 平仓 砖红 / P 止盈成交 青玉 / L 止损成交 砖红；H 观望不留标记。 */
const ACT_TONE = { O: P.blue, A: 'var(--tkb-blue-soft)', R: 'var(--tkb-gold)', T: P.green, X: P.red, P: P.green, L: P.red, H: P.gray };
const HOLLOW = new Set(['T']);
const px = (tr) => tr.px ?? C[tr.pinI].c;
const ACT_TEXT = {
  O: (tr, c) => (c ? `OPEN ${tr.dir > 0 ? 'LONG' : 'SHORT'}` : `OPEN ${tr.dir > 0 ? 'LONG' : 'SHORT'} @ ${fmtP(px(tr))}`),
  A: (tr, c) => (c ? 'ADD 0.5×' : `ADD 0.5× @ ${fmtP(px(tr))}`),
  R: (tr, c) => (c ? 'REDUCE 50%' : `REDUCE 50% @ ${fmtP(px(tr))}`),
  T: (tr, c) => (c || !tr.tpsl ? `trail ${TRAIL_RATE * 100}%` : `trail ${TRAIL_RATE * 100}% · SL→${fmtK(tr.tpsl.sl)}`),
  X: (tr, c) => {
    const tag = tr.pnlPct != null ? ` · ${tr.pnlPct >= 0 ? '+' : ''}${tr.pnlPct.toFixed(2)}%` : '';
    return c ? `EXIT${tag}` : `EXIT @ ${fmtP(px(tr))}${tag}`;
  },
  H: () => 'hold · no action',
};

/** 触发点图标：signal = 闪电，timer = 表盘。虚线垂线连到 K 线高点。 */
function TrigIcon({ type, x, y, candleTop, tone = P.soft, alpha = 1 }) {
  return (
    <g opacity={alpha}>
      <line x1={x} y1={y + 8} x2={x} y2={candleTop - 3} stroke={tone} strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
      {type === 'signal' ? (
        <path
          d={`M${x + 1.5} ${y - 7} L${x - 3.5} ${y + 1} L${x - 0.5} ${y + 1} L${x - 1.5} ${y + 7} L${x + 3.5} ${y - 1} L${x + 0.5} ${y - 1} Z`}
          fill={tone}
        />
      ) : (
        <g>
          <circle cx={x} cy={y} r="6" fill={P.inner} stroke={tone} strokeWidth="1.4" />
          <line x1={x} y1={y} x2={x} y2={y - 4} stroke={tone} strokeWidth="1.2" />
          <line x1={x} y1={y} x2={x + 3} y2={y + 1} stroke={tone} strokeWidth="1.2" />
        </g>
      )}
    </g>
  );
}

/** 决策水滴钉：水滴里带字母（B/S/C/H），尖端落在 K 线高点上。 */
function DropPin({ x, tipY, act, alpha = 1 }) {
  const tone = ACT_TONE[act];
  const r = 7.5;
  const cy = tipY - r * 2.1;
  return (
    <g opacity={alpha}>
      <path
        d={`M${x} ${tipY} Q ${x - r * 0.9} ${tipY - r * 1.1} ${x - r} ${cy + r * 0.2} A ${r} ${r} 0 1 1 ${x + r} ${cy + r * 0.2} Q ${x + r * 0.9} ${tipY - r * 1.1} ${x} ${tipY} Z`}
        fill={HOLLOW.has(act) ? P.inner : tone}
        stroke={tone}
        strokeWidth="1.4"
      />
      <text x={x} y={cy} textAnchor="middle" dominantBaseline="central" className="tkb-mono" fontSize="9.5" fontWeight="800" fill={HOLLOW.has(act) ? tone : P.paper}>
        {act}
      </text>
    </g>
  );
}

/** 单个机器人剧场：d = 触发点已越过分界线的像素数（0..SKIT） */
function RobotSkit({ trig, d, dx, candleX, chartY, t, compact, top = 0 }) {
  const popIn = Math.min(1, d / 12);
  const popOut = d > SKIT - 14 ? (SKIT - d) / 14 : 1;
  const alpha = popIn * Math.max(0, popOut);
  if (alpha <= 0) return null;
  const rx = dx + 20;
  const ry = top + 46 + trig.row * 78;
  const tone = d >= STG.code ? ACT_TONE[trig.act] : P.soft;
  const stage = d < STG.query ? 'query' : d < STG.think ? 'think' : d < STG.code ? 'code' : 'act';
  const bubble =
    stage === 'query'
      ? compact
        ? 'get_kline()'
        : trig.type === 'signal'
          ? "signal hit → get_kline('15m')"
          : "15m tick → get_kline('15m')"
      : stage === 'code'
        ? compact ? 'signal()' : 'run_code · signal()'
        : stage === 'act'
          ? ACT_TEXT[trig.act](trig, compact)
          : null;
  const fs = compact ? 11 : 12.5;
  const bw = bubble ? bubble.length * fs * 0.62 + 20 : 0;
  return (
    <g opacity={alpha} transform={`translate(0 ${(1 - popIn) * -10})`}>
      {/* 读取历史行情的引线（查询阶段，从机器人伸向它的 K 线） */}
      {stage === 'query' && (
        <path
          d={`M${rx} ${ry + 16} C ${rx - 26} ${ry + 46}, ${candleX + 18} ${chartY - 22}, ${candleX} ${chartY}`}
          fill="none" stroke={P.soft} strokeWidth="1.1" strokeDasharray="4 3" opacity="0.7"
        />
      )}
      {/* 天线 + 方头 + 双眼 */}
      <line x1={rx} y1={ry - 6} x2={rx} y2={ry - 12} stroke={tone} strokeWidth="1.5" />
      <circle cx={rx} cy={ry - 14} r="2.1" fill={tone} />
      <rect x={rx - 10} y={ry - 6} width="20" height="16" rx="4.5" fill={P.paper} stroke={tone} strokeWidth="1.7" />
      <circle cx={rx - 4.2} cy={ry + 2} r="1.7" fill={tone} />
      <circle cx={rx + 4.2} cy={ry + 2} r="1.7" fill={tone} />
      <text x={rx} y={ry + 26} textAnchor="middle" className="tkb-mono" fontSize={compact ? 9.5 : 10.5} fill={P.faint}>{trig.name}</text>
      {/* 思考三点 */}
      {stage === 'think' && [0, 1, 2].map((k) => (
        <circle key={k} cx={rx + 20 + k * 9} cy={ry - 2} r="2.2" fill={P.soft}
          opacity={0.2 + 0.8 * Math.abs(Math.sin((t * 2.6 + k * 0.5) * Math.PI))} />
      ))}
      {/* 工具/决策气泡 */}
      {bubble && (
        <g>
          <path d={`M${rx + 12} ${ry} l8 -5 v-3`} fill="none" stroke={tone} strokeWidth="1.1" opacity="0.7" />
          <rect x={rx + 20} y={ry - 20} width={bw} height={fs + 12} rx="5" fill={P.inner} stroke={tone} strokeWidth="1.3" />
          <text x={rx + 20 + bw / 2} y={ry - 20 + (fs + 12) / 2} textAnchor="middle" dominantBaseline="central" className="tkb-mono" fontSize={fs} fontWeight={stage === 'act' ? 700 : 500} fill={stage === 'act' ? tone : P.ink}>
            {bubble}
          </text>
        </g>
      )}
    </g>
  );
}

function useBandWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setW((prev) => (Math.abs(prev - width) < 1 ? prev : width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export default function TickerBand({ flip = false, masthead = false }) {
  const wrapRef = useRef(null);
  const { shouldAnimate } = useSectionFreeze(wrapRef);
  const [measureRef, w] = useBandWidth();
  // cur = 分界线所在的（浮点）K 线序号
  const [cur, setCur] = useState((TRIGGERS[flip ? 9 : 2]?.i ?? 40) + 14);
  const [t, setT] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [reduced, setReduced] = useState(false);
  const dragRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const running = shouldAnimate && !dragging && !reduced;
  useEffect(() => {
    if (!running) return undefined;
    let id;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setCur((c2) => (c2 + (SPEED / SPACING) * dt) % N);
      setT((v) => v + dt);
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [running]);

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    dragRef.current = { x: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const px = e.clientX - dragRef.current.x;
    dragRef.current.x = e.clientX;
    setCur((c2) => (((c2 - px / SPACING) % N) + N) % N);
  };
  const onPointerUp = (e) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  /* —— 版面 ——
     HEAD：带内顶部空白头区（px）。masthead 模式下磁带顶进 navbar 下方，
     这段空区只显示背景渐变，保证 navbar 不遮挡任何行情内容。 */
  const compact = w > 0 && w < 640;
  const HEAD = masthead ? (compact ? 84 : 96) : 0;
  const H = (compact ? BAND_H_SM : BAND_H) + HEAD;
  const lbl = compact ? 10.5 : 12;
  const dx = w * DIV_F;
  const volH = compact ? 34 : 46;
  const axisH = compact ? 16 : 20;
  const chartTop = HEAD + (compact ? 18 : 24);
  const chartBot = H - volH - axisH - 6;

  /* 可见窗口 */
  const i0 = Math.floor(cur - dx / SPACING) - 1;
  const i1 = Math.ceil(cur + (w - dx) / SPACING) + 1;
  const view = [];
  for (let i = i0; i <= i1; i += 1) view.push((((i % N) + N) % N));
  let lo = Infinity;
  let hi = -Infinity;
  let vMax = 0;
  for (const i of view) {
    lo = Math.min(lo, C[i].l);
    hi = Math.max(hi, C[i].h);
    vMax = Math.max(vMax, C[i].v);
  }
  const padP = (hi - lo) * 0.07 || 1;
  const py = (v) => chartTop + (1 - (v - (lo - padP)) / (hi - lo + padP * 2)) * (chartBot - chartTop);
  const nowC = C[Math.floor(((cur % N) + N) % N)];
  const gridLevels = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + (hi - lo) * f);

  /* 分界线左侧最近几条已完成的档案（episodes） */
  const journal = TRIGGERS
    .map((tr) => ({ tr, d: ((((cur - tr.i) % N) + N) % N) * SPACING }))
    .filter(({ d }) => d > SKIT && d < dx + 400)
    .sort((a, b) => a.d - b.d)
    .slice(0, compact ? 3 : 4);

  return (
    <div
      ref={wrapRef}
      className={`tkb${masthead ? ' tkb--masthead' : ''}${dragging ? ' is-scrubbing' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-hidden="true"
    >
      <div ref={measureRef}>
        {w > 0 ? (
          <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`}>
            {/* 价格网格 */}
            {gridLevels.map((v, gi) => (
              <g key={gi}>
                <line x1="0" y1={py(v)} x2={w} y2={py(v)} stroke={P.line} strokeWidth={gi % 2 ? 0.6 : 0.8} opacity={gi % 2 ? 0.35 : 0.55} />
                {gi % 2 === 0 && (
                  <text x={w - 8} y={py(v) - 5} textAnchor="end" className="tkb-mono" fontSize={lbl - 1.5} fill={P.faint}>{fmtK(v)}</text>
                )}
              </g>
            ))}

            {/* K 线 + 成交量 + 时间刻度 + 触发/决策标记 */}
            {view.map((i, k) => {
              const x = dx + (i0 + k - cur) * SPACING;
              if (x < -SPACING || x > w + SPACING) return null;
              const cd = C[i];
              const tone = cd.up ? P.green : P.red;
              const future = x > dx;
              const op = future ? 0.5 : Math.min(1, x / 30 + 0.12);
              const bodyTop = py(Math.max(cd.o, cd.c));
              const bodyH = Math.max(2, Math.abs(py(cd.o) - py(cd.c)));
              const trig = TRIG_BY_I.get(i);
              const trigD = trig ? ((((cur - i) % N) + N) % N) * SPACING : 0;
              const pinTrig = PINS.get(i);
              const pinD = pinTrig ? ((((cur - pinTrig.i) % N) + N) % N) * SPACING : 0;
              // key 用连续运行序号 i0+k：磁带滑动时节点复用而非整列重挂
              //（i 是取模后的数据索引，窗口可能超一圈，单用 i 会撞 key）
              return (
                <g key={i0 + k} opacity={op}>
                  <line x1={x} y1={py(cd.h)} x2={x} y2={py(cd.l)} stroke={tone} strokeWidth="1.5" opacity="0.95" />
                  <rect x={x - 3.6} y={bodyTop} width="7.2" height={bodyH} rx="1" fill={cd.up ? 'none' : tone} stroke={tone} strokeWidth="1.6" />
                  <rect x={x - 3.6} y={H - axisH - 3 - (cd.v / vMax) * volH} width="7.2" height={(cd.v / vMax) * volH} fill={tone} opacity="0.38" />
                  {cd.t % 10800 === 0 && (
                    <g>
                      <line x1={x} y1={chartBot + 4} x2={x} y2={chartBot + 9} stroke={P.faint} strokeWidth="1" />
                      <text x={x} y={H - 5} textAnchor="middle" className="tkb-mono" fontSize={lbl - 1.5} fill={P.faint}>{fmtT(cd.t)}</text>
                    </g>
                  )}
                  {/* 触发点（因）：signal 闪电 / timer 表盘，永久驻留。
                      未来区 = 暗（待触发），机器人处理中 = 亮，已触发 = 半暗 */}
                  {trig && (
                    <TrigIcon
                      type={trig.type} x={x} y={py(cd.h) - 28} candleTop={py(cd.h)}
                      tone={trigD > 0 && trigD < SKIT ? P.ink : future ? P.faint : P.soft}
                      alpha={trigD >= SKIT ? 0.55 : 1}
                    />
                  )}
                  {/* 决策钉（果）：钉的 K 线越过分界线的瞬间 = 机器人下单的
                      那一刻（触发相位恰为 STG.code），钉在分界线处自然落下 */}
                  {pinTrig && pinTrig.act !== 'H' && !future && (() => {
                    const drop = Math.min(1, pinD / 16);
                    const ease = 1 - (1 - drop) ** 3;
                    return (
                      <g transform={`translate(0 ${(1 - ease) * -18})`} opacity={Math.min(1, drop * 2)}>
                        <DropPin x={x} tipY={py(cd.h) - 4} act={pinTrig.act} />
                      </g>
                    );
                  })()}
                </g>
              );
            })}

            {/* 未来区半透明水洗 */}
            <rect x={dx} y="0" width={w - dx} height={H} fill={P.paper} opacity="0.42" />

            {/* NOW 分界线 + 现价牌 */}
            <line x1={dx} y1={HEAD + 2} x2={dx} y2={H - 2} stroke={P.ink} strokeWidth="1.6" />
            <path d={`M${dx - 6} ${HEAD + 2} h12 l-6 8 Z`} fill={P.ink} />
            <g>
              <rect x={dx - (compact ? 72 : 96)} y={chartBot - 26} width={compact ? 66 : 90} height={compact ? 19 : 22} rx="3" fill={P.inner} stroke={nowC.up ? P.green : P.red} strokeWidth="1.3" />
              <text x={dx - (compact ? 39 : 51)} y={chartBot - 26 + (compact ? 9.5 : 11)} textAnchor="middle" dominantBaseline="central" className="tkb-mono" fontSize={lbl} fontWeight="700" fill={nowC.up ? P.green : P.red}>
                {fmtP(nowC.c)}
              </text>
            </g>
            <text x={8} y={HEAD + 16} className="tkb-mono" fontSize={lbl - 1.5} letterSpacing="0.12em" fill={P.faint}>
              BTC/USDT · 15m · LIVE TAPE
            </text>

            {/* Episode 胶囊：B/S 开仓时出现，实时显示 PnL/杠杆，
                A/R/T 动作在下沿留刻痕，TP/SL 虚线台阶式更新，C 平仓即消散 */}
            {EPISODES.map((ep) => {
              const dOpen = cur - ep.openPin;
              const dClose = cur - ep.closePin;
              if (dOpen <= 0 || dClose > 1.6) return null;
              const closing = Math.max(0, Math.min(1, dClose / 1.6));
              const capH = compact ? 24 : 30;
              const capY = HEAD + 8;
              const openX = Math.max(10, dx + (ep.openPin - cur) * SPACING);
              const capW = Math.max(52, dx + 8 - openX);
              const ref = closing > 0 ? ep.exit : nowC.c;
              /* 真实系统口径：PnL% = pnl / margin × 100（名义仓位 = margin × LEV） */
              const pricePct = ((ref - ep.entry) / ep.entry) * ep.dir;
              const pnlAbs = pricePct * MARGIN * LEV;
              const pnlPct = pricePct * LEV * 100;
              const dirTone = ep.dir > 0 ? P.green : P.red;
              const pTone = pnlPct >= 0 ? P.green : P.red;
              /* 生效段 + 「抬线」动画：T 动作后 0.9 根内从旧位平滑抬到新位 */
              let sIdx = ep.segs.length - 1;
              while (sIdx > 0 && ep.segs[sIdx].fromPin > cur) sIdx -= 1;
              const seg = ep.segs[sIdx];
              const pSeg = ep.segs[Math.max(0, sIdx - 1)];
              const liftK = sIdx > 0 ? Math.min(1, Math.max(0, cur - seg.fromPin) / 0.9) : 1;
              const liftE = 1 - (1 - liftK) ** 3;
              const tpY = py(pSeg.tp) + (py(seg.tp) - py(pSeg.tp)) * liftE;
              const slY = py(pSeg.sl) + (py(seg.sl) - py(pSeg.sl)) * liftE;
              /* 「撤收」动画：收线时两端向命中点收拢；「击中」闪光在成交瞬间 */
              const hitX = Math.max(0, Math.min(w, ep.closeType === 'signal' ? dx : dx + (ep.closePin - cur) * SPACING));
              const shrink = closing ** 2;
              const lx0 = shrink * hitX;
              const lx1 = w - shrink * (w - hitX);
              const hitY = ep.closeType === 'TP' ? tpY : slY;
              const hitFlash = ep.closeType !== 'signal' && closing > 0 && closing < 0.7;
              const sign = (v, f = 2) => `${v >= 0 ? '+' : ''}${v.toFixed(f)}`;
              const durS = Math.max(0, (Math.min(cur, ep.closePin) - ep.openPin) * STEP);
              const durTxt = durS >= 86400
                ? `${Math.floor(durS / 86400)}d ${Math.floor((durS % 86400) / 3600)}h`
                : durS >= 3600
                  ? `${Math.floor(durS / 3600)}h ${Math.floor((durS % 3600) / 60)}m`
                  : `${Math.floor(durS / 60)}m`;
              const wide = capW > (compact ? 360 : 540);
              const mid = capW > 210;
              const badgeW = compact ? 44 : 52;
              return (
                <g key={ep.openPin} opacity={1 - closing}>
                  {/* OPEN / SL / TP 价位虚线：横跨整页；T 动作平滑抬线，
                      命中时闪光，收线时两端向命中点撤收 */}
                  <line x1={lx0} y1={py(ep.entry)} x2={lx1} y2={py(ep.entry)} stroke={P.blue} strokeWidth="1.2" strokeDasharray="7 5" opacity="0.65" />
                  <line x1={lx0} y1={tpY} x2={lx1} y2={tpY} stroke={P.green} strokeWidth={hitFlash && ep.closeType === 'TP' ? 2.6 : 1.5} strokeDasharray="7 5" opacity="0.85" />
                  <line x1={lx0} y1={slY} x2={lx1} y2={slY} stroke={P.red} strokeWidth={hitFlash && ep.closeType === 'SL' ? 2.6 : 1.5} strokeDasharray="7 5" opacity="0.85" />
                  {hitFlash && (
                    <g>
                      <circle cx={hitX} cy={hitY} r={4 + (closing / 0.7) * 16} fill="none" stroke={ep.closeType === 'TP' ? P.green : P.red} strokeWidth="2" opacity={1 - closing / 0.7} />
                      <circle cx={hitX} cy={hitY} r="3.2" fill={ep.closeType === 'TP' ? P.green : P.red} opacity={1 - closing / 0.7} />
                      <text x={hitX} y={hitY - 14} textAnchor="middle" className="tkb-mono" fontSize={lbl - 1} fontWeight="800" fill={ep.closeType === 'TP' ? P.green : P.red} opacity={1 - closing / 0.7}>
                        {ep.closeType} FILLED
                      </text>
                    </g>
                  )}
                  <text x={dx + 10} y={py(ep.entry) - 4} className="tkb-mono" fontSize={lbl - 2} fill={P.blue} opacity="0.95">OPEN {fmtK(ep.entry)}</text>
                  <text x={dx + 10} y={tpY - 4} className="tkb-mono" fontSize={lbl - 2} fontWeight="700" fill={P.green}>TP {fmtK(seg.tp)}</text>
                  <text x={dx + 10} y={slY + lbl} className="tkb-mono" fontSize={lbl - 2} fontWeight="700" fill={P.red}>SL {fmtK(seg.sl)}</text>
                  {/* 胶囊本体（对齐 OpenPositionSummary：方向徽章 + 杠杆/保证金 + PnL + 时长） */}
                  <rect x={openX} y={capY} width={capW} height={capH} rx={capH / 2} fill={P.inner} stroke={dirTone} strokeWidth="1.6" />
                  {capW > 110 && (
                    <g>
                      <rect x={openX + 5} y={capY + 4} width={badgeW} height={capH - 8} rx={(capH - 8) / 2} fill={dirTone} opacity="0.16" />
                      <text x={openX + 5 + badgeW / 2} y={capY + capH / 2 + 0.5} textAnchor="middle" dominantBaseline="central" className="tkb-mono" fontSize={compact ? 9.5 : 10.5} fontWeight="800" fill={dirTone}>
                        {ep.dir > 0 ? 'LONG' : 'SHORT'}
                      </text>
                    </g>
                  )}
                  <text x={capW > 110 ? openX + badgeW + 14 : openX + capW / 2} textAnchor={capW > 110 ? 'start' : 'middle'} y={capY + capH / 2 + 0.5} dominantBaseline="central" className="tkb-mono" fontSize={compact ? 10.5 : 12}>
                    {wide ? (
                      <>
                        <tspan fill={P.faint}>{LEV}× · M:${MARGIN.toLocaleString('en-US')} · PnL </tspan>
                        <tspan fill={pTone} fontWeight="700">{sign(pnlAbs)} ({sign(pnlPct)}%)</tspan>
                        <tspan fill={P.faint}> · {durTxt}</tspan>
                      </>
                    ) : mid ? (
                      <>
                        <tspan fill={pTone} fontWeight="700">{sign(pnlAbs)} ({sign(pnlPct)}%)</tspan>
                        <tspan fill={P.faint}> · {LEV}×</tspan>
                      </>
                    ) : (
                      <tspan fill={pTone} fontWeight="700">{sign(pnlPct, 1)}%</tspan>
                    )}
                  </text>
                  {/* 常驻盯盘智能体：持仓期间一直在胶囊里思考 */}
                  {capW > 165 && (() => {
                    const bx = openX + capW - capH * 0.72;
                    const by = capY + capH / 2;
                    return (
                      <g>
                        <line x1={bx} y1={by - 5} x2={bx} y2={by - 8.5} stroke={dirTone} strokeWidth="1.2" />
                        <circle cx={bx} cy={by - 10} r="1.5" fill={dirTone} />
                        <rect x={bx - 7} y={by - 5} width="14" height="11" rx="3" fill={P.paper} stroke={dirTone} strokeWidth="1.4" />
                        <circle cx={bx - 3} cy={by + 0.5} r="1.2" fill={dirTone} />
                        <circle cx={bx + 3} cy={by + 0.5} r="1.2" fill={dirTone} />
                        {[0, 1, 2].map((k2) => (
                          <circle key={k2} cx={bx - 6 + k2 * 6} cy={by - 14} r="1.5" fill={dirTone}
                            opacity={0.2 + 0.8 * Math.abs(Math.sin((t * 2.2 + k2 * 0.5) * Math.PI))} />
                        ))}
                      </g>
                    );
                  })()}
                  {ep.actions.filter((a) => a.pinI <= cur).map((a) => {
                    const axp = dx + (a.pinI - cur) * SPACING;
                    if (axp < openX + capH * 0.8) return null;
                    return (
                      <g key={a.pinI}>
                        <line x1={axp} y1={capY + capH} x2={axp} y2={capY + capH + 6} stroke={ACT_TONE[a.act]} strokeWidth="1.3" />
                        <text x={axp} y={capY + capH + 15} textAnchor="middle" className="tkb-mono" fontSize="8.5" fontWeight="700" fill={ACT_TONE[a.act]}>{a.act}</text>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* 机器人小剧场：分界线扫过触发点时派发，演完即消失 */}
            {TRIGGERS.map((tr) => {
              if (tr.auto || tr.i == null) return null; // 自动订单成交不派机器人
              const d = ((((cur - tr.i) % N) + N) % N) * SPACING;
              if (d <= 0 || d > SKIT) return null;
              return (
                <RobotSkit
                  key={tr.i} trig={tr} d={d} dx={dx}
                  candleX={dx - d} chartY={py(C[tr.i].h)}
                  t={t} compact={compact} top={HEAD}
                />
              );
            })}

            {/* episodes 档案（最近几条留档） */}
            {journal.length > 0 && (
              <g>
                <text x={8} y={HEAD + (compact ? 62 : 70)} className="tkb-mono" fontSize={lbl - 2} letterSpacing="0.1em" fill={P.faint}>EPISODES</text>
                {journal.map(({ tr }, k) => (
                  <text key={tr.i} x={8} y={HEAD + (compact ? 76 : 88) + k * (lbl + 5)} className="tkb-mono" fontSize={lbl - 1} fill={k === 0 ? P.soft : P.faint} opacity={1 - k * 0.22}>
                    {fmtT(C[tr.pinI].t)} {tr.name.startsWith('agent·') ? tr.name.slice(6) : tr.act === 'P' ? 'tp' : tr.act === 'L' ? 'sl' : 'x'} {tr.act} {tr.act === 'H' ? '—' : fmtK(px(tr))}
                  </text>
                ))}
              </g>
            )}
          </svg>
        ) : (
          <div style={{ height: H }} />
        )}
      </div>
    </div>
  );
}
