import { Link } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import { COPY } from '../config/i18n';
import usePageTheme from '../hooks/usePageTheme';
import Footer from '../components/Footer';
import { BLOG_POSTS } from './blog/registry';
import BlogCover from './blog/components/BlogCover';
import '../styles/pages/blog.css';
import '../styles/pages/blog-paper-theme.css';

/**
 * BlogCard — 单张文章卡片
 *
 * featured=true: 左图右文大卡片(封面完整露出,不再被文字 overlay 遮盖)
 * featured=false: 行式卡片(左小封面 + 右文字),文章少的阶段比网格更稳
 */
function BlogCard({ post, lang, readMore, featured = false }) {
  const localMeta = post.meta[lang];
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={`blog-card ${featured ? 'blog-card--featured' : 'blog-card--row'}`}
    >
      <BlogCover cover={post.meta.cover} art={post.Cover} featured={featured} />
      <div className="blog-card__body">
        <div className="blog-card__meta-row">
          <time className="blog-card__date">{post.meta.date}</time>
          <div className="blog-card__tags">
            {post.meta.tags.map(tag => (
              <span key={tag} className="blog-card__tag">{tag}</span>
            ))}
          </div>
        </div>
        <h2 className="blog-card__title">{localMeta.title}</h2>
        <p className="blog-card__excerpt">{localMeta.excerpt}</p>
        <span className="blog-card__cta">
          {readMore}
          <svg className="blog-card__arrow" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1 8h12M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

/**
 * BlogPage — 博客列表页
 *
 * 路由: /blog
 * 布局: featured 左图右文大卡片 + 行式列表（桌面） / 全部竖排（移动）
 * 封面: 文章自带 cover.jsx（视觉主角蚀刻图）优先，缺省回退丝绸 shader
 *
 * 文章数据来源: src/pages/blog/registry.js
 * 主题: 博客整体默认浅色纸面（'paper'，见 blog-paper-theme.css）
 */
export default function BlogPage() {
  usePageTheme('paper');
  const { lang } = useLanguage();
  const copy = COPY.blog[lang];

  const [lead, ...rest] = BLOG_POSTS;

  return (
    <main className="blog-page">
      <div className="blog-page__inner">
        <header className="blog-page__header">
          <h1 className="blog-page__title">{copy.title}</h1>
          <p className="blog-page__subtitle">{copy.subtitle}</p>
        </header>

        <BlogCard post={lead} lang={lang} readMore={copy.readMore} featured />

        {rest.length > 0 && (
          <div className="blog-list">
            {rest.map(post => (
              <BlogCard key={post.slug} post={post} lang={lang} readMore={copy.readMore} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
