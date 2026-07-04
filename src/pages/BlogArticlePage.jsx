import { Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import { COPY } from '../config/i18n';
import Footer from '../components/Footer';
import ArticleSchema from '../components/seo/ArticleSchema';
import { BLOG_POSTS } from './blog/registry';
import NotFound from './NotFound';
import '../styles/pages/blog.css';

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
          <Link to="/blog" className="blog-detail__back">
            {copy.backToList}
          </Link>

          <header className="blog-detail__header">
            <time className="blog-detail__date">{post.meta.date}</time>
            <h1 className="blog-detail__title">{localMeta.title}</h1>
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

