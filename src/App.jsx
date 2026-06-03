import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Navbar from './components/Navbar';
import ScrollToTop from './components/common/ScrollToTop';
import NotFound from './pages/NotFound';
import { LanguageProvider } from './context/LanguageContext';
import { syncGlassCompatibility } from './utils/glassCompatibility';
import { useDocumentMeta } from './hooks/useDocumentMeta';
import './index.css';

// ── Code-split 重型页面 ──
// HomePage 依赖 Three.js + framer-motion（~650KB parsed），
// 通过 lazy() 确保 /blog 等路由零加载这些库，节省 ~150-200MB 内存。
const HomePage = lazy(() => import('./pages/HomePage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogArticlePage = lazy(() => import('./pages/BlogArticlePage'));

// GPU 调参面板：仅在 dev:gpu 模式下加载（生产构建完全排除）
const GPUDebugPanel = import.meta.env.VITE_GPU_DEBUG === 'true'
  ? lazy(() => import('./components/GPUDebugPanel'))
  : null;

/**
 * DocumentMetaUpdater — 动态 SEO meta 标签同步
 * 必须在 BrowserRouter + LanguageProvider 内部渲染，
 * 因为依赖 useLocation 和 useLanguage。
 */
function DocumentMetaUpdater() {
  useDocumentMeta();
  return null;
}

/**
 * App — 纯路由根组件
 * Navbar 在路由外层，所有页面共享
 */
function App() {
  useEffect(() => {
    const updateGlassCompatibility = () => {
      syncGlassCompatibility();
    };

    updateGlassCompatibility();
    window.addEventListener('resize', updateGlassCompatibility, { passive: true });
    window.addEventListener('orientationchange', updateGlassCompatibility, { passive: true });

    return () => {
      window.removeEventListener('resize', updateGlassCompatibility);
      window.removeEventListener('orientationchange', updateGlassCompatibility);
    };
  }, []);

  return (
    <LanguageProvider>
      <BrowserRouter>
        <DocumentMetaUpdater />
        <ScrollToTop />
        <Navbar />
        <Routes>
          {/* Landing Page — lazy loaded，Three.js + framer-motion 仅此路由加载 */}
          <Route path="/" element={
            <Suspense fallback={null}>
              <HomePage />
            </Suspense>
          } />

          {/* 博客列表页 — 轻量页面，独立 chunk */}
          <Route path="/blog" element={
            <Suspense fallback={null}>
              <BlogPage />
            </Suspense>
          } />

          {/* 博客文章详情页 — 每篇文章独立 URL */}
          <Route path="/blog/:slug" element={
            <Suspense fallback={null}>
              <BlogArticlePage />
            </Suspense>
          } />

          {/* Product 子路由 — 后续添加 */}
          {/* <Route path="/product/venn-trigger-trade" element={<ProductPage />} /> */}
          {/* <Route path="/product/venn-trigger-trade/dashboard" element={<TriggerDashboard />} /> */}

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* GPU 调参面板 — dev:gpu 模式专用 */}
        {GPUDebugPanel && (
          <Suspense fallback={null}>
            <GPUDebugPanel />
          </Suspense>
        )}
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;

