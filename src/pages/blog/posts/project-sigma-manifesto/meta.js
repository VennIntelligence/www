/**
 * Project Σ 文章元数据
 * 
 * 文件位置: src/pages/blog/posts/project-sigma-manifesto/meta.js
 * 功能: 提供文章的双语标题、摘要、引用语等结构化信息
 *       用于博客列表页展示，与渲染组件解耦
 * 状态: 白皮书公开草案站位 —— 架构/代币/团队章节融资后再公开
 */
const meta = {
  /** URL slug，必须与文件夹名一致 */
  slug: 'project-sigma-manifesto',

  /** 发布日期（ISO 格式） */
  date: '2026-09-07',

  /** 分类标签（列表页 pill 展示） */
  tags: ['Whitepaper', 'Protocol'],

  /**
   * 列表卡片回退丝绸 shader 配色（本文已注册静态封面 cover.jsx，此处仅作回退，取浅色纸面）。
   */
  cover: {
    bgInner: '#f6f5f1',
    bgOuter: '#e9e7e0',
    glow: '#c9d6dc',
    layers: ['#d8dcd9', '#e6e8e4', '#f6f5f1'],
    flowSpeed: 0.2,
    sheenIntensity: 0.6,
  },

  /** 英文元数据 */
  en: {
    title: 'Project Σ Whitepaper: Public Draft v0.1',
    excerpt: 'A protocol for the exchange of human intelligence. This public draft states the problem, the design principles and phase zero. Architecture, scoring, token model and team are withheld until the private round closes.',
    heroQuote: '"The internet gave humanity connection, but never gave humanity evolution. We\'re changing that."',
  },

  /** 中文元数据 */
  zh: {
    title: 'Project Σ 白皮书：公开草案 v0.1',
    excerpt: '一个人类智慧交换协议。本公开草案只陈述问题、设计原则和第零阶段；协议架构、评分函数、代币模型与团队信息在私募轮结束前暂不公开。',
    heroQuote: '"互联网给了人类连接，却没有给人类进化。我们要改变这一点。"',
  },
};

export default meta;
