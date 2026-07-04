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
import projectOmegaMeta from './posts/project-omega-manifesto/meta';
import timeManager2Meta from './posts/time-manager-part-2/meta';

// Component 使用 lazy() 按需加载 —— time-manager-part-2 依赖 mermaid（体积巨大），
// 静态导入会把它打进 /blog 列表页共享的 chunk，导致所有文章都要下载 mermaid。
const ProjectSigmaArticle = lazy(() => import('./posts/project-sigma-manifesto/index'));
const ProjectOmegaArticle = lazy(() => import('./posts/project-omega-manifesto/index'));
const TimeManager2Article = lazy(() => import('./posts/time-manager-part-2/index'));

/**
 * 文章注册表
 * 
 * 顺序 = 列表页显示顺序（新文章放最前面）
 * 每个条目包含：
 *   - slug: URL 路径标识（必须与文件夹名一致）
 *   - meta: 文章元数据对象
 *   - Component: 文章内容 React 组件
 */
export const BLOG_POSTS = [
  {
    slug: 'time-manager-part-2',
    meta: timeManager2Meta,
    Component: TimeManager2Article,
  },
  {
    slug: 'project-omega-manifesto',
    meta: projectOmegaMeta,
    Component: ProjectOmegaArticle,
  },
  {
    slug: 'project-sigma-manifesto',
    meta: projectSigmaMeta,
    Component: ProjectSigmaArticle,
  },
];
