// src/pages/blog/posts/time-manager-part-2/meta.js
const meta = {
  slug: 'time-manager-part-2',
  date: '2026-04-11',
  tags: ['Architecture', 'Trading', 'Engineering'],
  cover: {
    bg: 'linear-gradient(135deg, #0a1128 0%, #1c3b5a 40%, #0d1b2a 100%)',
    accent: 'rgba(56, 189, 248, 0.25)',
    glow: 'rgba(56, 189, 248, 0.12)',
  },
  en: {
    title: 'How to Design a Quantitative Trading Time Manager? (Part 2)',
    excerpt: 'When backtest time meets the real world: The dual-mode evolution of the TimeManager in quantitative trading systems.',
    heroQuote: '"A perfect time manager meets an imperfect reality. Here is how we fixed the space-time rift when virtual backtesting met live LLM calls."',
  },
  zh: {
    title: '如何设计一个量化交易时间管理器? （二）',
    excerpt: '当回测时间遇上真实世界，量化交易 TimeManager 的双模式进化。',
    heroQuote: '"完美的时间管理器遇上了不完美的现实，虚拟时间与真实流逝之间撕开了一道时空裂缝，我们最终选择走向 Coalesce-to-Latest 混合引擎。"',
  },
};
export default meta;
