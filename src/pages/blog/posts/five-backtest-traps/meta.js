/**
 * 五种回测陷阱 文章元数据
 *
 * 文件位置: src/pages/blog/posts/five-backtest-traps/meta.js
 */
const meta = {
  /** URL slug，必须与文件夹名一致 */
  slug: 'five-backtest-traps',

  /** 发布日期（ISO 格式） */
  date: '2026-09-07',

  /** 分类标签（列表页 pill 展示） */
  tags: ['Backtesting', 'Quant Research', 'Epistemology'],

  /**
   * 列表页封面 shader 配色（本文提供了 cover.jsx 动态封面，此处为回退值）。
   */
  cover: {
    bgInner: '#101822',
    bgOuter: '#04070b',
    glow: '#3f7fa8',
    layers: ['#2f6a8c', '#6ea8c8', '#dfe9ef'],
    flowSpeed: 0.34,
    sheenIntensity: 0.96,
  },

  /** 英文元数据 */
  en: {
    title: 'Five Backtest Traps: From Trading to Life',
    excerpt:
      'It is hard not to backtest your own life. From data leakage and time-travelling fills to repainting indicators, from the researcher who overfits to the variance wall, expiring parameters and a question that has quietly changed — five errors that recur in production research, and the same five shapes they take in a life.',
    heroQuote:
      '"Historians deserve respect. But at the moment you place the bet, what you face is never history — it is a world that has not happened yet, and is under no obligation to repeat the past."',
  },

  /** 中文元数据 */
  zh: {
    title: '五种回测陷阱：从交易到人生',
    excerpt:
      '人很难不回测自己的人生。从数据泄漏、成交回溯到指标回画，从研究者过拟合到方差墙、参数过期与结构换题——五种在真实生产研究里反复出现的回测错误，以及它们在人生里的同一形状。',
    heroQuote:
      '"历史学家值得尊敬。但下注的那一刻，你面对的从来不是历史，而是一个还没有发生、也没有义务重复过去的世界。"',
  },
};

export default meta;
