import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import ScrollToTop from './components/common/ScrollToTop';
import HomePage from './pages/HomePage';
import BlogPage from './pages/BlogPage';
import BlogArticlePage from './pages/BlogArticlePage';
import NotFound from './pages/NotFound';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

// GPU 调参面板：仅在 dev:gpu 模式下加载（生产构建完全排除）
const GPUDebugPanel = import.meta.env.VITE_GPU_DEBUG === 'true'
  ? lazy(() => import('./components/GPUDebugPanel'))
  : null;

/**
 * App — 纯路由根组件
 * Navbar 在路由外层，所有页面共享
 */
function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Navbar />
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<HomePage />} />

          {/* 博客列表页 */}
          <Route path="/blog" element={<BlogPage />} />

          {/* 博客文章详情页 — 每篇文章独立 URL */}
          <Route path="/blog/:slug" element={<BlogArticlePage />} />

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
