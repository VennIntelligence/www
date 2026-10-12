/**
 * 博客文章注册表
 * 
 * 每篇文章对应 src/pages/blog/posts/<slug>/ 文件夹
 * 文件夹结构：
 *   - meta.js    元数据（标题、日期、摘要等）
 *   - index.jsx  文章内容组件（可包含动画、交互效果等）
 *
 * 新增文章时只需：
 *   1. 在 posts/ 下新建子文件夹
 *   2. 编写 meta.js + index.jsx
 *   3. 在本文件导入并注册
 */

import { lazy } from 'react';
import projectSigmaMeta from './posts/project-sigma-manifesto/meta';
import weekendPerpsMeta from './posts/weekend-equity-perps/meta';
import backtestTrapsMeta from './posts/five-backtest-traps/meta';
import timeManager2Meta from './posts/time-manager-part-2/meta';
import ProjectSigmaCover from './posts/project-sigma-manifesto/cover';
import WeekendPerpsCover from './posts/weekend-equity-perps/cover';
import BacktestTrapsCover from './posts/five-backtest-traps/cover';
import TimeManager2Cover from './posts/time-manager-part-2/cover';

// Component 使用 lazy() 按需加载 —— 长文（如 time-manager-part-2 的交互模拟引擎）
// 静态导入会打进 /blog 列表页共享的 chunk，拖慢所有文章的首屏。
const ProjectSigmaArticle = lazy(() => import('./posts/project-sigma-manifesto/index'));
const WeekendPerpsArticle = lazy(() => import('./posts/weekend-equity-perps/index'));
const BacktestTrapsArticle = lazy(() => import('./posts/five-backtest-traps/index'));
const TimeManager2Article = lazy(() => import('./posts/time-manager-part-2/index'));

/**
 * 文章注册表
 * 
 * 顺序 = 列表页显示顺序（新文章放最前面）
 * 每个条目包含：
 *   - slug: URL 路径标识（必须与文件夹名一致）
 *   - meta: 文章元数据对象
 *   - Component: 文章内容 React 组件
 *   - Cover: 可选。文章专属动态封面组件（posts/<slug>/cover.jsx，SVG +
 *            useCoverLoop 主时钟，视口外自动冻结）。
 *            不提供时列表页回退到默认丝绸 shader（配色取 meta.cover）。
 */
export const BLOG_POSTS = [
  {
    slug: 'time-manager-part-2',
    meta: timeManager2Meta,
    Component: TimeManager2Article,
    Cover: TimeManager2Cover,
  },
  {
    slug: 'weekend-equity-perps',
    meta: weekendPerpsMeta,
    Component: WeekendPerpsArticle,
    Cover: WeekendPerpsCover,
  },
  {
    slug: 'five-backtest-traps',
    meta: backtestTrapsMeta,
    Component: BacktestTrapsArticle,
    Cover: BacktestTrapsCover,
  },
  {
    slug: 'project-sigma-manifesto',
    meta: projectSigmaMeta,
    Component: ProjectSigmaArticle,
    Cover: ProjectSigmaCover,
  },
];
