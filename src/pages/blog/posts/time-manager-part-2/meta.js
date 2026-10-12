// src/pages/blog/posts/time-manager-part-2/meta.js
const meta = {
  slug: 'time-manager-part-2',
  date: '2026-07-04',
  tags: ['Architecture', 'Trading', 'AI Agents'],
  /* 在大标题上方渲染全站公共「行情作战带」（components/TickerBand.jsx） */
  tickerBand: true,
  /* 回退丝绸封面配色（本文自带 cover.jsx，正常不会用到）：亮色纸面 + 虚拟时间蓝 */
  cover: {
    bgInner: '#ffffff',
    bgOuter: '#efeee8',
    glow: '#dbe5f5',
    layers: ['#1f4e9c', '#5d7fbf', '#a3b8d6'],
    flowSpeed: 0.3,
    sheenIntensity: 0.6,
  },
  en: {
    title: 'A Backtest Clock for Agents',
    excerpt:
      'Backtest engines assume a strategy decides in zero time. Put an LLM agent inside and the clock freezes for three real minutes. This report describes the hybrid clock we built to let virtual time flow behind the barrier and reconcile once with the present.',
    heroQuote:
      'When a strategy needs three real minutes to think, what should virtual time do? Neither freeze nor pretend.',
  },
  zh: {
    title: 'Agent 时代的回测时钟',
    excerpt:
      '回测引擎假设策略在零时间内决策。把一个 LLM agent 放进去，时钟就会冻结整整三分钟。本文记录我们为此重造的混合时钟：让虚拟时间在 barrier 之后流动，然后对当下对一次账。',
    heroQuote:
      '当策略需要三分钟真实时间来思考，虚拟时间该怎么办？既不能冻结，也不能假装。',
  },
};
export default meta;
