import { Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import usePageTheme from '../hooks/usePageTheme';
import { COPY } from '../config/i18n';
import Footer from '../components/Footer';
import TickerBand from '../components/TickerBand';
import ArticleSchema from '../components/seo/ArticleSchema';
import { BLOG_POSTS } from './blog/registry';
import NotFound from './NotFound';
import '../styles/pages/blog.css';
import '../styles/pages/blog-paper-theme.css';

/**
 * BlogArticlePage — 博客文章独立路由页面
 *
 * 路由: /blog/:slug
 * 每篇文章拥有独立 URL，例如: /blog/project-sigma-manifesto
 *
 * 通过 URL 参数 slug 从注册表查找对应文章，
 * 渲染其 React 组件（可包含动画、交互、视频等任意效果）。
 * 找不到 slug 时显示 404。
 */
export default function BlogArticlePage() {
  const { slug } = useParams();
  const { lang } = useLanguage();
  const copy = COPY.blog[lang];

  const post = BLOG_POSTS.find(p => p.slug === slug);

  // meta.theme 声明的文章把整站切到该主题（如白皮书的 'paper' 浅色），离开时自动恢复
  // 博客默认浅色纸面；文章 meta.theme 可覆盖（未定义主题名 = 全站暗色）
  usePageTheme(post ? post.meta.theme ?? 'paper' : undefined);

  if (!post) return <NotFound />;

  const localMeta = post.meta[lang];
  const ArticleComponent = post.Component;

  return (
    <main className="blog-page">
      <div className="blog-page__inner">
        <article className="blog-detail">
          <ArticleSchema
            slug={post.slug}
            date={post.meta.date}
            title={localMeta.title}
            excerpt={localMeta.excerpt}
            tags={post.meta.tags}
          />
          {/* 主题行情作战带：meta.tickerBand 声明的文章在大标题上方展示，
              masthead 模式顶进 navbar 下方、带内自留渐变头区 */}
          {post.meta.tickerBand && <TickerBand masthead />}

          <Link to="/blog" className="blog-detail__back">
            {copy.backToList}
          </Link>

          <header className="blog-detail__header">
            <h1 className="blog-detail__title">{localMeta.title}</h1>
            <time className="blog-detail__date">{post.meta.date}</time>
            <p className="blog-detail__hero-quote">{localMeta.heroQuote}</p>
          </header>

          <div className="blog-detail__body">
            <Suspense fallback={null}>
              <ArticleComponent />
            </Suspense>
          </div>
        </article>
      </div>
      <Footer />
    </main>
  );
}

