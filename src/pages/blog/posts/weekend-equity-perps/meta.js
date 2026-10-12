/**
 * 休市之后，价格住在哪里 —— 文章元数据
 *
 * 文件位置: src/pages/blog/posts/weekend-equity-perps/meta.js
 */
const meta = {
  /** URL slug，必须与文件夹名一致 */
  slug: 'weekend-equity-perps',

  /** 发布日期（ISO 格式） */
  date: '2026-08-21',

  /** 分类标签（列表页 pill 展示） */
  tags: ['Market Microstructure', 'Perpetuals', 'Exchanges'],

  /**
   * 列表页封面 shader 配色（本文提供了 cover.jsx 动态封面，此处为回退值）。
   */
  cover: {
    bgInner: '#0e1a1c',
    bgOuter: '#04080a',
    glow: '#3fa89a',
    layers: ['#2c7d75', '#63b8ad', '#dcefe9'],
    flowSpeed: 0.36,
    sheenIntensity: 0.98,
  },

  /** 英文元数据 */
  en: {
    title: 'Where Does Price Live After the Close?',
    excerpt:
      'There are 168 hours in a week and the US equity market is open for thirty-two and a half. Four exchanges give four different answers about what Tesla is worth in the other 135. A walk from the mark-price formula down to weekend microstructure: whose mechanism lets price move, whose movement has an anchor, and why a lagging risk price is a free option given away.',
    heroQuote: 'Mark-price transmission and weekend microstructure in equity perpetuals.',
  },

  /** 中文元数据 */
  zh: {
    title: '休市之后，价格住在哪里',
    excerpt:
      '一周 168 小时，美股只开 32 个半。剩下的 135 小时里特斯拉值多少钱，四家交易所给了四个答案。从 mark price 公式一路拆到周末微观结构：谁的机制允许价格移动，谁的移动有锚，以及滞后的风险价为什么等于一张免费送出的期权。',
    heroQuote: '股票永续的 mark price 传导与周末微观结构。',
  },
};

export default meta;
